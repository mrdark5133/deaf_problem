/**
 * Avatar3D.tsx — React component for the Three.js 3D Mannequin Avatar.
 *
 * Implements the AvatarRendererProps interface.
 * Features:
 *  - Continuous RAF render loop for camera lerps and smooth animation
 *  - Automatic WebGL capability detection & graceful fallback
 *  - Rolling FPS measurement with auto-fallback if FPS < 30 for 3s (Non-negotiable 1)
 *  - Dynamic ResizeObserver with initial size measurement
 *  - Camera presets (Front, 3/4, Hands) with keyboard shortcuts
 */

import React, { useEffect, useRef, useState } from 'react';
import type { AvatarRendererProps, CameraPreset } from './AvatarTypes';
import { Avatar3DScene } from './Avatar3DScene';
import type { SignFrame } from '../lib/clipTypes';
import { Camera, Eye, Hand } from 'lucide-react';

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export const Avatar3D: React.FC<AvatarRendererProps> = ({
  frame,
  isIdle = false,
  mirrored = false,
  highContrast = false,
  isQuestion = false,
  badge,
  className = '',
  cameraPreset = 'front',
  onFpsUpdate,
  onFallback,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Avatar3DScene | null>(null);

  const [activePreset, setActivePreset] = useState<CameraPreset>(cameraPreset);
  const [measuredFps, setMeasuredFps] = useState<number>(60);

  // Refs to avoid RAF closure staleness
  const frameRef = useRef<SignFrame>(frame);
  frameRef.current = frame;
  const isQuestionRef = useRef<boolean>(isQuestion);
  isQuestionRef.current = isQuestion;
  const mirroredRef = useRef<boolean>(mirrored);
  mirroredRef.current = mirrored;
  const isIdleRef = useRef<boolean>(isIdle);
  isIdleRef.current = isIdle;

  // Performance degradation tracking (FPS < 30 for 3 consecutive seconds)
  const lowFpsCounter = useRef<number>(0);
  const fpsFrameCount = useRef<number>(0);
  const fpsLastTime = useRef<number>(performance.now());
  const fallbackTriggered = useRef<boolean>(false);
  const rafId = useRef<number | null>(null);

  // 1. Initialize Scene & WebGL with Continuous RAF loop
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;

    if (!container || !canvas) return;

    if (!isWebGLAvailable()) {
      onFallback?.('WebGL is not supported on this browser or hardware.');
      return;
    }

    try {
      const scene = new Avatar3DScene(container, canvas);
      sceneRef.current = scene;
      scene.setCameraPreset(activePreset, true);

      // Initial size fit
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 480;
      scene.resize(w, h);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize WebGL 3D scene';
      onFallback?.(msg);
      return;
    }

    // ResizeObserver
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && sceneRef.current) {
          sceneRef.current.resize(width, height);
        }
      }
    });
    ro.observe(container);

    // Continuous Animation / Render Loop
    const animate = () => {
      if (sceneRef.current && frameRef.current) {
        sceneRef.current.render(
          frameRef.current,
          isQuestionRef.current,
          mirroredRef.current
        );
      }

      // FPS Measurement
      fpsFrameCount.current++;
      const now = performance.now();
      const elapsed = now - fpsLastTime.current;

      if (elapsed >= 1000) {
        const currentFps = Math.round((fpsFrameCount.current * 1000) / elapsed);
        setMeasuredFps(currentFps);
        onFpsUpdate?.(currentFps);
        fpsFrameCount.current = 0;
        fpsLastTime.current = now;

        // Auto-fallback check: FPS < 30 for 3 consecutive seconds (only when actively playing)
        if (currentFps < 30 && !isIdleRef.current) {
          lowFpsCounter.current++;
          if (lowFpsCounter.current >= 3 && !fallbackTriggered.current) {
            fallbackTriggered.current = true;
            onFallback?.(`Performance dropped below 30 FPS (${currentFps} FPS). Falling back to 2D Canvas.`);
          }
        } else {
          lowFpsCounter.current = 0;
        }
      }

      rafId.current = requestAnimationFrame(animate);
    };

    rafId.current = requestAnimationFrame(animate);

    return () => {
      ro.disconnect();
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
      if (sceneRef.current) {
        sceneRef.current.dispose();
        sceneRef.current = null;
      }
    };
  }, [onFallback, onFpsUpdate]);

  // 2. Update Theme
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.updateTheme(highContrast);
    }
  }, [highContrast]);

  // 3. Camera Preset Switcher
  const handlePresetChange = (preset: CameraPreset) => {
    setActivePreset(preset);
    if (sceneRef.current) {
      sceneRef.current.setCameraPreset(preset);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-slate-950 ${className}`}
      role="img"
      aria-label="3D ASL Sign Avatar Mannequin"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Top Left: Badges */}
      <div className="absolute top-2 left-2 flex items-center gap-2 select-none pointer-events-none z-10">
        <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-indigo-950/80 border border-indigo-700/60 text-indigo-300">
          3D MANNEQUIN
        </span>
        {badge && (
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-amber-950/80 border border-amber-700/60 text-amber-300">
            {badge}
          </span>
        )}
      </div>

      {/* Top Right: Camera Presets */}
      <div className="absolute top-2 right-2 flex items-center gap-1 bg-slate-900/80 backdrop-blur-md p-1 rounded-lg border border-slate-800 z-10">
        <button
          onClick={() => handlePresetChange('front')}
          className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
            activePreset === 'front'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Front Camera View"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handlePresetChange('three-quarter')}
          className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
            activePreset === 'three-quarter'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
          title="3/4 Angled Camera View"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handlePresetChange('hands')}
          className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
            activePreset === 'hands'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Hands Focus View"
        >
          <Hand className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Overlay: 3D Render Metrics */}
      <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/60 backdrop-blur-sm border border-slate-800 text-[10px] font-mono text-slate-400 pointer-events-none z-10">
        3D WebGL • {measuredFps} FPS
      </div>
    </div>
  );
};
