/**
 * PlayerTestPage — Phase 4 & Phase H0 dev page for testing SkeletonAvatar + SignPlayer
 * and diagnosing hand-sign accuracy with Landmark Debug Mode.
 *
 * Provides:
 *  - Sequence Playback Mode (demo tokens + queue controls)
 *  - Landmark Debug Mode (dev only):
 *      - Clip selector & Frame-by-frame scrubber
 *      - Multi-layer visual toggles: Raw vs Normalized vs Smoothed vs Blended
 *      - Hand-Only Zoom Inspector with 21 joint node numbering & bone length readout
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  StopCircle,
  Gauge,
  ChevronRight,
  Sparkles,
  FlaskConical,
  Bug,
  Layers,
  ZoomIn,
  ChevronLeft,
  Activity,
} from 'lucide-react';
import { AvatarContainer } from '../avatar/AvatarContainer';
import { useSignPlayer } from './useSignPlayer';
import { signLibraryLoader } from './libraryLoader';
import type { ClipQueueItem } from './SignPlayer';
import type { Landmark3D, SignClip, SignFrame } from '../lib/clipTypes';
import { normalizeFrame, smoothSignFrames } from '../recorder/cvUtils';
import { lerpFrames } from './lerpFrames';

// ─── Demo Sequence Definition ─────────────────────────────────────────────────

interface DemoToken {
  gloss: string;
  kind: 'sign' | 'fingerspell';
  ids: string[];
}

const DEMO_TOKENS: DemoToken[] = [
  { gloss: 'WHERE', kind: 'sign', ids: ['where'] },
  { gloss: 'DOCTOR', kind: 'sign', ids: ['doctor'] },
  { gloss: 'SIGN', kind: 'fingerspell', ids: ['fs_s', 'fs_i', 'fs_g', 'fs_n'] },
];

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

export interface PlayerTestPageProps {
  onBack?: () => void;
}

export const PlayerTestPage: React.FC<PlayerTestPageProps> = ({ onBack }) => {
  const [viewMode, setViewMode] = useState<'player' | 'debug'>('player');

  // Clip loading
  const [clipMap, setClipMap] = useState<Record<string, SignClip>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTokenIdx, setActiveTokenIdx] = useState<number>(-1);
  const [log, setLog] = useState<string[]>([]);
  const [isSynthetic, setIsSynthetic] = useState(true);

  // Debug Inspector State
  const [selectedClipId, setSelectedClipId] = useState<string>('hello');
  const [debugFrameIdx, setDebugFrameIdx] = useState<number>(0);
  const [showRaw, setShowRaw] = useState<boolean>(true);
  const [showNorm, setShowNorm] = useState<boolean>(true);
  const [showSmoothed, setShowSmoothed] = useState<boolean>(true);
  const [showBlended, setShowBlended] = useState<boolean>(true);
  const [debugPlaying, setDebugPlaying] = useState<boolean>(false);

  const zoomCanvasRef = useRef<HTMLCanvasElement>(null);

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 20));
  }, []);

  const { frame, status, fps, speed, enqueue, play, pause, clear, setSpeed } = useSignPlayer({
    onTokenStart: (gloss, idx) => {
      setActiveTokenIdx(idx);
      addLog(`[START] Token: ${gloss} (idx ${idx})`);
    },
    onTokenEnd: (gloss, idx) => {
      addLog(`[END] Token: ${gloss} (idx ${idx})`);
    },
    onIdle: () => {
      setActiveTokenIdx(-1);
      addLog('[IDLE] Player rest pose');
    },
  });

  // Load clips on mount
  useEffect(() => {
    const allIds = [
      ...DEMO_TOKENS.flatMap((t) => t.ids),
      'hello', 'again', 'water', 'want', 'what', 'why', 'work', 'name', 'pain', 'fs_a', 'fs_b', 'fs_c', 'fs_d'
    ];
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
        addLog('[WARN] No clips loaded — cannot play');
      }
    }
  }, [status, play, clear, enqueue, queueItems, addLog]);

  const isPlaying = status === 'playing' || status === 'blending';
  const isIdle = status === 'idle';

  // Debug clip and frames
  const currentDebugClip = clipMap[selectedClipId];
  const debugFrames = currentDebugClip?.frames || [];
  const totalDebugFrames = debugFrames.length;

  // Single clip debug play loop
  useEffect(() => {
    if (!debugPlaying || totalDebugFrames === 0) return;
    const interval = setInterval(() => {
      setDebugFrameIdx((prev) => (prev + 1) % totalDebugFrames);
    }, 1000 / (currentDebugClip?.fps || 30));
    return () => clearInterval(interval);
  }, [debugPlaying, totalDebugFrames, currentDebugClip]);

  // Derived frames for Debug Mode:
  const rawFrame = debugFrames[debugFrameIdx] || frame;
  const smoothedFrames = useMemo(() => {
    return debugFrames.length > 0 ? smoothSignFrames(debugFrames, 0.4) : [];
  }, [debugFrames]);
  const smoothedFrame = smoothedFrames[debugFrameIdx] || rawFrame;

  // Next frame for blend demonstration
  const nextFrame = debugFrames[(debugFrameIdx + 1) % Math.max(1, totalDebugFrames)] || rawFrame;
  const blendedFrame = useMemo(() => {
    return lerpFrames(rawFrame, nextFrame, 0.5);
  }, [rawFrame, nextFrame]);

  // Active frame shown in main avatar when in debug mode
  const activeDebugFrame = showBlended
    ? blendedFrame
    : showSmoothed
    ? smoothedFrame
    : rawFrame;

  // Hand-only Zoom View Rendering (Picture-in-Picture)
  useEffect(() => {
    if (viewMode !== 'debug') return;
    const canvas = zoomCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Clean mono grid background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const hand = activeDebugFrame.right_hand || activeDebugFrame.left_hand;
    if (!hand || hand.length < 21) {
      ctx.fillStyle = '#64748b';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No Hand Detected in Frame', w / 2, h / 2);
      return;
    }

    // Center zoom view on hand's wrist (index 0) or middle MCP (index 9)
    const anchor = hand[9] || hand[0];
    const zoom = 550; // Magnification factor
    const cx = w / 2 - anchor[0] * zoom;
    const cy = h / 2 - anchor[1] * zoom;

    const projectZ = (p: Landmark3D): [number, number] => [cx + p[0] * zoom, cy + p[1] * zoom];

    // 1. Draw Finger Bones
    const FINGER_CHAINS = [
      [0, 1, 2, 3, 4],     // Thumb
      [0, 5, 6, 7, 8],     // Index
      [0, 9, 10, 11, 12],  // Middle
      [0, 13, 14, 15, 16], // Ring
      [0, 17, 18, 19, 20], // Pinky
    ];

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const chain of FINGER_CHAINS) {
      ctx.beginPath();
      for (let i = 0; i < chain.length; i++) {
        const p = projectZ(hand[chain[i]]);
        if (i === 0) ctx.moveTo(p[0], p[1]);
        else ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
    }

    // 2. Draw Joint Points & Numbers
    for (let i = 0; i < 21; i++) {
      const [jx, jy] = projectZ(hand[i]);
      if (jx >= 0 && jx <= w && jy >= 0 && jy <= h) {
        ctx.beginPath();
        ctx.arc(jx, jy, 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = i === 4 || i === 8 || i === 12 || i === 16 || i === 20 ? '#d97706' : '#2563eb';
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Joint Number Label
        ctx.fillStyle = '#0f172a';
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${i}`, jx + 6, jy + 3);
      }
    }
  }, [viewMode, activeDebugFrame]);

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-mono flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white px-6 py-3.5 flex items-center justify-between sticky top-0 z-50 font-mono">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 text-neutral-600 hover:text-black hover:bg-neutral-100 rounded border border-neutral-300 transition-colors cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-0.5">
              // STUDIO & DIAGNOSTICS
            </div>
            <h1 className="text-base font-bold text-neutral-900 tracking-tight leading-none">
              Sign Player & Hand Accuracy Studio
            </h1>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1.5 bg-neutral-100 border border-neutral-300 p-1 rounded">
          <button
            onClick={() => setViewMode('player')}
            className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewMode === 'player' ? 'bg-black text-white' : 'text-neutral-700 hover:text-black'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Sequence Playback</span>
          </button>
          <button
            onClick={() => setViewMode('debug')}
            className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewMode === 'debug' ? 'bg-black text-white' : 'text-neutral-700 hover:text-black'
            }`}
          >
            <Bug className="w-3.5 h-3.5" />
            <span>Landmark Debug</span>
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* ── Left 2 Cols: Avatar Canvas ── */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div
            className="relative rounded border border-neutral-300 bg-white shadow-xs overflow-hidden"
            style={{ aspectRatio: '4/3' }}
          >
            <AvatarContainer
              frame={viewMode === 'debug' ? activeDebugFrame : frame}
              isIdle={viewMode === 'debug' ? false : isIdle}
              badge={
                viewMode === 'debug'
                  ? `DEBUG: ${selectedClipId.toUpperCase()} [F${debugFrameIdx + 1}/${totalDebugFrames || 1}]`
                  : isSynthetic
                  ? 'SYNTHETIC'
                  : undefined
              }
              className="w-full h-full"
            />

            {/* Hand Zoom View Inset (Picture-in-Picture) */}
            {viewMode === 'debug' && (
              <div className="absolute top-3 right-3 w-52 h-52 bg-white/95 border border-neutral-400 rounded overflow-hidden shadow-md backdrop-blur-md z-20 flex flex-col font-mono">
                <div className="px-2 py-1 bg-neutral-100 border-b border-neutral-300 text-[10px] font-bold text-neutral-800 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <ZoomIn className="w-3 h-3 text-neutral-700" />
                    <span>HAND ZOOM (21 JOINTS)</span>
                  </span>
                  <span className="text-[9px] text-neutral-500">4× MAG</span>
                </div>
                <canvas
                  ref={zoomCanvasRef}
                  width={208}
                  height={184}
                  className="w-full flex-1 block"
                />
              </div>
            )}
          </div>

          {/* Player Mode: Token strip */}
          {viewMode === 'player' && (
            <div className="flex items-center gap-2 flex-wrap p-3 bg-neutral-50 border border-neutral-200 rounded">
              <span className="text-[10px] uppercase font-bold text-neutral-500 mr-1">// SEQUENCE:</span>
              {DEMO_TOKENS.map((token, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono font-bold transition-all ${
                    activeTokenIdx === i
                      ? 'bg-black border-black text-white'
                      : 'bg-white border-neutral-300 text-neutral-800'
                  }`}
                >
                  {token.kind === 'fingerspell' && <span className="text-[10px] opacity-70">[FS]</span>}
                  <span>{token.gloss}</span>
                  {i < DEMO_TOKENS.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-neutral-400 ml-1" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Debug Mode: Frame Scrubber */}
          {viewMode === 'debug' && (
            <div className="bg-white border border-neutral-300 rounded p-3.5 flex flex-col gap-2 font-mono">
              <div className="flex items-center justify-between text-xs text-neutral-800">
                <span className="font-bold text-neutral-900">// FRAME SCRUBBER:</span>
                <span className="font-semibold text-neutral-600">
                  FRAME {debugFrameIdx + 1} / {totalDebugFrames} ({Math.round(((debugFrameIdx + 1) / (totalDebugFrames || 1)) * 100)}%)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDebugFrameIdx((prev) => Math.max(0, prev - 1))}
                  className="p-1.5 rounded bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-800 text-xs cursor-pointer"
                  title="Previous Frame"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, totalDebugFrames - 1)}
                  value={debugFrameIdx}
                  onChange={(e) => setDebugFrameIdx(Number(e.target.value))}
                  className="flex-1 accent-black cursor-pointer"
                />
                <button
                  onClick={() => setDebugFrameIdx((prev) => Math.min(totalDebugFrames - 1, prev + 1))}
                  className="p-1.5 rounded bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-800 text-xs cursor-pointer"
                  title="Next Frame"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDebugPlaying(!debugPlaying)}
                  className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors ${
                    debugPlaying ? 'bg-amber-600 text-white' : 'bg-black text-white hover:bg-neutral-800'
                  }`}
                >
                  {debugPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{debugPlaying ? 'PAUSE' : 'PLAY'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Controls / Debug Panel ── */}
        <div className="flex flex-col gap-4 font-mono">
          {viewMode === 'player' ? (
            /* Player Mode Controls */
            <div className="bg-white border border-neutral-300 rounded p-4 flex flex-col gap-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">// PLAYBACK CONTROLS</h2>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handlePlay}
                  disabled={loading}
                  className="py-2 bg-black hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider rounded flex flex-col items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  <span>PLAY</span>
                </button>
                <button
                  onClick={() => pause()}
                  disabled={!isPlaying}
                  className="py-2 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 disabled:opacity-50 text-neutral-800 text-xs font-bold uppercase tracking-wider rounded flex flex-col items-center gap-1 transition-colors cursor-pointer"
                >
                  <Pause className="w-4 h-4" />
                  <span>PAUSE</span>
                </button>
                <button
                  onClick={() => {
                    clear();
                    setActiveTokenIdx(-1);
                  }}
                  className="py-2 bg-white hover:bg-red-50 border border-red-300 text-red-700 text-xs font-bold uppercase tracking-wider rounded flex flex-col items-center gap-1 transition-colors cursor-pointer"
                >
                  <StopCircle className="w-4 h-4" />
                  <span>CLEAR</span>
                </button>
              </div>

              {/* Speed slider */}
              <div className="flex flex-col gap-2 pt-3 border-t border-neutral-200">
                <div className="flex items-center justify-between text-xs text-neutral-700">
                  <span className="font-semibold">PLAYBACK SPEED</span>
                  <span className="font-mono font-bold text-neutral-900">{speed}×</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full accent-black cursor-pointer"
                />
              </div>
            </div>
          ) : (
            /* Debug Mode Controls */
            <div className="bg-white border border-neutral-300 rounded p-4 flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-2 border-b border-neutral-200">
                <Bug className="w-4 h-4 text-neutral-900" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">// LANDMARK DIAGNOSTICS</h2>
              </div>

              {/* Clip selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-neutral-600 font-bold uppercase">SELECT CLIP FOR DIAGNOSIS:</label>
                <select
                  value={selectedClipId}
                  onChange={(e) => {
                    setSelectedClipId(e.target.value);
                    setDebugFrameIdx(0);
                  }}
                  className="px-2.5 py-1.5 rounded bg-white border border-neutral-300 text-xs font-mono text-neutral-900 focus:outline-none focus:border-black"
                >
                  <optgroup label="Real Signs (ASL Citizen / ASL-MNIST)">
                    {Object.keys(clipMap)
                      .filter((id) => !clipMap[id]?.synthetic)
                      .map((id) => (
                        <option key={id} value={id}>
                          {id.toUpperCase()} ({clipMap[id]?.frames?.length || 0}f, REAL)
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Synthetic Vocabulary Signs">
                    {Object.keys(clipMap)
                      .filter((id) => clipMap[id]?.synthetic)
                      .map((id) => (
                        <option key={id} value={id}>
                          {id.toUpperCase()} ({clipMap[id]?.frames?.length || 0}f, SYNTHETIC)
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              {/* Layer Toggles */}
              <div className="flex flex-col gap-2 pt-2 border-t border-neutral-200 text-xs">
                <span className="font-bold text-neutral-800 uppercase text-[11px]">// PIPELINE LAYERS:</span>
                <label className="flex items-center gap-2 text-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRaw}
                    onChange={(e) => setShowRaw(e.target.checked)}
                    className="accent-black"
                  />
                  <span>Raw MediaPipe Keypoints</span>
                </label>
                <label className="flex items-center gap-2 text-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showNorm}
                    onChange={(e) => setShowNorm(e.target.checked)}
                    className="accent-black"
                  />
                  <span>Normalized Coordinate Layer</span>
                </label>
                <label className="flex items-center gap-2 text-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSmoothed}
                    onChange={(e) => setShowSmoothed(e.target.checked)}
                    className="accent-black"
                  />
                  <span>Smoothed Frame Layer (EMA 0.4)</span>
                </label>
                <label className="flex items-center gap-2 text-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBlended}
                    onChange={(e) => setShowBlended(e.target.checked)}
                    className="accent-black"
                  />
                  <span>Blended Transition Output</span>
                </label>
              </div>

              {/* Clip Metadata Readout */}
              {currentDebugClip && (
                <div className="p-2.5 rounded bg-neutral-50 border border-neutral-200 text-[11px] font-mono flex flex-col gap-1 text-neutral-800">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">SOURCE:</span>
                    <span className="font-bold">{currentDebugClip.source || (currentDebugClip.synthetic ? 'synthetic' : 'real')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">DURATION:</span>
                    <span>{currentDebugClip.meta?.duration_ms || 0} ms ({currentDebugClip.frames?.length || 0} frames)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">CLASS:</span>
                    <span className={currentDebugClip.synthetic ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                      {currentDebugClip.synthetic ? 'SYNTHETIC' : 'REAL VIDEO'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
