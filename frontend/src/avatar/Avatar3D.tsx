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
  questionType = null,
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

  const frameRef = useRef<SignFrame>(frame);
  frameRef.current = frame;
  const isQuestionRef = useRef<boolean>(isQuestion);
  isQuestionRef.current = isQuestion;
  const questionTypeRef = useRef<'wh' | 'yes_no' | null>(questionType);
  questionTypeRef.current = questionType;
  const mirroredRef = useRef<boolean>(mirrored);
  mirroredRef.current = mirrored;
  const isIdleRef = useRef<boolean>(isIdle);
  isIdleRef.current = isIdle;

  const lowFpsCounter = useRef<number>(0);
  const fpsFrameCount = useRef<number>(0);
  const fpsLastTime = useRef<number>(performance.now());
  const fallbackTriggered = useRef<boolean>(false);
  const rafId = useRef<number | null>(null);

  const callbacksRef = useRef({ onFallback, onFpsUpdate });
  callbacksRef.current = { onFallback, onFpsUpdate };

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;

    if (!container || !canvas) return;

    if (!isWebGLAvailable()) {
      callbacksRef.current.onFallback?.('WebGL is not supported on this browser or hardware.');
      return;
    }

    try {
      const scene = new Avatar3DScene(container, canvas);
      sceneRef.current = scene;
      scene.setCameraPreset(activePreset, true);

      const w = container.clientWidth || 640;
      const h = container.clientHeight || 480;
      scene.resize(w, h);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize WebGL 3D scene';
      callbacksRef.current.onFallback?.(msg);
      return;
    }

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && sceneRef.current) {
          sceneRef.current.resize(width, height);
        }
      }
    });
    ro.observe(container);

    const animate = () => {
      if (sceneRef.current && frameRef.current) {
        sceneRef.current.render(
          frameRef.current,
          isQuestionRef.current,
          mirroredRef.current,
          questionTypeRef.current
        );
      }

      fpsFrameCount.current++;
      const now = performance.now();
      const elapsed = now - fpsLastTime.current;

      if (elapsed >= 1000) {
        const currentFps = Math.round((fpsFrameCount.current * 1000) / elapsed);
        setMeasuredFps(currentFps);
        callbacksRef.current.onFpsUpdate?.(currentFps);
        fpsFrameCount.current = 0;
        fpsLastTime.current = now;

        if (currentFps < 30 && !isIdleRef.current) {
          lowFpsCounter.current++;
          if (lowFpsCounter.current >= 3 && !fallbackTriggered.current) {
            fallbackTriggered.current = true;
            callbacksRef.current.onFallback?.(`Performance dropped below 30 FPS (${currentFps} FPS). Falling back to 2D Canvas.`);
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
  }, []);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.updateTheme(highContrast);
    }
  }, [highContrast]);

  const handlePresetChange = (preset: CameraPreset) => {
    setActivePreset(preset);
    if (sceneRef.current) {
      sceneRef.current.setCameraPreset(preset);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-white select-none font-mono ${className}`}
      role="img"
      aria-label="3D ASL Sign Avatar Mannequin"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Top Left: Badges */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 select-none pointer-events-none z-10">
        <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-neutral-900 border border-black text-white">
          3D MANNEQUIN
        </span>
        {badge && (
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-amber-100 border border-amber-300 text-amber-900">
            {badge}
          </span>
        )}
      </div>

      {/* Top Right: Camera Presets */}
      <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-md p-1 rounded border border-neutral-300 shadow-xs z-10">
        <button
          onClick={() => handlePresetChange('front')}
          className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer flex items-center gap-1 ${
            activePreset === 'front'
              ? 'bg-black text-white'
              : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
          }`}
          title="Front Camera View"
        >
          <Camera className="w-3 h-3" />
          <span>FRONT</span>
        </button>
        <button
          onClick={() => handlePresetChange('three-quarter')}
          className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer flex items-center gap-1 ${
            activePreset === 'three-quarter'
              ? 'bg-black text-white'
              : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
          }`}
          title="3/4 Angled Camera View"
        >
          <Eye className="w-3 h-3" />
          <span>3/4</span>
        </button>
        <button
          onClick={() => handlePresetChange('hands')}
          className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer flex items-center gap-1 ${
            activePreset === 'hands'
              ? 'bg-black text-white'
              : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
          }`}
          title="Hands Focus View"
        >
          <Hand className="w-3 h-3" />
          <span>HANDS</span>
        </button>
      </div>

      {/* Bottom Overlay: 3D Render Metrics */}
      <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-white/90 backdrop-blur-sm border border-neutral-300 text-[10px] font-mono font-semibold text-neutral-700 pointer-events-none z-10">
        WEBGL • {measuredFps} FPS
      </div>
    </div>
  );
};
