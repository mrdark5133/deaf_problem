/**
 * SignBridge App — Minimalist Mono Edition (White Background / Studio Precision).
 *
 * Clean architectural layout:
 *   Header (Brand [SB] | View Navigation | Settings | Status)
 *   Demo Bar (Offline scenario presets)
 *   Optional Onboarding Guide
 *   Split Workspace:
 *     Left (60%): Skeleton / 3D Avatar + ASL Gloss Token Strip
 *     Right (40%): Live Captions Panel + Voice & Typed Input Bar
 *   Minimalist Footer with keyboard shortcuts
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sliders,
  Keyboard,
  Camera,
  Tv2,
  FlipHorizontal,
  Bug,
  Hand,
  Code,
  ShieldCheck,
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
import { SelfCheckModal } from './ui/SelfCheckModal';
import { OnboardingCard } from './ui/OnboardingCard';
import { AvatarContainer } from './avatar/AvatarContainer';
import { RecorderPage } from './recorder/RecorderPage';
import { PlayerTestPage } from './player/PlayerTestPage';
import { HandshapeWizardPage } from './handshapes/HandshapeWizardPage';
import { SpecPreviewPage } from './compiler/SpecPreviewPage';
import { DemoBar } from './demo/DemoBar';
import { type DemoScenario } from './demo/demoScenarios';
import { signLibraryLoader } from './player/libraryLoader';
import { expandTokensToQueue } from './lib/translationOrdering';
import type { ClipQueueItem } from './player/SignPlayer';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'main' | 'recorder' | 'player' | 'handshapes' | 'specs'>('main');
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
  const [showSelfCheck, setShowSelfCheck] = useState(false);

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

  const queueItemsRef = useRef<ClipQueueItem[]>([]);

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

  useEffect(() => {
    if (settings.playbackSpeed !== speed) {
      setSpeed(settings.playbackSpeed);
    }
  }, [settings.playbackSpeed, setSpeed, speed]);

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      if (e.key === 'Escape') {
        setShowSettings(false);
        setShowShortcuts(false);
        setShowDebug(false);
        return;
      }

      if (isInput) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        toggleListening();
        return;
      }

      if (e.key === 'd' || e.key === 'D') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          setShowDebug((v) => !v);
        }
      }

      if (e.key === 'm' || e.key === 'M') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          toggleAvatarMirrored();
        }
      }

      if (e.key === 'c' || e.key === 'C') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          handleClearCaptions();
        }
      }

      if (e.key === '?' || e.key === 'h' || e.key === 'H') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          setShowShortcuts((v) => !v);
        }
      }

      if (e.key === '1') setCurrentView('main');
      if (e.key === '2') setCurrentView('recorder');
      if (e.key === '3') setCurrentView('player');
      if (e.key === '4') setCurrentView('handshapes');
      if (e.key === '5') setCurrentView('specs');
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleListening, toggleAvatarMirrored, handleClearCaptions]);

  const isIdle = playerStatus === 'idle';
  const backendOk = !loading && health?.status === 'ok';
  const isHighContrast = settings.theme === 'high-contrast';

  // ── Minimalist Mono Header ──────────────────────────────────────────────────
  const header = (
    <header className="border-b border-neutral-200 bg-white px-4 sm:px-6 py-2.5 flex items-center justify-between sticky top-0 z-50 font-mono">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded border border-neutral-900 bg-black text-white flex items-center justify-center font-bold text-xs tracking-tighter shrink-0">
          SB
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-neutral-900 leading-none">
            SignBridge
          </h1>
          <p className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">
            Speech → ASL Avatar
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Nav views */}
        <button
          onClick={() => setCurrentView(currentView === 'recorder' ? 'main' : 'recorder')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded border transition-colors cursor-pointer ${
            currentView === 'recorder'
              ? 'bg-black border-black text-white'
              : 'bg-white border-neutral-300 text-neutral-800 hover:border-black hover:bg-neutral-100'
          }`}
          id="nav-cv-studio-btn"
          title="Sign Capture CV Studio [2]"
        >
          <Camera className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">CV Studio</span>
        </button>

        <button
          onClick={() => setCurrentView(currentView === 'player' ? 'main' : 'player')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded border transition-colors cursor-pointer ${
            currentView === 'player'
              ? 'bg-black border-black text-white'
              : 'bg-white border-neutral-300 text-neutral-800 hover:border-black hover:bg-neutral-100'
          }`}
          id="nav-player-test-btn"
          title="Avatar Player Studio [3]"
        >
          <Tv2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Player</span>
        </button>

        <button
          onClick={() => setCurrentView(currentView === 'handshapes' ? 'main' : 'handshapes')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded border transition-colors cursor-pointer ${
            currentView === 'handshapes'
              ? 'bg-black border-black text-white'
              : 'bg-white border-neutral-300 text-neutral-800 hover:border-black hover:bg-neutral-100'
          }`}
          id="nav-handshapes-btn"
          title="Handshape Capture Wizard [4]"
        >
          <Hand className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Handshapes</span>
        </button>

        <button
          onClick={() => setCurrentView(currentView === 'specs' ? 'main' : 'specs')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded border transition-colors cursor-pointer ${
            currentView === 'specs'
              ? 'bg-black border-black text-white'
              : 'bg-white border-neutral-300 text-neutral-800 hover:border-black hover:bg-neutral-100'
          }`}
          id="nav-specs-btn"
          title="Sign Spec Studio [5]"
        >
          <Code className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Spec Studio</span>
        </button>

        {/* Mirror quick toggle */}
        <button
          onClick={toggleAvatarMirrored}
          className={`p-1.5 rounded border transition-colors cursor-pointer ${
            settings.avatarMirrored
              ? 'bg-black border-black text-white'
              : 'border-neutral-300 text-neutral-700 hover:border-black hover:bg-neutral-100'
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
          className="p-1.5 rounded border border-neutral-300 text-neutral-700 hover:border-black hover:bg-neutral-100 transition-colors cursor-pointer"
          title="Keyboard Shortcuts [?]"
          aria-label="Open keyboard shortcuts cheat sheet"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Settings & Accessibility Modal button */}
        <button
          onClick={() => setShowSettings(true)}
          className="p-1.5 rounded border border-neutral-300 text-neutral-700 hover:border-black hover:bg-neutral-100 transition-colors cursor-pointer"
          title="Accessibility & Preferences"
          aria-label="Open accessibility and preferences settings"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Self-Check & Honesty Audit Modal button */}
        <button
          onClick={() => setShowSelfCheck(true)}
          className="p-1.5 rounded border border-neutral-300 text-neutral-700 hover:border-black hover:bg-neutral-100 transition-colors cursor-pointer"
          title="System Self-Check & Provenance Audit"
          aria-label="Open system self check modal"
          id="selfcheck-btn"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
        </button>

        {/* Debug Toggle */}
        <button
          onClick={() => setShowDebug((v) => !v)}
          className={`p-1.5 rounded border transition-colors cursor-pointer ${
            showDebug
              ? 'bg-black border-black text-white'
              : 'border-neutral-300 text-neutral-700 hover:border-black hover:bg-neutral-100'
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
          className="p-1.5 text-neutral-700 hover:text-black hover:bg-neutral-100 rounded border border-neutral-300 disabled:opacity-50 transition-colors cursor-pointer"
          title="Refresh backend status"
          aria-label="Refresh status"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-black' : ''}`} />
        </button>

        {/* Backend Status Badge */}
        <div
          data-testid="backend-status-badge"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider border ${
            loading
              ? 'bg-neutral-100 text-neutral-600 border-neutral-300'
              : backendOk
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
              : 'bg-rose-950/80 text-rose-300 border-rose-800/60'
          }`}
        >
          {loading ? (
            <>
              <Activity className="w-3 h-3 animate-pulse text-neutral-500" />
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
      <div className="min-h-screen bg-white text-neutral-900 font-mono flex flex-col">
        {header}
        <RecorderPage onBack={() => setCurrentView('main')} />
      </div>
    );
  }
  if (currentView === 'player') {
    return (
      <div className="min-h-screen bg-white text-neutral-900 font-mono flex flex-col">
        {header}
        <PlayerTestPage onBack={() => setCurrentView('main')} />
      </div>
    );
  }
  if (currentView === 'handshapes') {
    return (
      <div className="min-h-screen bg-white text-neutral-900 font-mono flex flex-col">
        {header}
        <HandshapeWizardPage onBack={() => setCurrentView('main')} />
      </div>
    );
  }
  if (currentView === 'specs') {
    return (
      <div className="min-h-screen bg-white text-neutral-900 font-mono flex flex-col">
        {header}
        <SpecPreviewPage onBack={() => setCurrentView('main')} />
      </div>
    );
  }

  // ── Main View ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white text-neutral-900 font-mono flex flex-col selection:bg-neutral-200">
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

      <main className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden bg-white" style={{ minHeight: 0 }}>
        {/* ── Left: Avatar ── */}
        <div
          className={`flex flex-col bg-white border-b lg:border-b-0 lg:border-r border-neutral-200 transition-all ${
            settings.avatarSize === 'large' ? 'lg:w-2/3' : 'lg:w-3/5'
          }`}
        >
          {/* Avatar viewport */}
          <div className="flex-1 relative bg-white" style={{ minHeight: '340px' }}>
            <AvatarContainer
              frame={frame}
              isIdle={isIdle}
              mirrored={settings.avatarMirrored}
              highContrast={isHighContrast}
              isQuestion={pipeline.isQuestion}
              questionType={pipeline.questionType as 'wh' | 'yes_no' | null}
              className="w-full h-full"
            />

            {/* Status badge */}
            <div className="absolute top-3 left-3 flex items-center gap-2 px-2 py-0.5 rounded bg-white/95 border border-neutral-300 text-[10px] font-mono font-semibold text-neutral-800 shadow-xs">
              <span>AVATAR ENGINE</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  playerStatus === 'playing' || playerStatus === 'blending'
                    ? 'bg-green-600 animate-pulse'
                    : playerStatus === 'paused'
                    ? 'bg-amber-500'
                    : 'bg-neutral-400'
                }`}
              />
            </div>

            {/* Mirror Indicator */}
            {settings.avatarMirrored && (
              <div className="absolute top-3 left-36 font-mono text-[10px] px-2 py-0.5 rounded bg-white border border-neutral-300 text-neutral-800 font-bold">
                MIRRORED
              </div>
            )}

            {/* FPS counter & Speed badge */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 font-mono text-[10px]">
              <span className="px-2 py-0.5 rounded border border-neutral-300 bg-white font-bold text-neutral-800">
                {speed.toFixed(2)}×
              </span>
              <div
                className={`px-2 py-0.5 rounded border font-bold ${
                  fps >= 55
                    ? 'text-neutral-900 border-neutral-300 bg-white'
                    : fps >= 30
                    ? 'text-amber-800 border-amber-300 bg-amber-50'
                    : 'text-red-800 border-red-300 bg-red-50'
                }`}
              >
                {fps} FPS
              </div>
            </div>
          </div>

          {/* Gloss strip */}
          <div className="shrink-0 p-3.5 border-t border-neutral-200 bg-neutral-50">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold font-mono">
                // ASL GLOSS STREAM
              </span>
              {pipeline.isQuestion && (
                <span className="text-[9px] font-mono text-neutral-900 uppercase font-bold bg-neutral-200 px-1.5 py-0.5 rounded border border-neutral-300">
                  {pipeline.questionType === 'wh' ? 'WH-QUESTION (FURROWED BROW)' : 'YES/NO-QUESTION (RAISED BROW)'}
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
          className={`flex flex-col bg-neutral-50/50 ${
            settings.avatarSize === 'large' ? 'lg:w-1/3' : 'lg:w-2/5'
          }`}
        >
          {/* Alerts / Banners */}
          <div className="shrink-0 px-4 pt-3 space-y-2">
            {(speechStatus === 'denied' || !pipeline.backendReachable) && (
              <div className="p-3 rounded border border-amber-300 bg-amber-50 text-amber-900 text-xs">
                {speechStatus === 'denied' && (
                  <p className="font-semibold">Microphone blocked — enable microphone permission in browser settings or use typed text input.</p>
                )}
                {!pipeline.backendReachable && (
                  <p className="font-semibold mt-0.5">Backend offline — attempting automatic reconnection.</p>
                )}
              </div>
            )}
            {speechStatus === 'error' && speechError && (
              <div className="p-3 rounded border border-red-300 bg-red-50 text-red-900 text-xs">
                <p>{speechError}</p>
              </div>
            )}
            {speechStatus === 'unsupported' && (
              <div className="p-3 rounded border border-neutral-300 bg-neutral-100 text-neutral-700 text-xs">
                <p>Web Speech API active in Chrome / Edge. Typed input mode is active on all browsers.</p>
              </div>
            )}
            {pipeline.lastError && (
              <div className="p-3 rounded border border-red-300 bg-red-50 text-red-900 text-xs">
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
          <div className="shrink-0 p-4 border-t border-neutral-200 bg-white">
            <div className="bg-white border border-neutral-300 rounded-lg p-3.5 flex flex-col sm:flex-row items-center gap-3.5 shadow-xs">
              <div className="shrink-0">
                <MicButton
                  status={speechStatus}
                  isListening={isListening}
                  onToggle={toggleListening}
                />
              </div>
              <div className="hidden sm:block w-px h-12 bg-neutral-200" />
              <div className="w-full flex-1 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                  <span>SPEAK [SPACE] OR TYPE SENTENCE</span>
                  <span>ENTER TO TRANSLATE</span>
                </div>
                <TextInput textSource={globalTextSource} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 border-t border-neutral-200 bg-white py-2 px-6 flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-500 font-mono">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-700">SignBridge ASL</span>
          <span>•</span>
          <span>WCAG 2.2 AA Accessible</span>
          <span>•</span>
          <span>Deterministic ASL Grammar</span>
        </div>
        <div className="flex items-center gap-2">
          <span>
            <kbd className="px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-800 border border-neutral-300">Space</kbd> Mic
          </span>
          <span>
            <kbd className="px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-800 border border-neutral-300">M</kbd> Mirror
          </span>
          <span>
            <kbd className="px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-800 border border-neutral-300">?</kbd> Shortcuts
          </span>
          <span>
            <kbd className="px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-800 border border-neutral-300">D</kbd> Debug
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

      {/* Self-Check Modal */}
      {showSelfCheck && (
        <SelfCheckModal
          onClose={() => setShowSelfCheck(false)}
        />
      )}

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
