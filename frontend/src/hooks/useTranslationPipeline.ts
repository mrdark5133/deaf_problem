/**
 * useTranslationPipeline — connects TextSource → Chunker → API → SignPlayer.
 *
 * Responsibilities:
 *  - Creates a Chunker subscribed to the globalTextSource.
 *  - For each chunk: fires translateText() with seq + timeout.
 *  - Ordering guard: drops stale / out-of-order responses.
 *  - Resolves GlossTokens to ClipQueueItems and enqueues to the sign player.
 *  - Backpressure: auto-adjusts player speed when lag > 4 s.
 *  - Latency: records per-request p50 / p95.
 *  - Auto-recovery: polls /health every 5 s when backend is unreachable.
 *  - Exposes debug metrics for the DebugOverlay.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { globalTextSource } from '../speech/TextSource';
import { Chunker } from '../lib/chunker';
import { translateText, checkHealth } from '../lib/api';
import {
  TranslationOrdering,
  LatencyTracker,
  expandTokensToQueue,
  estimateLagMs,
  recommendedSpeed,
} from '../lib/translationOrdering';
import { signLibraryLoader } from '../player/libraryLoader';
import type { SignClip } from '../lib/clipTypes';
import type { GlossToken, TranslateResponse } from '../lib/types';
import type { ClipQueueItem } from '../player/SignPlayer';
import type { DebugMetrics } from '../ui/DebugOverlay';

const HEALTH_POLL_MS = 5000;

export interface UseTranslationPipelineOptions {
  onTokensReceived?: (tokens: GlossToken[], isQuestion: boolean, questionType?: string | null) => void;
  onTokenStart?: (gloss: string, tokenIndex: number) => void;
  onTokenEnd?: (gloss: string, tokenIndex: number) => void;
  onIdle?: () => void;
  onError?: (msg: string) => void;
}

export interface UseTranslationPipelineReturn {
  enqueueToPlayer: (items: ClipQueueItem[], timestamp?: number) => void;
  playerCallbacks: {
    onTokenStart?: (g: string, i: number) => void;
    onTokenEnd?: (g: string, i: number) => void;
    onIdle?: () => void;
  };
  activeTokenIndex: number;
  activeTokenGloss: string | null;
  currentTokens: GlossToken[];
  isQuestion: boolean;
  questionType: string | null;
  debugMetrics: DebugMetrics;
  backendReachable: boolean;
  lastError: string | null;
  /** Call with player state to let the pipeline adjust speed. */
  updatePlayerState: (opts: {
    status: string;
    fps: number;
    speed: number;
    queueItems: ClipQueueItem[];
    currentGloss: string | null;
    setSpeed: (s: number) => void;
    enqueue: (items: ClipQueueItem[], ts?: number) => void;
  }) => void;
}

export function useTranslationPipeline(
  options: UseTranslationPipelineOptions = {}
): UseTranslationPipelineReturn {
  const opts = useRef(options);
  opts.current = options;

  // Core pipeline singletons
  const ordering = useRef(new TranslationOrdering());
  const latency = useRef(new LatencyTracker());
  const pendingReqs = useRef(0);
  const pendingAborts = useRef<Map<number, AbortController>>(new Map());

  // Resolved clip cache (built lazily from library loader)
  const clipMap = useRef<Map<string, SignClip>>(new Map());

  // State
  const [activeTokenIndex, setActiveTokenIndex] = useState(-1);
  const [activeTokenGloss, setActiveTokenGloss] = useState<string | null>(null);
  const [currentTokens, setCurrentTokens] = useState<GlossToken[]>([]);
  const [isQuestion, setIsQuestion] = useState(false);
  const [questionType, setQuestionType] = useState<string | null>(null);
  const [backendReachable, setBackendReachable] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  // Debug snapshot state
  const [debugMetrics, setDebugMetrics] = useState<DebugMetrics>({
    fps: 0,
    playerStatus: 'idle',
    currentGloss: null,
    queueLength: 0,
    lagMs: 0,
    playerSpeed: 1.0,
    lastSeq: 0,
    pendingRequests: 0,
    latencyP50Ms: 0,
    latencyP95Ms: 0,
    latencySamples: 0,
    backendReachable: true,
    lastError: null,
  });

  // Enqueue ref — filled in by parent via updatePlayerState
  const enqueueRef = useRef<((items: ClipQueueItem[], ts?: number) => void) | null>(null);
  const setSpeedRef = useRef<((s: number) => void) | null>(null);



  const onTokenStart = useCallback((gloss: string, tokenIndex: number) => {
    setActiveTokenIndex(tokenIndex);
    setActiveTokenGloss(gloss);

    // Record latency when first token starts playing
    // sentAt is stored per seq; we look it up by tokenIndex mapping
    opts.current.onTokenStart?.(gloss, tokenIndex);
  }, []);

  const onTokenEnd = useCallback((gloss: string, tokenIndex: number) => {
    opts.current.onTokenEnd?.(gloss, tokenIndex);
  }, []);

  const onIdle = useCallback(() => {
    setActiveTokenIndex(-1);
    setActiveTokenGloss(null);
    opts.current.onIdle?.();
  }, []);

  // ── Clip resolution ───────────────────────────────────────────────────────

  const resolveClips = useCallback(async (ids: string[]): Promise<void> => {
    const toFetch = ids.filter((id) => !clipMap.current.has(id));
    if (toFetch.length === 0) return;
    await signLibraryLoader.preloadClips(toFetch);
    for (const id of toFetch) {
      const clip = await signLibraryLoader.getClip(id);
      if (clip) clipMap.current.set(id, clip);
    }
  }, []);

  // ── Translation handler ───────────────────────────────────────────────────

  const handleChunk = useCallback(
    async (text: string, seq: number, sentAt: number) => {
      // Cancel any previous in-flight request for this session (optional aggressive cancel)
      // We keep requests in flight and use the ordering guard to drop stale ones.
      const ac = new AbortController();
      pendingAborts.current.set(seq, ac);
      pendingReqs.current++;

      let response: TranslateResponse | null = null;
      try {
        response = await translateText({ text, seq, is_final: true }, ac.signal);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Translation error';
        setLastError(msg);
        opts.current.onError?.(msg);
        setBackendReachable(false);
        return;
      } finally {
        pendingReqs.current = Math.max(0, pendingReqs.current - 1);
        pendingAborts.current.delete(seq);
      }

      setBackendReachable(true);
      setLastError(null);

      // Ordering guard
      if (!ordering.current.accept(response.seq ?? seq)) return;

      // Update token display
      setCurrentTokens(response.tokens);
      setIsQuestion(response.is_question);
      setQuestionType(response.question_type ?? null);

      // Notify parent
      opts.current.onTokensReceived?.(response.tokens, response.is_question, response.question_type);

      // Resolve clips and build queue
      const clipIds = response.tokens.flatMap((t) =>
        t.kind === 'fingerspell' && t.letters
          ? t.letters.map((l) => `fs_${l.toLowerCase()}`)
          : [t.gloss.toLowerCase().replace(/[^a-z0-9-]/g, '-')]
      );
      await resolveClips(clipIds);

      const queueItems = expandTokensToQueue(response.tokens, clipMap.current);
      if (queueItems.length === 0) return;

      // Record latency at first token start
      const firstPlayedAt = performance.now();
      latency.current.record(seq, sentAt, firstPlayedAt);

      // Enqueue to player
      if (enqueueRef.current) {
        enqueueRef.current(queueItems);
      }
    },
    [resolveClips]
  );

  // ── Chunker → TextSource subscription ────────────────────────────────────

  useEffect(() => {
    const chunker = new Chunker((chunk) => {
      void handleChunk(chunk.text, chunk.seq, chunk.sentAt);
    });

    const unsub = globalTextSource.subscribe((evt) => {
      chunker.feed(evt);
    });

    return () => {
      unsub();
      chunker.reset();
    };
  }, [handleChunk]);

  // ── Health polling when backend unreachable ────────────────────────────────

  useEffect(() => {
    if (backendReachable) return;
    const id = setInterval(async () => {
      try {
        await checkHealth();
        setBackendReachable(true);
        setLastError(null);
      } catch {
        // still down
      }
    }, HEALTH_POLL_MS);
    return () => clearInterval(id);
  }, [backendReachable]);

  // ── updatePlayerState — called from parent when player state changes ────────

  // Ref holding last-seen debug metric values so we can skip setDebugMetrics
  // when nothing changed (avoids the render→effect→setState→render loop).
  const lastDebugRef = useRef<string>('');

  const updatePlayerState = useCallback(
    (opts_: {
      status: string;
      fps: number;
      speed: number;
      queueItems: ClipQueueItem[];
      currentGloss: string | null;
      setSpeed: (s: number) => void;
      enqueue: (items: ClipQueueItem[], ts?: number) => void;
    }) => {
      enqueueRef.current = opts_.enqueue;
      setSpeedRef.current = opts_.setSpeed;

      const lagMs = estimateLagMs(opts_.queueItems, opts_.speed);
      const newSpeed = recommendedSpeed(lagMs, opts_.speed);
      if (Math.abs(newSpeed - opts_.speed) > 0.01) {
        opts_.setSpeed(newSpeed);
      }

      // Only update debug metrics when values actually differ to avoid
      // triggering unnecessary re-renders.
      const nextMetrics = {
        fps: opts_.fps,
        playerStatus: opts_.status,
        currentGloss: opts_.currentGloss,
        queueLength: opts_.queueItems.length,
        lagMs,
        playerSpeed: opts_.speed,
        lastSeq: ordering.current.lastSeq,
        pendingRequests: pendingReqs.current,
        latencyP50Ms: latency.current.p50,
        latencyP95Ms: latency.current.p95,
        latencySamples: latency.current.count,
        backendReachable,
        lastError,
      };
      const key = JSON.stringify(nextMetrics);
      if (key !== lastDebugRef.current) {
        lastDebugRef.current = key;
        setDebugMetrics(nextMetrics);
      }
    },
    [backendReachable, lastError]
  );

  // ── Exposed player callbacks ──────────────────────────────────────────────

  const playerCallbacks = { onTokenStart, onTokenEnd, onIdle };

  return {
    enqueueToPlayer: (items, ts) => enqueueRef.current?.(items, ts),
    playerCallbacks,
    activeTokenIndex,
    activeTokenGloss,
    currentTokens,
    isQuestion,
    questionType,
    debugMetrics,
    backendReachable,
    lastError,
    updatePlayerState,
  };
}
