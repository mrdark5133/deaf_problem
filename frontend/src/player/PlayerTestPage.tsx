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
        addLog('⚠ No clips loaded — cannot play');
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

    // Dark grid background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
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

    for (const chain of FINGER_CHAINS) {
      for (let i = 0; i < chain.length - 1; i++) {
        const pA = hand[chain[i]];
        const pB = hand[chain[i + 1]];
        if (pA && pB) {
          const [ax, ay] = projectZ(pA);
          const [bx, by] = projectZ(pB);

          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.strokeStyle = chain[0] === 1 || i === 0 ? '#38bdf8' : '#fbbf24';
          ctx.lineWidth = 3.5;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }
    }

    // 2. Draw 21 Articulated Joint Circles with Landmark ID Labels
    for (let i = 0; i < 21; i++) {
      const p = hand[i];
      if (p) {
        const [jx, jy] = projectZ(p);
        const isTip = [4, 8, 12, 16, 20].includes(i);
        const isMcp = [1, 5, 9, 13, 17].includes(i);

        ctx.beginPath();
        ctx.arc(jx, jy, isTip ? 5.5 : isMcp ? 4.5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = isTip ? '#f43f5e' : isMcp ? '#a855f7' : '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Joint Number Label
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${i}`, jx + 6, jy + 3);
      }
    }
  }, [viewMode, activeDebugFrame]);

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
              <span>Phase 4 & Phase H0 — Accuracy & Debug Studio</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Sign Player & Hand Accuracy Studio</h1>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('player')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'player' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Sequence Playback</span>
          </button>
          <button
            onClick={() => setViewMode('debug')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'debug' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bug className="w-3.5 h-3.5" />
            <span>🔬 Landmark Debug Mode</span>
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* ── Left 2 Cols: Avatar Canvas ── */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div
            className="relative rounded-2xl overflow-hidden border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl"
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
              <div className="absolute top-3 right-3 w-52 h-52 bg-slate-950/90 border border-purple-500/60 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md z-20 flex flex-col">
                <div className="px-2 py-1 bg-purple-950/80 border-b border-purple-800 text-[10px] font-mono font-semibold text-purple-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <ZoomIn className="w-3 h-3 text-purple-400" />
                    <span>Hand Zoom (21 Joint IDs)</span>
                  </span>
                  <span className="text-[9px] text-purple-400">4× MAG</span>
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
          )}

          {/* Debug Mode: Frame Scrubber */}
          {viewMode === 'debug' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span className="font-semibold text-purple-300">Frame Scrubber:</span>
                <span>
                  Frame {debugFrameIdx + 1} of {totalDebugFrames} ({Math.round(((debugFrameIdx + 1) / (totalDebugFrames || 1)) * 100)}%)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDebugFrameIdx((prev) => Math.max(0, prev - 1))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs cursor-pointer"
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
                  className="flex-1 accent-purple-500 cursor-pointer"
                />
                <button
                  onClick={() => setDebugFrameIdx((prev) => Math.min(totalDebugFrames - 1, prev + 1))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs cursor-pointer"
                  title="Next Frame"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDebugPlaying(!debugPlaying)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                    debugPlaying ? 'bg-amber-600 text-white' : 'bg-purple-600 text-white'
                  }`}
                >
                  {debugPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{debugPlaying ? 'Pause' : 'Play Clip'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Controls / Debug Panel ── */}
        <div className="flex flex-col gap-5">
          {viewMode === 'player' ? (
            /* Player Mode Controls */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-slate-200">Playback Controls</h2>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handlePlay}
                  disabled={loading}
                  className="py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  <Play className="w-4 h-4" />
                  <span className="text-[11px]">Play</span>
                </button>
                <button
                  onClick={() => pause()}
                  disabled={!isPlaying}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-sm font-semibold rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer"
                >
                  <Pause className="w-4 h-4" />
                  <span className="text-[11px]">Pause</span>
                </button>
                <button
                  onClick={() => {
                    clear();
                    setActiveTokenIdx(-1);
                  }}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-rose-400 text-sm font-semibold rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer"
                >
                  <StopCircle className="w-4 h-4" />
                  <span className="text-[11px]">Clear</span>
                </button>
              </div>

              {/* Speed slider */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Playback Speed</span>
                  <span className="font-mono font-semibold text-indigo-400">{speed}×</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>
          ) : (
            /* Debug Mode Controls */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Bug className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-semibold text-purple-200">Landmark Debug Inspector</h2>
              </div>

              {/* Clip selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Select Clip for Diagnosis:</label>
                <select
                  value={selectedClipId}
                  onChange={(e) => {
                    setSelectedClipId(e.target.value);
                    setDebugFrameIdx(0);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500"
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
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                <span className="text-xs font-semibold text-slate-300">Overlaid Pipeline Layers:</span>
                <label className="flex items-center gap-2 text-xs text-emerald-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRaw}
                    onChange={(e) => setShowRaw(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  <span>Raw MediaPipe Keypoints</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-cyan-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showNorm}
                    onChange={(e) => setShowNorm(e.target.checked)}
                    className="accent-cyan-500"
                  />
                  <span>Normalized Coordinate Layer</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-fuchsia-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSmoothed}
                    onChange={(e) => setShowSmoothed(e.target.checked)}
                    className="accent-fuchsia-500"
                  />
                  <span>Smoothed Frame Layer (EMA 0.4)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-amber-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBlended}
                    onChange={(e) => setShowBlended(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span>Blended Transition Output</span>
                </label>
              </div>

              {/* Clip Metadata Readout */}
              {currentDebugClip && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono flex flex-col gap-1 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Source:</span>
                    <span className="text-purple-300">{currentDebugClip.source || (currentDebugClip.synthetic ? 'synthetic' : 'real')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Duration:</span>
                    <span>{currentDebugClip.meta?.duration_ms || 0} ms ({currentDebugClip.frames?.length || 0} frames)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Classification:</span>
                    <span className={currentDebugClip.synthetic ? 'text-amber-400' : 'text-emerald-400'}>
                      {currentDebugClip.synthetic ? 'Synthetic Generator' : 'Real Sign Video'}
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
