/**
 * SignBridge App — Phase 6 Accessible & Production Polished UI.
 *
 * Layout (main view):
 *   Header (logo | nav buttons | accessibility controls | backend badge)
 *   ┌────────────────────────────────────────┐
 *   │ Optional 3-Step Onboarding Quick-Guide │
 *   └────────────────────────────────────────┘
 *   ┌─────────────────────────┬──────────────┐
 *   │  SkeletonAvatar canvas  │ CaptionPanel │
 *   │  (large, 3/5 width)     │ GlossStrip   │
 *   └─────────────────────────┴──────────────┘
 *   Input bar (Mic + TextInput)
 *   Footer with Keyboard Shortcuts reference
 *   Modals: SettingsModal, ShortcutsModal, DebugOverlay
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Volume2,
  AlertTriangle,
  Info,
  Bug,
  Sparkles,
  Sliders,
  Keyboard,
  Camera,
  Tv2,
  FlipHorizontal,
} from 'lucide-react';
import { checkHealth } from './lib/api';
import type { HealthResponse } from './lib/types';
import type { CaptionItem, TextEvent } from './speech/types';
import { globalTextSource } from './speech/TextSource';
import { useSpeechRecognition } from './speech/useSpeechRecognition';
import { useSignPlayer } from './player/useSignPlayer';
import { useTranslationPipeline } from './hooks/useTranslationPipeline';
import { useAccessibilitySettings } from './hooks/useAccessibilitySettings';
import { CaptionPanel } from './ui/CaptionPanel';
import { TextInput } from './ui/TextInput';
import { MicButton } from './ui/MicButton';
import { GlossStrip } from './ui/GlossStrip';
import { DebugOverlay } from './ui/DebugOverlay';
import { SettingsModal } from './ui/SettingsModal';
import { ShortcutsModal } from './ui/ShortcutsModal';
import { OnboardingCard } from './ui/OnboardingCard';
import { AvatarContainer } from './avatar/AvatarContainer';
import { RecorderPage } from './recorder/RecorderPage';
import { PlayerTestPage } from './player/PlayerTestPage';
import { DemoBar } from './demo/DemoBar';
import { type DemoScenario } from './demo/demoScenarios';
import { signLibraryLoader } from './player/libraryLoader';
import { expandTokensToQueue } from './lib/translationOrdering';
import type { ClipQueueItem } from './player/SignPlayer';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'main' | 'recorder' | 'player'>('main');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [_error, setError] = useState<string | null>(null);

  // Demo playback state
  const [activeDemo, setActiveDemo] = useState<DemoScenario | null>(null);
  const [demoSentenceIdx, setDemoSentenceIdx] = useState<number>(0);
  const [isDemoPlaying, setIsDemoPlaying] = useState<boolean>(false);
  const demoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dialog states
  const [showDebug, setShowDebug] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Accessibility & UX Settings hook
  const {
    settings,
    setTheme,
    setCaptionFontSize,
    setAvatarSize,
    setAvatarMirrored,
    toggleAvatarMirrored,
    setPlaybackSpeed,
    setReducedMotion,
    dismissOnboarding,
    resetToDefaults,
    captionFontClass,
  } = useAccessibilitySettings();

  // Captions state
  const [captions, setCaptions] = useState<CaptionItem[]>([]);

  // Speech Recognition
  const {
    status: speechStatus,
    isListening,
    errorMessage: speechError,
    interimText,
    toggleListening,
  } = useSpeechRecognition({ textSource: globalTextSource });

  // Sign Player
  const {
    frame,
    status: playerStatus,
    currentGloss,
    currentTokenIndex,
    fps,
    queueLength,
    enqueue,
    clear: clearPlayer,
    setSpeed,
    speed,
  } = useSignPlayer({
    onTokenStart: (g, i) => pipeline.playerCallbacks.onTokenStart?.(g, i),
    onTokenEnd: (g, i) => pipeline.playerCallbacks.onTokenEnd?.(g, i),
    onIdle: () => pipeline.playerCallbacks.onIdle?.(),
  });

  // Translation pipeline
  const pipeline = useTranslationPipeline({
    onTokensReceived: (_tokens, _isQ) => {},
    onError: (msg) => setError(msg),
  });

  // Remaining queue items ref (for lag estimation)
  const queueItemsRef = useRef<ClipQueueItem[]>([]);

  // Sync player state into the pipeline for lag estimation and debug metrics.
  // setDebugMetrics inside pipeline is ref-guarded, so this won't cause
  // infinite re-renders even though it calls into the pipeline on every change.
  useEffect(() => {
    pipeline.updatePlayerState({
      status: playerStatus,
      fps,
      speed,
      queueItems: queueItemsRef.current,
      currentGloss,
      setSpeed,
      enqueue,
    });
  }, [pipeline, playerStatus, fps, speed, currentGloss, setSpeed, enqueue]);

  // Sync settings playback speed with player
  useEffect(() => {
    if (settings.playbackSpeed !== speed) {
      setSpeed(settings.playbackSpeed);
    }
  }, [settings.playbackSpeed, setSpeed, speed]);

  // Health fetch
  const fetchHealthStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await checkHealth();
      setHealth(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Backend connection failed');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Caption subscription
  useEffect(() => {
    const unsub = globalTextSource.subscribe((evt: TextEvent) => {
      if (evt.type === 'final' && evt.text.trim()) {
        setCaptions((prev) => [
          ...prev,
          { id: evt.id, text: evt.text, isFinal: true, source: evt.source, timestamp: evt.timestamp },
        ]);
      }
    });
    return () => unsub();
  }, []);

  // Initial health
  useEffect(() => {
    let mounted = true;
    checkHealth()
      .then((d) => {
        if (mounted) {
          setHealth(d);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (mounted) {
          setError(e instanceof Error ? e.message : 'Backend error');
          setHealth(null);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const stopDemoScenario = useCallback(() => {
    if (demoTimeoutRef.current) {
      clearTimeout(demoTimeoutRef.current);
      demoTimeoutRef.current = null;
    }
    setActiveDemo(null);
    setIsDemoPlaying(false);
    setDemoSentenceIdx(0);
    clearPlayer();
  }, [clearPlayer]);

  const playDemoSentence = useCallback(
    async (scenario: DemoScenario, idx: number) => {
      if (idx >= scenario.sentences.length) {
        setIsDemoPlaying(false);
        return;
      }

      setDemoSentenceIdx(idx);
      const sentence = scenario.sentences[idx];

      // Add to live captions
      setCaptions((prev) => [
        ...prev,
        {
          id: `demo-${scenario.id}-${idx}-${Date.now()}`,
          text: sentence.text,
          isFinal: true,
          source: 'speech',
          timestamp: Date.now(),
        },
      ]);

      // Resolve and preload clips for tokens
      const clipIdsToFetch: string[] = [];
      for (const t of sentence.tokens) {
        if (t.clip_id) clipIdsToFetch.push(t.clip_id);
      }
      await signLibraryLoader.preloadClips(clipIdsToFetch);

      const clipMap = new Map();
      for (const t of sentence.tokens) {
        if (t.clip_id) {
          const c = await signLibraryLoader.getClip(t.clip_id);
          if (c) clipMap.set(t.clip_id, c);
        }
      }

      const queueItems = expandTokensToQueue(sentence.tokens, clipMap);
      enqueue(queueItems);

      // Schedule next sentence after this sentence finishes signing
      const totalFrames = queueItems.reduce((acc, it) => acc + (it.clip.frames?.length ?? 30), 0);
      const sentenceDurationMs = Math.max(2200, (totalFrames / 30) * 1000 + 350);

      demoTimeoutRef.current = setTimeout(() => {
        void playDemoSentence(scenario, idx + 1);
      }, sentenceDurationMs);
    },
    [enqueue]
  );

  const startDemoScenario = useCallback(
    (scenario: DemoScenario) => {
      stopDemoScenario();
      setActiveDemo(scenario);
      setIsDemoPlaying(true);
      void playDemoSentence(scenario, 0);
    },
    [stopDemoScenario, playDemoSentence]
  );

  const handleClearCaptions = useCallback(() => {
    stopDemoScenario();
    setCaptions([]);
    clearPlayer();
  }, [stopDemoScenario, clearPlayer]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      // Escape closes open modals
      if (e.key === 'Escape') {
        setShowSettings(false);
        setShowShortcuts(false);
        setShowDebug(false);
        return;
      }

      // If user is currently typing in an input field, do not hijack typing shortcuts
      if (isInput) return;

      // Space = toggle speech recognition
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        toggleListening();
        return;
      }

      // [D] = toggle debug metrics
      if (e.key === 'd' || e.key === 'D') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          setShowDebug((v) => !v);
        }
      }

      // [M] = toggle avatar mirror
      if (e.key === 'm' || e.key === 'M') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          toggleAvatarMirrored();
        }
      }

      // [C] = clear captions
      if (e.key === 'c' || e.key === 'C') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          handleClearCaptions();
        }
      }

      // [?] or [H] = toggle keyboard shortcuts
      if (e.key === '?' || e.key === 'h' || e.key === 'H') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          setShowShortcuts((v) => !v);
        }
      }

      // [1], [2], [3] = view switches
      if (e.key === '1') setCurrentView('main');
      if (e.key === '2') setCurrentView('recorder');
      if (e.key === '3') setCurrentView('player');
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleListening, toggleAvatarMirrored, handleClearCaptions]);

  const isIdle = playerStatus === 'idle';
  const backendOk = !loading && health?.status === 'ok';
  const isHighContrast = settings.theme === 'high-contrast';

  // ── Shared header ──────────────────────────────────────────────────────────
  const header = (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
          <Volume2 className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-blue-400 bg-clip-text text-transparent leading-tight">
            SignBridge
          </h1>
          <p className="text-[10px] text-slate-400 leading-none">Speech → ASL Avatar</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Nav buttons */}
        <button
          onClick={() => setCurrentView(currentView === 'recorder' ? 'main' : 'recorder')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
            currentView === 'recorder'
              ? 'bg-indigo-900 border-indigo-700 text-indigo-200'
              : 'bg-indigo-950/70 border-indigo-800/60 text-indigo-300 hover:bg-indigo-900'
          }`}
          id="nav-cv-studio-btn"
          title="Sign Capture CV Studio [2]"
        >
          <Camera className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">CV Studio</span>
        </button>

        <button
          onClick={() => setCurrentView(currentView === 'player' ? 'main' : 'player')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
            currentView === 'player'
              ? 'bg-purple-900 border-purple-700 text-purple-200'
              : 'bg-purple-950/70 border-purple-800/60 text-purple-300 hover:bg-purple-900'
          }`}
          id="nav-player-test-btn"
          title="Avatar Player Studio [3]"
        >
          <Tv2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Player</span>
        </button>

        {/* Mirror quick toggle */}
        <button
          onClick={toggleAvatarMirrored}
          className={`p-2 rounded-lg border transition-colors cursor-pointer ${
            settings.avatarMirrored
              ? 'bg-cyan-950/70 border-cyan-800/60 text-cyan-300'
              : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Toggle Avatar Mirror View [M]"
          aria-label="Toggle Avatar Mirror Mode"
          aria-pressed={settings.avatarMirrored}
        >
          <FlipHorizontal className="w-4 h-4" />
        </button>

        {/* Keyboard Shortcuts helper button */}
        <button
          onClick={() => setShowShortcuts(true)}
          className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors cursor-pointer"
          title="Keyboard Shortcuts [?]"
          aria-label="Open keyboard shortcuts cheat sheet"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Settings & Accessibility Modal button */}
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors cursor-pointer"
          title="Accessibility & Preferences"
          aria-label="Open accessibility and preferences settings"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Debug Toggle */}
        <button
          onClick={() => setShowDebug((v) => !v)}
          className={`p-2 rounded-lg border transition-colors cursor-pointer ${
            showDebug
              ? 'bg-amber-950/60 border-amber-800/60 text-amber-300'
              : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Toggle Debug Overlay [D]"
          id="debug-toggle-btn"
          aria-pressed={showDebug}
        >
          <Bug className="w-4 h-4" />
        </button>

        {/* Refresh Health */}
        <button
          onClick={() => {
            void fetchHealthStatus();
          }}
          disabled={loading}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors border border-slate-800 disabled:opacity-50 cursor-pointer"
          title="Refresh backend status"
          aria-label="Refresh status"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
        </button>

        {/* Backend Status Badge */}
        <div
          data-testid="backend-status-badge"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            loading
              ? 'bg-slate-800/80 text-slate-300 border-slate-700'
              : backendOk
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
              : 'bg-rose-950/80 text-rose-300 border-rose-800/60'
          }`}
        >
          {loading ? (
            <>
              <Activity className="w-3 h-3 animate-pulse text-blue-400" />
              <span className="hidden sm:inline">Checking…</span>
            </>
          ) : backendOk ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">Connected</span>
            </>
          ) : (
            <>
              <XCircle className="w-3 h-3 text-rose-400" />
              <span className="hidden sm:inline">Offline</span>
            </>
          )}
        </div>
      </div>
    </header>
  );

  // ── Sub-views ──────────────────────────────────────────────────────────────
  if (currentView === 'recorder') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        {header}
        <RecorderPage onBack={() => setCurrentView('main')} />
      </div>
    );
  }
  if (currentView === 'player') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        {header}
        <PlayerTestPage onBack={() => setCurrentView('main')} />
      </div>
    );
  }

  // ── Main View ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-500/30">
      {header}

      {/* Scripted Offline Demo Scenarios Bar */}
      <DemoBar
        activeScenario={activeDemo}
        currentSentenceIdx={demoSentenceIdx}
        isPlaying={isDemoPlaying}
        onStartScenario={startDemoScenario}
        onStopScenario={stopDemoScenario}
      />

      {/* Quick Start Guide Banner (dismissible) */}
      {!settings.hasSeenOnboarding && (
        <div className="p-4 sm:px-6 max-w-7xl mx-auto w-full">
          <OnboardingCard
            onDismiss={dismissOnboarding}
            onOpenShortcuts={() => setShowShortcuts(true)}
          />
        </div>
      )}

      <main className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden" style={{ minHeight: 0 }}>
        {/* ── Left: Avatar ── */}
        <div
          className={`flex flex-col bg-slate-950 border-b lg:border-b-0 lg:border-r border-slate-800/60 transition-all ${
            settings.avatarSize === 'large' ? 'lg:w-2/3' : 'lg:w-3/5'
          }`}
        >
          {/* Avatar viewport */}
          <div className="flex-1 relative" style={{ minHeight: '340px' }}>
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/30 to-slate-950/60" />
            <AvatarContainer
              frame={frame}
              isIdle={isIdle}
              mirrored={settings.avatarMirrored}
              highContrast={isHighContrast}
              isQuestion={pipeline.isQuestion}
              className="w-full h-full"
            />

            {/* Status badge */}
            <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-950/80 border border-slate-800/80 text-[10px] font-mono text-slate-400 backdrop-blur-md">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Phase 6 — Accessible</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  playerStatus === 'playing' || playerStatus === 'blending'
                    ? 'bg-emerald-400 animate-pulse'
                    : playerStatus === 'paused'
                    ? 'bg-amber-400'
                    : 'bg-slate-700'
                }`}
              />
            </div>

            {/* Mirror Indicator */}
            {settings.avatarMirrored && (
              <div className="absolute top-3 left-36 font-mono text-[10px] px-2 py-0.5 rounded-full border border-cyan-800/60 bg-cyan-950/60 text-cyan-300">
                Mirrored
              </div>
            )}

            {/* FPS counter & Speed badge */}
            <div className="absolute top-3 right-3 flex items-center gap-2 font-mono text-[10px]">
              <span className="px-2 py-0.5 rounded-full border border-slate-800 bg-slate-900/80 text-slate-300">
                {speed.toFixed(2)}×
              </span>
              <div
                className={`px-2 py-0.5 rounded-full border ${
                  fps >= 55
                    ? 'text-emerald-400 border-emerald-900/60 bg-emerald-950/40'
                    : fps >= 30
                    ? 'text-amber-400 border-amber-900/60 bg-amber-950/40'
                    : 'text-rose-400 border-rose-900/60 bg-rose-950/40'
                }`}
              >
                {fps} fps
              </div>
            </div>
          </div>

          {/* Gloss strip */}
          <div className="shrink-0 p-3.5 border-t border-slate-800/60 bg-slate-900/40">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold font-mono">
                ASL Gloss
              </span>
              {pipeline.isQuestion && (
                <span className="text-[9px] font-mono text-amber-400 uppercase font-bold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/50">
                  {pipeline.questionType === 'wh' ? 'WH-Question (Furrowed Brow)' : 'Yes/No-Question (Raised Brow)'}
                </span>
              )}
            </div>
            <GlossStrip
              tokens={pipeline.currentTokens}
              activeTokenIndex={currentTokenIndex}
              isQuestion={pipeline.isQuestion}
              questionType={pipeline.questionType as 'wh' | 'yes_no' | null}
            />
          </div>
        </div>

        {/* ── Right: Captions + Input ── */}
        <div
          className={`flex flex-col bg-slate-950 ${
            settings.avatarSize === 'large' ? 'lg:w-1/3' : 'lg:w-2/5'
          }`}
        >
          {/* Alerts / Banners */}
          <div className="shrink-0 px-4 pt-3 space-y-2">
            {(speechStatus === 'denied' || !pipeline.backendReachable) && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/50 border border-amber-800/50 text-amber-200 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  {speechStatus === 'denied' && (
                    <p className="font-semibold">Mic permission denied — click the lock/settings icon in your browser URL bar to allow microphone access, or use typed input.</p>
                  )}
                  {!pipeline.backendReachable && (
                    <p className="font-semibold mt-0.5">Backend unreachable — retrying automatically.</p>
                  )}
                </div>
              </div>
            )}
            {speechStatus === 'error' && speechError && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-200 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p>{speechError}</p>
              </div>
            )}
            {speechStatus === 'unsupported' && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p>Speech recognition works best in Chrome / Edge. Keyboard input is always active.</p>
              </div>
            )}
            {pipeline.lastError && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-200 text-xs">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p>{pipeline.lastError}</p>
              </div>
            )}
          </div>

          {/* Captions */}
          <div className="flex-1 px-4 py-3 overflow-hidden" style={{ minHeight: 0 }}>
            <CaptionPanel
              captions={captions}
              interimText={interimText}
              onClear={handleClearCaptions}
              fontSizeClass={captionFontClass}
              className="h-full"
            />
          </div>

          {/* Input controls */}
          <div className="shrink-0 p-4 border-t border-slate-800/60 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 shadow-xl">
              <div className="shrink-0">
                <MicButton
                  status={speechStatus}
                  isListening={isListening}
                  onToggle={toggleListening}
                />
              </div>
              <div className="hidden sm:block w-px h-12 bg-slate-800" />
              <div className="w-full flex-1 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Type a sentence or press Space for mic</span>
                  <span>↵ to translate</span>
                </div>
                <TextInput textSource={globalTextSource} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer with Accessibility shortcuts info */}
      <footer className="shrink-0 border-t border-slate-800/60 bg-slate-900/50 py-2.5 px-6 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-3">
          <span>SignBridge • WCAG 2.2 AA Accessible • ASL Translation Engine</span>
        </div>
        <div className="flex items-center gap-3 font-mono">
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Space</kbd> Mic
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">M</kbd> Mirror
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">?</kbd> Shortcuts
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">D</kbd> Debug
          </span>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSetTheme={setTheme}
        onSetCaptionFontSize={setCaptionFontSize}
        onSetAvatarSize={setAvatarSize}
        onSetAvatarMirrored={setAvatarMirrored}
        onSetPlaybackSpeed={setPlaybackSpeed}
        onSetReducedMotion={setReducedMotion}
        onResetDefaults={resetToDefaults}
      />

      {/* Shortcuts Modal */}
      <ShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      {/* Debug Overlay */}
      {showDebug && (
        <DebugOverlay
          metrics={{
            ...pipeline.debugMetrics,
            fps,
            playerStatus,
            currentGloss,
            queueLength,
            playerSpeed: speed,
            backendReachable: pipeline.backendReachable,
            lastError: pipeline.lastError,
          }}
          onClose={() => setShowDebug(false)}
        />
      )}
    </div>
  );
};

export default App;
