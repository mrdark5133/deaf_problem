/**
 * PlayerTestPage — Phase 4 dev page for testing the SkeletonAvatar + SignPlayer.
 *
 * Plays a hardcoded demo sequence: WHERE DOCTOR + fingerspelled SIGN
 * Loads clips via signLibraryLoader (falls back gracefully when offline).
 * Shows speed slider, queue controls, fps badge, token highlight strip,
 * and SYNTHETIC badge (visible in dev mode).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  StopCircle,
  Gauge,
  ChevronRight,
  Sparkles,
  FlaskConical,
} from 'lucide-react';
import { AvatarContainer } from '../avatar/AvatarContainer';
import { useSignPlayer } from './useSignPlayer';
import { signLibraryLoader } from './libraryLoader';
import type { ClipQueueItem } from './SignPlayer';
import type { SignClip } from '../lib/clipTypes';

// ─── Demo Sequence Definition ─────────────────────────────────────────────────

interface DemoToken {
  gloss: string;
  kind: 'sign' | 'fingerspell';
  /** For fingerspell: individual letters; for sign: single gloss id. */
  ids: string[];
}

const DEMO_TOKENS: DemoToken[] = [
  { gloss: 'WHERE', kind: 'sign', ids: ['where'] },
  { gloss: 'DOCTOR', kind: 'sign', ids: ['doctor'] },
  { gloss: 'SIGN', kind: 'fingerspell', ids: ['fs_s', 'fs_i', 'fs_g', 'fs_n'] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildQueueItems(
  tokens: DemoToken[],
  clipMap: Record<string, SignClip>
): ClipQueueItem[] {
  const items: ClipQueueItem[] = [];
  tokens.forEach((token, tokenIndex) => {
    const loaded = token.ids.filter((id) => !!clipMap[id]);
    loaded.forEach((id, i) => {
      items.push({
        clipId: id,
        clip: clipMap[id],
        tokenIndex,
        gloss: token.kind === 'sign' ? token.gloss : `FS:${id.replace('fs_', '').toUpperCase()}`,
        isTokenStart: i === 0,
        isTokenEnd: i === loaded.length - 1,
      });
    });
  });
  return items;
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface PlayerTestPageProps {
  onBack?: () => void;
}

export const PlayerTestPage: React.FC<PlayerTestPageProps> = ({ onBack }) => {
  const [clipMap, setClipMap] = useState<Record<string, SignClip>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTokenIdx, setActiveTokenIdx] = useState<number>(-1);
  const [log, setLog] = useState<string[]>([]);
  const [isSynthetic, setIsSynthetic] = useState(true); // all demo clips are synthetic

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 20));
  }, []);

  const { frame, status, fps, speed, enqueue, play, pause, clear, setSpeed } = useSignPlayer({
    onTokenStart: (gloss, idx) => {
      setActiveTokenIdx(idx);
      addLog(`▶ TokenStart: ${gloss} (idx ${idx})`);
    },
    onTokenEnd: (gloss, idx) => {
      addLog(`◼ TokenEnd: ${gloss} (idx ${idx})`);
    },
    onIdle: () => {
      setActiveTokenIdx(-1);
      addLog('⏸ Player idle — rest pose');
    },
  });

  // Load all demo clips on mount
  useEffect(() => {
    const allIds = DEMO_TOKENS.flatMap((t) => t.ids);
    Promise.all(
      allIds.map(async (id) => {
        const clip = await signLibraryLoader.getClip(id);
        return { id, clip };
      })
    ).then((results) => {
      const map: Record<string, SignClip> = {};
      let missingCount = 0;
      for (const { id, clip } of results) {
        if (clip) {
          map[id] = clip;
          if (!clip.synthetic) setIsSynthetic(false);
        } else {
          missingCount++;
        }
      }
      setClipMap(map);
      if (missingCount > 0) {
        setLoadError(`${missingCount} clip(s) could not be loaded. Is the backend running?`);
      }
      setLoading(false);
    });
  }, []);

  const queueItems = useMemo(() => buildQueueItems(DEMO_TOKENS, clipMap), [clipMap]);

  const handlePlay = useCallback(() => {
    if (status === 'paused') {
      play();
    } else {
      clear();
      if (queueItems.length > 0) {
        enqueue(queueItems);
      } else {
        addLog('⚠ No clips loaded — cannot play');
      }
    }
  }, [status, play, clear, enqueue, queueItems, addLog]);

  const handlePause = useCallback(() => pause(), [pause]);
  const handleClear = useCallback(() => {
    clear();
    setActiveTokenIdx(-1);
    addLog('✕ Cleared');
  }, [clear, addLog]);

  const isPlaying = status === 'playing' || status === 'blending';
  const isIdle = status === 'idle';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-purple-400 font-semibold mb-0.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phase 4 — Avatar Player Dev</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Sign Player Test</h1>
          </div>
        </div>

        {/* FPS Badge */}
        <div className="flex items-center gap-2 font-mono text-xs px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
          <Gauge className="w-3.5 h-3.5 text-emerald-400" />
          <span className={fps >= 55 ? 'text-emerald-400' : fps >= 30 ? 'text-amber-400' : 'text-rose-400'}>
            {fps} fps
          </span>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* ── Left: Avatar Canvas ── */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Avatar viewport */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl"
            style={{ aspectRatio: '4/3' }}>
            <AvatarContainer
              frame={frame}
              isIdle={isIdle}
              badge={isSynthetic ? 'SYNTHETIC' : undefined}
              className="w-full h-full"
            />

            {/* Status overlay */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Loading sign clips…</span>
                </div>
              </div>
            )}

            {/* Status badge */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-xs font-mono">
              <div className={`w-2 h-2 rounded-full ${
                isPlaying ? 'bg-emerald-400 animate-pulse' :
                status === 'paused' ? 'bg-amber-400' :
                'bg-slate-600'
              }`} />
              <span className="text-slate-400">{status}</span>
            </div>
          </div>

          {/* Token strip */}
          <div className="flex items-center gap-2 flex-wrap">
            {DEMO_TOKENS.map((token, i) => (
              <div
                key={i}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-mono font-medium transition-all duration-200 ${
                  activeTokenIdx === i
                    ? 'bg-indigo-950 border-indigo-500 text-indigo-200 shadow-lg shadow-indigo-500/20 scale-105'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                {token.kind === 'fingerspell' && <FlaskConical className="w-3 h-3 text-purple-400" />}
                {token.gloss}
                {i < DEMO_TOKENS.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-slate-600 ml-1" />
                )}
              </div>
            ))}
          </div>

          {/* Error banner */}
          {loadError && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs">
              ⚠ {loadError}
            </div>
          )}
        </div>

        {/* ── Right: Controls ── */}
        <div className="flex flex-col gap-5">
          {/* Playback controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-slate-200">Playback Controls</h2>

            <div className="grid grid-cols-3 gap-2">
              <button
                id="player-test-play-btn"
                onClick={handlePlay}
                disabled={loading}
                className="col-span-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-slate-800 text-white text-sm font-semibold rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
              >
                <Play className="w-4 h-4" />
                <span className="text-[11px]">Play</span>
              </button>
              <button
                id="player-test-pause-btn"
                onClick={handlePause}
                disabled={!isPlaying}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-slate-200 text-sm font-semibold rounded-xl flex flex-col items-center gap-1 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <Pause className="w-4 h-4" />
                <span className="text-[11px]">Pause</span>
              </button>
              <button
                id="player-test-clear-btn"
                onClick={handleClear}
                className="py-2.5 bg-slate-800 hover:bg-rose-950 border border-slate-700 hover:border-rose-800 text-slate-300 hover:text-rose-300 text-sm font-semibold rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer"
              >
                <StopCircle className="w-4 h-4" />
                <span className="text-[11px]">Clear</span>
              </button>
            </div>

            {/* Speed slider */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Speed</span>
                <span className="font-mono text-slate-200">{speed.toFixed(1)}×</span>
              </div>
              <input
                id="player-test-speed-slider"
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                <span>0.5×</span>
                <span>1.0×</span>
                <span>1.5×</span>
              </div>
            </div>
          </div>

          {/* Clip info */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-slate-200">Demo Sequence</h2>
            <div className="space-y-2">
              {DEMO_TOKENS.map((token, i) => {
                const loaded = token.ids.filter((id) => !!clipMap[id]);
                return (
                  <div key={i} className="flex items-start justify-between text-xs">
                    <div>
                      <span className={`font-mono font-semibold ${
                        activeTokenIdx === i ? 'text-indigo-300' : 'text-slate-300'
                      }`}>
                        {token.gloss}
                      </span>
                      {token.kind === 'fingerspell' && (
                        <span className="ml-1.5 text-purple-400 text-[10px]">fingerspell</span>
                      )}
                    </div>
                    <span className={loaded.length > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {loaded.length}/{token.ids.length} clips
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Event log */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-2 flex-1">
            <h2 className="text-sm font-semibold text-slate-200">Event Log</h2>
            <div className="space-y-1 font-mono text-[10px] text-slate-400 overflow-y-auto max-h-48">
              {log.length === 0 ? (
                <p className="text-slate-600">No events yet — press Play</p>
              ) : (
                log.map((entry, i) => (
                  <div key={i} className="border-b border-slate-800/60 pb-1">
                    {entry}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
