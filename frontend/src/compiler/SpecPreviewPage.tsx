/**
 * SpecPreviewPage.tsx — Phase S2 Sign Specification Studio & Live IK Solver Preview.
 *
 * Provides:
 *  - Interactive playback and scrubbing of SignSpec keyframes (t: 0.0 to 1.0)
 *  - Real-time IK Arm length and Palm normal validation metrics
 *  - Live 2D Skeleton / 3D Avatar rendering
 *  - Editable JSON sign specification with instant recompilation
 *  - 30 FPS SignClip export to JSON
 *  - Strict minimalist mono styling on pure white background
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Download,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Code,
  Activity,
  Sliders,
} from 'lucide-react';
import type { Landmark3D, SignClip, SignFrame } from '../lib/clipTypes';
import { AvatarContainer } from '../avatar/AvatarContainer';
import { evaluateSignSpecAtTime, vecNorm, vecSub } from './signSolver';
import { compileSignSpecToClip } from './signCompiler';
import { SAMPLE_SPECS } from './sampleSpecs';
import type { SignSpec } from './specTypes';

export interface SpecPreviewPageProps {
  onBack?: () => void;
}

export const SpecPreviewPage: React.FC<SpecPreviewPageProps> = ({ onBack }) => {
  const [selectedSpecName, setSelectedSpecName] = useState<string>('HELLO');
  const [specJsonText, setSpecJsonText] = useState<string>(
    JSON.stringify(SAMPLE_SPECS['HELLO'], null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Loaded canonical handshapes dictionary
  const [handshapeMap, setHandshapeMap] = useState<Record<string, Landmark3D[]>>({});

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.5); // Default slow-mo for inspection
  const [currentTimeNorm, setCurrentTimeNorm] = useState<number>(0.0);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [isMirrored, setIsMirrored] = useState<boolean>(false);

  const lastAnimTimeRef = useRef<number | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Load handshapes from backend API
  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '';
    fetch(`${apiBase}/data/handshapes/index.json`)
      .then((res) => res.json())
      .then(async (indexData) => {
        const map: Record<string, Landmark3D[]> = {};
        if (indexData?.handshapes) {
          const keys = Object.keys(indexData.handshapes);
          for (const k of keys) {
            try {
              const res = await fetch(`${apiBase}/data/handshapes/${k}.json`);
              if (res.ok) {
                const data = await res.json();
                if (data?.canonicalLandmarks) {
                  map[k] = data.canonicalLandmarks;
                }
              }
            } catch {
              // Ignore single fetch failure
            }
          }
        }
        setHandshapeMap(map);
      })
      .catch((err) => {
        console.warn('Failed to load handshape index:', err);
      });
  }, []);

  // Parse active SignSpec
  const activeSpec = useMemo<SignSpec | null>(() => {
    try {
      const parsed = JSON.parse(specJsonText) as SignSpec;
      if (!parsed.gloss || !Array.isArray(parsed.keyframes)) {
        throw new Error('Invalid SignSpec: must have "gloss" and "keyframes" array');
      }
      setJsonError(null);
      return parsed;
    } catch (err: unknown) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON format');
      return null;
    }
  }, [specJsonText]);

  // Handle Preset Selection
  const handleSelectPreset = useCallback((name: string) => {
    setSelectedSpecName(name);
    if (SAMPLE_SPECS[name]) {
      setSpecJsonText(JSON.stringify(SAMPLE_SPECS[name], null, 2));
      setCurrentTimeNorm(0.0);
      setIsPlaying(false);
    }
  }, []);

  // Solve current frame based on time t in [0.0, 1.0]
  const solvedFrameData = useMemo(() => {
    if (!activeSpec) return null;
    try {
      const solved = evaluateSignSpecAtTime(activeSpec, currentTimeNorm, handshapeMap);

      // Construct standard 33 MediaPipe pose landmarks
      const sh_r = solved.dominantArm.shoulder;
      const el_r = solved.dominantArm.elbow;
      const wr_r = solved.dominantArm.wrist;

      const sh_l = solved.nonDominantArm?.shoulder || [-0.5, 0.0, 0.0];
      const el_l = solved.nonDominantArm?.elbow || [-0.45, 0.35, 0.0];
      const wr_l = solved.nonDominantArm?.wrist || [-0.30, 0.45, 0.0];

      const pose: Landmark3D[] = [
        [0.0, -0.60, 0.0],
        [0.03, -0.63, 0.0],
        [0.05, -0.63, 0.0],
        [0.07, -0.63, 0.0],
        [-0.03, -0.63, 0.0],
        [-0.05, -0.63, 0.0],
        [-0.07, -0.63, 0.0],
        [0.12, -0.61, 0.0],
        [-0.12, -0.61, 0.0],
        [0.04, -0.54, 0.0],
        [-0.04, -0.54, 0.0],
        sh_r,
        sh_l,
        el_r,
        el_l,
        wr_r,
        wr_l,
        [wr_r[0] + 0.02, wr_r[1] + 0.05, wr_r[2]],
        [wr_l[0] - 0.02, wr_l[1] + 0.05, wr_l[2]],
        [wr_r[0] + 0.03, wr_r[1] + 0.07, wr_r[2]],
        [wr_l[0] - 0.03, wr_l[1] + 0.07, wr_l[2]],
        [wr_r[0] + 0.01, wr_r[1] + 0.06, wr_r[2]],
        [wr_l[0] - 0.01, wr_l[1] + 0.06, wr_l[2]],
        [0.30, 0.85, 0.0],
        [-0.30, 0.85, 0.0],
        [0.0, 1.2, 0.0],
        [0.0, 1.2, 0.0],
        [0.0, 1.2, 0.0],
        [0.0, 1.2, 0.0],
        [0.0, 1.2, 0.0],
        [0.0, 1.2, 0.0],
        [0.0, 1.2, 0.0],
        [0.0, 1.2, 0.0],
      ];

      const signFrame: SignFrame = {
        pose,
        right_hand: solved.dominantArm.handLandmarks,
        left_hand: solved.nonDominantArm?.handLandmarks || null,
      };

      // Math Invariant Calculations
      const upperArmLen = vecNorm(vecSub(el_r, sh_r));
      const forearmLen = vecNorm(vecSub(wr_r, el_r));

      return {
        signFrame,
        solved,
        upperArmLen,
        forearmLen,
      };
    } catch (e) {
      console.error('Error evaluating spec frame:', e);
      return null;
    }
  }, [activeSpec, currentTimeNorm, handshapeMap]);

  // Animation Loop for Playback
  useEffect(() => {
    if (!isPlaying || !activeSpec) {
      lastAnimTimeRef.current = null;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      return;
    }

    const duration = activeSpec.duration_ms || 1000;

    const tick = (now: number) => {
      if (lastAnimTimeRef.current !== null) {
        const delta = now - lastAnimTimeRef.current;
        const deltaNorm = (delta * playbackSpeed) / duration;

        setCurrentTimeNorm((prev) => {
          const next = prev + deltaNorm;
          if (next >= 1.0) {
            if (isLooping) {
              return 0.0;
            } else {
              setIsPlaying(false);
              return 1.0;
            }
          }
          return next;
        });
      }
      lastAnimTimeRef.current = now;
      animFrameIdRef.current = requestAnimationFrame(tick);
    };

    animFrameIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isPlaying, activeSpec, playbackSpeed, isLooping]);

  // Export Full 30 FPS SignClip to JSON
  const handleExportClip = useCallback(() => {
    if (!activeSpec) return;
    const clip: SignClip = compileSignSpecToClip(activeSpec, handshapeMap);
    const jsonStr = JSON.stringify(clip, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${clip.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [activeSpec, handshapeMap]);

  // Copy Spec to clipboard
  const handleCopySpec = useCallback(() => {
    navigator.clipboard.writeText(specJsonText);
  }, [specJsonText]);

  return (
    <div className="flex-1 flex flex-col bg-white text-neutral-900 font-mono overflow-y-auto">
      {/* Top Header */}
      <div className="border-b border-neutral-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded border border-neutral-300 hover:border-black hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Return to Main Workspace"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="text-sm font-bold tracking-wider uppercase text-neutral-900 flex items-center gap-2">
              <Code className="w-4 h-4 text-black" />
              Sign Specification Studio
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-300 text-neutral-600">
                Phase S2
              </span>
            </h1>
            <p className="text-[11px] text-neutral-500">
              Analytical IK Arm Solver &bull; Canonical Handshape Compilation &bull; Real-time Scrubber
            </p>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 uppercase font-semibold">Preset:</span>
          <select
            value={selectedSpecName}
            onChange={(e) => handleSelectPreset(e.target.value)}
            className="px-2.5 py-1 text-xs border border-neutral-300 rounded bg-white text-neutral-900 font-mono focus:outline-none focus:border-black cursor-pointer"
          >
            {Object.keys(SAMPLE_SPECS).map((name) => (
              <option key={name} value={name}>
                {name} {SAMPLE_SPECS[name].hands === 'two' ? '(2-handed)' : '(1-handed)'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 bg-white">
        {/* ── Left Column (7 cols): Avatar View & Playback Controls ── */}
        <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-neutral-200 bg-white">
          {/* Avatar Viewport */}
          <div className="flex-1 relative bg-white min-h-[380px] lg:min-h-[440px] flex items-center justify-center border-b border-neutral-200">
            {solvedFrameData ? (
              <AvatarContainer
                frame={solvedFrameData.signFrame}
                isIdle={false}
                mirrored={isMirrored}
                highContrast={false}
                className="w-full h-full"
              />
            ) : (
              <div className="text-xs text-neutral-400">No frame data solved</div>
            )}

            {/* Invariant Metric Overlay (Top Right) */}
            {solvedFrameData && (
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur border border-neutral-200 rounded p-2 text-[10px] space-y-1 shadow-sm pointer-events-none">
                <div className="font-bold text-neutral-700 uppercase border-b border-neutral-200 pb-0.5">
                  IK Invariants
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-neutral-500">Upper Arm (0.420):</span>
                  <span className="font-bold text-emerald-600">
                    {solvedFrameData.upperArmLen.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-neutral-500">Forearm (0.380):</span>
                  <span className="font-bold text-emerald-600">
                    {solvedFrameData.forearmLen.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-neutral-500">Total Arm (0.800):</span>
                  <span className="font-bold text-black">
                    {(solvedFrameData.upperArmLen + solvedFrameData.forearmLen).toFixed(3)}
                  </span>
                </div>
              </div>
            )}

            {/* Verification Badge (Top Left) */}
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur border border-neutral-200 rounded px-2 py-1 text-[11px] shadow-sm">
              {activeSpec?.verified_by ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  VERIFIED: {activeSpec.verified_by}
                </span>
              ) : (
                <span className="text-amber-700 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  UNVERIFIED SPEC
                </span>
              )}
            </div>
          </div>

          {/* Playback Control Bar */}
          <div className="p-4 bg-neutral-50 border-t border-neutral-200 space-y-3">
            {/* Scrubber Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-neutral-600">
                <span className="font-bold">Keyframe Timeline Scrubber</span>
                <span className="font-mono">
                  t = {currentTimeNorm.toFixed(3)} (
                  {Math.round(currentTimeNorm * (activeSpec?.duration_ms || 1000))}ms /{' '}
                  {activeSpec?.duration_ms || 1000}ms)
                </span>
              </div>
              <div className="relative flex items-center">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.005"
                  value={currentTimeNorm}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setCurrentTimeNorm(parseFloat(e.target.value));
                  }}
                  className="w-full accent-black cursor-pointer"
                  id="timeline-scrubber"
                />
              </div>
              {/* Keyframe Markers */}
              {activeSpec && (
                <div className="relative w-full h-2 text-[9px] text-neutral-400">
                  {activeSpec.keyframes.map((kf, i) => (
                    <span
                      key={i}
                      style={{ left: `${kf.t * 100}%` }}
                      className="absolute -translate-x-1/2 font-bold text-neutral-700"
                    >
                      &bull; {kf.dominant.handshape}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Buttons Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-bold rounded hover:bg-neutral-800 transition-colors cursor-pointer"
                  id="play-pause-btn"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {isPlaying ? 'PAUSE' : 'PLAY'}
                </button>

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentTimeNorm(0.0);
                  }}
                  className="p-1.5 bg-white border border-neutral-300 text-neutral-700 rounded hover:bg-neutral-100 transition-colors cursor-pointer"
                  title="Reset to Start (t=0.0)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <label className="flex items-center gap-1 text-xs text-neutral-700 pl-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLooping}
                    onChange={(e) => setIsLooping(e.target.checked)}
                    className="accent-black"
                  />
                  Loop
                </label>

                <label className="flex items-center gap-1 text-xs text-neutral-700 pl-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMirrored}
                    onChange={(e) => setIsMirrored(e.target.checked)}
                    className="accent-black"
                  />
                  Mirror
                </label>
              </div>

              {/* Speed Selectors */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-neutral-500 uppercase">Speed:</span>
                {[0.1, 0.25, 0.5, 1.0].map((s) => (
                  <button
                    key={s}
                    onClick={() => setPlaybackSpeed(s)}
                    className={`px-2 py-0.5 text-xs rounded border transition-colors cursor-pointer ${
                      playbackSpeed === s
                        ? 'bg-black border-black text-white font-bold'
                        : 'bg-white border-neutral-300 text-neutral-700 hover:border-black'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column (5 cols): Spec JSON Editor & IK Inspector ── */}
        <div className="lg:col-span-5 flex flex-col bg-white overflow-hidden">
          {/* Tabs / Header */}
          <div className="border-b border-neutral-200 px-4 py-2 bg-neutral-100 flex items-center justify-between">
            <div className="text-xs font-bold uppercase text-neutral-700 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              SignSpec Definition (JSON)
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopySpec}
                className="p-1 text-neutral-600 hover:text-black hover:bg-neutral-200 rounded transition-colors"
                title="Copy Spec JSON"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleExportClip}
                className="flex items-center gap-1 px-2 py-0.5 bg-black text-white text-[11px] font-semibold rounded hover:bg-neutral-800 transition-colors"
                title="Compile and download 30 FPS SignClip"
              >
                <Download className="w-3 h-3" />
                Export Clip
              </button>
            </div>
          </div>

          {/* JSON Textarea */}
          <div className="flex-1 relative flex flex-col min-h-[300px]">
            <textarea
              value={specJsonText}
              onChange={(e) => setSpecJsonText(e.target.value)}
              className={`w-full flex-1 p-3 text-xs font-mono bg-neutral-50 text-neutral-900 border-none resize-none focus:outline-none focus:bg-white leading-relaxed ${
                jsonError ? 'border-b-2 border-rose-500' : ''
              }`}
              spellCheck={false}
              id="spec-json-editor"
            />
            {jsonError && (
              <div className="p-2 bg-rose-50 border-t border-rose-300 text-rose-700 text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>JSON Error: {jsonError}</span>
              </div>
            )}
          </div>

          {/* Solved State Inspector */}
          {solvedFrameData && (
            <div className="border-t border-neutral-200 p-3 bg-neutral-50 space-y-2 text-xs">
              <div className="font-bold text-neutral-700 uppercase tracking-wider text-[11px] flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-neutral-800" />
                Evaluated Kinematics at t = {currentTimeNorm.toFixed(2)}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-white rounded border border-neutral-200">
                  <div className="text-neutral-500 font-semibold">Dominant Wrist [X, Y, Z]</div>
                  <div className="font-mono font-bold text-neutral-900">
                    [{solvedFrameData.solved.dominantArm.wrist.map((n) => n.toFixed(3)).join(', ')}]
                  </div>
                </div>

                <div className="p-2 bg-white rounded border border-neutral-200">
                  <div className="text-neutral-500 font-semibold">Palm Normal Vector</div>
                  <div className="font-mono font-bold text-neutral-900">
                    [{solvedFrameData.solved.dominantArm.palmNormal.map((n) => n.toFixed(2)).join(', ')}]
                  </div>
                </div>

                <div className="p-2 bg-white rounded border border-neutral-200">
                  <div className="text-neutral-500 font-semibold">Finger Pointing Vector</div>
                  <div className="font-mono font-bold text-neutral-900">
                    [{solvedFrameData.solved.dominantArm.fingerDir.map((n) => n.toFixed(2)).join(', ')}]
                  </div>
                </div>

                <div className="p-2 bg-white rounded border border-neutral-200">
                  <div className="text-neutral-500 font-semibold">Canonical Handshapes</div>
                  <div className="font-mono font-bold text-neutral-900">
                    {Object.keys(handshapeMap).length} loaded
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
