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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    <div className={`relative w-full h-full font-mono ${className}`}>
      {/* Active Avatar Renderer */}
      {mode === '3d' ? (
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-white text-neutral-500 text-xs">
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
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center bg-white/90 backdrop-blur-md p-0.5 rounded border border-neutral-300 shadow-sm z-20">
        <button
          onClick={() => handleSetMode('2d')}
          className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
            mode === '2d'
              ? 'bg-black text-white'
              : 'text-neutral-600 hover:text-black'
          }`}
          title="2D Canvas Skeleton View [3]"
        >
          <Layers className="w-3 h-3" />
          <span>2D Skeleton</span>
        </button>
        <button
          onClick={() => handleSetMode('3d')}
          className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
            mode === '3d'
              ? 'bg-black text-white'
              : 'text-neutral-600 hover:text-black'
          }`}
          title="3D Mannequin View [3]"
        >
          <Box className="w-3 h-3" />
          <span>3D Mannequin</span>
        </button>
      </div>

      {/* Fallback Toast Notification */}
      {fallbackNotice && (
        <div className="absolute bottom-3 inset-x-4 p-3 rounded border border-amber-300 bg-amber-50 text-amber-900 text-xs flex items-center justify-between shadow-md z-30 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>{fallbackNotice}</span>
          </div>
          <button
            onClick={() => setFallbackNotice(null)}
            className="px-2 py-0.5 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 text-[11px] font-bold cursor-pointer"
          >
            DISMISS
          </button>
        </div>
      )}
    </div>
  );
};
