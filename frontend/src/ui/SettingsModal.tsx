import React, { useEffect, useRef } from 'react';
import {
  X,
  Sun,
  Moon,
  Sparkles,
  Type,
  Maximize2,
  FlipHorizontal,
  Gauge,
  RotateCcw,
  Sliders,
  Check,
} from 'lucide-react';
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

  // Close on Escape
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="text-lg font-bold text-white tracking-tight">
                Accessibility & Preferences
              </h2>
              <p className="text-xs text-slate-400">Personalize display, caption size, and signing speed</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Theme selection */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Display Theme
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => onSetTheme('dark')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  settings.theme === 'dark'
                    ? 'bg-blue-950/80 border-blue-500 text-white ring-2 ring-blue-500/30'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Moon className="w-5 h-5 mb-1.5 text-blue-400" />
                <span>Dark</span>
              </button>
              <button
                type="button"
                onClick={() => onSetTheme('light')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  settings.theme === 'light'
                    ? 'bg-amber-950/80 border-amber-500 text-white ring-2 ring-amber-500/30'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Sun className="w-5 h-5 mb-1.5 text-amber-400" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => onSetTheme('high-contrast')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  settings.theme === 'high-contrast'
                    ? 'bg-yellow-950/90 border-yellow-400 text-yellow-300 ring-2 ring-yellow-400/40 font-bold'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-5 h-5 mb-1.5 text-yellow-400" />
                <span>High Contrast</span>
              </button>
            </div>
          </div>

          {/* Caption font size */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-indigo-400" />
              Caption Font Size
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['sm', 'base', 'lg', 'xl'] as CaptionFontSize[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onSetCaptionFontSize(size)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    settings.captionFontSize === size
                      ? 'bg-indigo-950/80 border-indigo-500 text-white font-semibold ring-2 ring-indigo-500/30'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xs uppercase block text-slate-400 mb-0.5">{size}</span>
                  <span
                    className={`block ${
                      size === 'sm'
                        ? 'text-xs'
                        : size === 'base'
                        ? 'text-sm'
                        : size === 'lg'
                        ? 'text-base font-semibold'
                        : 'text-lg font-bold'
                    }`}
                  >
                    Aa
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Avatar Options */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              Avatar Orientation & Scale
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onSetAvatarMirrored(!settings.avatarMirrored)}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                  settings.avatarMirrored
                    ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200 ring-2 ring-cyan-500/30'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5 text-left">
                  <FlipHorizontal className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="text-xs font-semibold">Mirror Avatar</div>
                    <div className="text-[10px] text-slate-400">Horizontal flip</div>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                    settings.avatarMirrored
                      ? 'bg-cyan-500 border-cyan-400 text-slate-950'
                      : 'border-slate-600'
                  }`}
                >
                  {settings.avatarMirrored && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSetAvatarSize(settings.avatarSize === 'large' ? 'normal' : 'large')}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                  settings.avatarSize === 'large'
                    ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200 ring-2 ring-cyan-500/30'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5 text-left">
                  <Maximize2 className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="text-xs font-semibold">Large Avatar</div>
                    <div className="text-[10px] text-slate-400">Projector scale</div>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                    settings.avatarSize === 'large'
                      ? 'bg-cyan-500 border-cyan-400 text-slate-950'
                      : 'border-slate-600'
                  }`}
                >
                  {settings.avatarSize === 'large' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </button>
            </div>
          </div>

          {/* Signing Speed Slider */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                Signing Playback Speed
              </label>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800/60">
                {settings.playbackSpeed.toFixed(2)}×
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400 font-mono">0.5×</span>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={settings.playbackSpeed}
                onChange={(e) => onSetPlaybackSpeed(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                aria-label="Signing speed multiplier"
              />
              <span className="text-[11px] text-slate-400 font-mono">1.5×</span>
            </div>
          </div>

          {/* Reduced Motion Toggle */}
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-800/40 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-200">Reduce UI Motion</div>
              <div className="text-[11px] text-slate-400">
                Disables animated transitions (avatar signing continues normally)
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.reducedMotion}
              onClick={() => onSetReducedMotion(!settings.reducedMotion)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                settings.reducedMotion ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  settings.reducedMotion ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 flex items-center justify-between bg-slate-900/90">
          <button
            type="button"
            onClick={onResetDefaults}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-colors focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
