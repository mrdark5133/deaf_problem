import React, { useEffect, useRef } from 'react';
import { X, RotateCcw, Sliders } from 'lucide-react';
import type {
  ThemeMode,
  CaptionFontSize,
  AvatarSize,
  AccessibilitySettings,
} from '../hooks/useAccessibilitySettings';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AccessibilitySettings;
  onSetTheme: (theme: ThemeMode) => void;
  onSetCaptionFontSize: (size: CaptionFontSize) => void;
  onSetAvatarSize: (size: AvatarSize) => void;
  onSetAvatarMirrored: (mirrored: boolean) => void;
  onSetPlaybackSpeed: (speed: number) => void;
  onSetReducedMotion: (reduced: boolean) => void;
  onResetDefaults: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSetTheme,
  onSetCaptionFontSize,
  onSetAvatarSize,
  onSetAvatarMirrored,
  onSetPlaybackSpeed,
  onSetReducedMotion,
  onResetDefaults,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-mono"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-white border border-neutral-300 text-neutral-900 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-neutral-800" />
            <h2 id="settings-modal-title" className="text-sm font-bold tracking-wider text-neutral-900 uppercase">
              PREFERENCES & ACCESSIBILITY
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-900 rounded transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar text-xs">
          {/* Theme selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block">
              // DISPLAY THEME
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onSetTheme('light')}
                className={`p-2.5 rounded border text-center font-semibold transition-colors cursor-pointer ${
                  settings.theme === 'light'
                    ? 'bg-black border-black text-white'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:border-neutral-400'
                }`}
              >
                LIGHT (MONO)
              </button>
              <button
                type="button"
                onClick={() => onSetTheme('dark')}
                className={`p-2.5 rounded border text-center font-semibold transition-colors cursor-pointer ${
                  settings.theme === 'dark'
                    ? 'bg-black border-black text-white'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:border-neutral-400'
                }`}
              >
                DARK
              </button>
              <button
                type="button"
                onClick={() => onSetTheme('high-contrast')}
                className={`p-2.5 rounded border text-center font-semibold transition-colors cursor-pointer ${
                  settings.theme === 'high-contrast'
                    ? 'bg-black border-black text-yellow-300 font-bold'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:border-neutral-400'
                }`}
              >
                HIGH CONTRAST
              </button>
            </div>
          </div>

          {/* Caption font size */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block">
              // CAPTION FONT SIZE
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['sm', 'base', 'lg', 'xl'] as CaptionFontSize[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onSetCaptionFontSize(size)}
                  className={`p-2 rounded border text-center font-semibold uppercase transition-colors cursor-pointer ${
                    settings.captionFontSize === size
                      ? 'bg-black border-black text-white'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:border-neutral-400'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Avatar Size */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block">
              // AVATAR VIEWPORT WIDTH
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSetAvatarSize('normal')}
                className={`p-2 rounded border text-center font-semibold transition-colors cursor-pointer ${
                  settings.avatarSize === 'normal'
                    ? 'bg-black border-black text-white'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:border-neutral-400'
                }`}
              >
                BALANCED (60/40)
              </button>
              <button
                type="button"
                onClick={() => onSetAvatarSize('large')}
                className={`p-2 rounded border text-center font-semibold transition-colors cursor-pointer ${
                  settings.avatarSize === 'large'
                    ? 'bg-black border-black text-white'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:border-neutral-400'
                }`}
              >
                EXPANDED (67/33)
              </button>
            </div>
          </div>

          {/* Mirror Toggle */}
          <div className="flex items-center justify-between p-3 rounded border border-neutral-200 bg-neutral-50">
            <div>
              <div className="font-bold text-neutral-900">MIRROR PERSPECTIVE [M]</div>
              <div className="text-[11px] text-neutral-500">Flips avatar horizontally</div>
            </div>
            <button
              type="button"
              onClick={() => onSetAvatarMirrored(!settings.avatarMirrored)}
              className={`px-3 py-1 rounded border text-xs font-bold transition-colors cursor-pointer ${
                settings.avatarMirrored
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-neutral-700 border-neutral-300'
              }`}
            >
              {settings.avatarMirrored ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Playback Speed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                // SIGNING SPEED
              </label>
              <span className="font-bold text-neutral-900">{settings.playbackSpeed.toFixed(2)}×</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.playbackSpeed}
              onChange={(e) => onSetPlaybackSpeed(parseFloat(e.target.value))}
              className="w-full accent-black cursor-pointer"
            />
          </div>

          {/* Reduced Motion */}
          <div className="flex items-center justify-between p-3 rounded border border-neutral-200 bg-neutral-50">
            <div>
              <div className="font-bold text-neutral-900">REDUCE MOTION</div>
              <div className="text-[11px] text-neutral-500">Minimizes animated UI transitions</div>
            </div>
            <button
              type="button"
              onClick={() => onSetReducedMotion(!settings.reducedMotion)}
              className={`px-3 py-1 rounded border text-xs font-bold transition-colors cursor-pointer ${
                settings.reducedMotion
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-neutral-700 border-neutral-300'
              }`}
            >
              {settings.reducedMotion ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-200 flex items-center justify-between bg-neutral-50">
          <button
            type="button"
            onClick={onResetDefaults}
            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET DEFAULTS</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-black hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
