/**
 * AvatarContainer.tsx — Adaptive 2D/3D Avatar Switcher with Automatic Fallback.
 *
 * Implements Non-Negotiable 1:
 *  - 2D Canvas is default and always available.
 *  - 3D is lazy-loaded via React.lazy() / Suspense.
 *  - Automatic fallback if WebGL fails or FPS < 30 for 3s.
 *  - URL param (?avatar=3d|2d) & keyboard shortcut ('3') support.
 */

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import type { AvatarRendererProps, AvatarMode } from './AvatarTypes';
import { SkeletonAvatar } from '../player/SkeletonAvatar';
import { Box, Layers, AlertCircle } from 'lucide-react';

const LazyAvatar3D = React.lazy(() =>
  import('./Avatar3D').then((m) => ({ default: m.Avatar3D }))
);

export interface AvatarContainerProps extends AvatarRendererProps {
  onModeChange?: (mode: AvatarMode) => void;
}

export const AvatarContainer: React.FC<AvatarContainerProps> = ({
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
  onModeChange,
}) => {
  // Read initial preference from URL param or localStorage (default: 2d)
  const [mode, setMode] = useState<AvatarMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlAvatar = params.get('avatar');
      if (urlAvatar === '3d' || urlAvatar === '2d') return urlAvatar;

      const stored = localStorage.getItem('signbridge_avatar_mode');
      if (stored === '3d' || stored === '2d') return stored;
    }
    return '2d';
  });

  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  const handleSetMode = useCallback((newMode: AvatarMode) => {
    setMode(newMode);
    localStorage.setItem('signbridge_avatar_mode', newMode);
    onModeChange?.(newMode);
  }, [onModeChange]);

  const handleFallback = useCallback((reason: string) => {
    console.warn('[AvatarContainer] Triggering fallback to 2D:', reason);
    setMode('2d');
    localStorage.setItem('signbridge_avatar_mode', '2d');
    setFallbackNotice(reason);
    onModeChange?.('2d');
  }, [onModeChange]);

  // Keyboard shortcut: Press '3' to toggle 2D/3D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === '3') {
        e.preventDefault();
        handleSetMode(mode === '2d' ? '3d' : '2d');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, handleSetMode]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Active Avatar Renderer */}
      {mode === '3d' ? (
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-400 text-xs">
              Loading 3D Mannequin...
            </div>
          }
        >
          <LazyAvatar3D
            frame={frame}
            isIdle={isIdle}
            mirrored={mirrored}
            highContrast={highContrast}
            isQuestion={isQuestion}
            questionType={questionType}
            badge={badge}
            cameraPreset={cameraPreset}
            onFpsUpdate={onFpsUpdate}
            onFallback={handleFallback}
            className="w-full h-full"
          />
        </Suspense>
      ) : (
        <SkeletonAvatar
          frame={frame}
          isIdle={isIdle}
          mirrored={mirrored}
          highContrast={highContrast}
          isQuestion={isQuestion}
          questionType={questionType}
          badge={badge}
          className="w-full h-full"
        />
      )}

      {/* Top Center: 2D/3D Toggle Pill */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 flex items-center bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-lg z-20">
        <button
          onClick={() => handleSetMode('2d')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            mode === '2d'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="2D Canvas Skeleton View [3]"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>2D Skeleton</span>
        </button>
        <button
          onClick={() => handleSetMode('3d')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            mode === '3d'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="3D Mannequin View [3]"
        >
          <Box className="w-3.5 h-3.5" />
          <span>3D Mannequin</span>
        </button>
      </div>

      {/* Fallback Toast Notification */}
      {fallbackNotice && (
        <div className="absolute bottom-3 inset-x-4 p-3 rounded-xl bg-amber-950/90 border border-amber-800 text-amber-200 text-xs flex items-center justify-between shadow-xl z-30 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{fallbackNotice}</span>
          </div>
          <button
            onClick={() => setFallbackNotice(null)}
            className="px-2 py-0.5 rounded bg-amber-900/80 hover:bg-amber-800 text-amber-100 text-[11px] font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
