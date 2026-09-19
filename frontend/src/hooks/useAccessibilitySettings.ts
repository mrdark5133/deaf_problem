import { useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'dark' | 'light' | 'high-contrast';
export type CaptionFontSize = 'sm' | 'base' | 'lg' | 'xl';
export type AvatarSize = 'normal' | 'large';

export interface AccessibilitySettings {
  theme: ThemeMode;
  captionFontSize: CaptionFontSize;
  avatarSize: AvatarSize;
  avatarMirrored: boolean;
  playbackSpeed: number;
  reducedMotion: boolean;
  hasSeenOnboarding: boolean;
}

const STORAGE_KEY = 'signbridge_a11y_settings';

export const DEFAULT_SETTINGS: AccessibilitySettings = {
  theme: 'dark',
  captionFontSize: 'base',
  avatarSize: 'normal',
  avatarMirrored: false,
  playbackSpeed: 1.0,
  reducedMotion: false,
  hasSeenOnboarding: false,
};

export function getStoredSettings(): AccessibilitySettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_SETTINGS;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Check system reduced motion
      const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
      return { ...DEFAULT_SETTINGS, reducedMotion: prefersReduced };
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      playbackSpeed: typeof parsed.playbackSpeed === 'number'
        ? Math.min(1.5, Math.max(0.5, parsed.playbackSpeed))
        : 1.0,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: AccessibilitySettings): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage quota or privacy restriction
  }
}

export function useAccessibilitySettings() {
  const [settings, setSettings] = useState<AccessibilitySettings>(getStoredSettings);

  // Sync settings changes to localStorage and apply theme classes to HTML document
  useEffect(() => {
    saveStoredSettings(settings);

    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-light', 'theme-high-contrast');
    root.classList.add(`theme-${settings.theme}`);
    root.setAttribute('data-theme', settings.theme);

    if (settings.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }, [settings]);

  const updateSetting = useCallback(<K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setTheme = useCallback((theme: ThemeMode) => updateSetting('theme', theme), [updateSetting]);
  const setCaptionFontSize = useCallback((size: CaptionFontSize) => updateSetting('captionFontSize', size), [updateSetting]);
  const setAvatarSize = useCallback((size: AvatarSize) => updateSetting('avatarSize', size), [updateSetting]);
  const setAvatarMirrored = useCallback((mirrored: boolean) => updateSetting('avatarMirrored', mirrored), [updateSetting]);
  const toggleAvatarMirrored = useCallback(() => setSettings((s) => ({ ...s, avatarMirrored: !s.avatarMirrored })), []);
  const setPlaybackSpeed = useCallback((speed: number) => {
    const clamped = Math.min(1.5, Math.max(0.5, Number(speed.toFixed(2))));
    updateSetting('playbackSpeed', clamped);
  }, [updateSetting]);
  const setReducedMotion = useCallback((reduced: boolean) => updateSetting('reducedMotion', reduced), [updateSetting]);
  const dismissOnboarding = useCallback(() => updateSetting('hasSeenOnboarding', true), [updateSetting]);
  const resetOnboarding = useCallback(() => updateSetting('hasSeenOnboarding', false), [updateSetting]);
  const resetToDefaults = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  // Caption font class mapping
  const captionFontSizeClasses: Record<CaptionFontSize, string> = {
    sm: 'text-sm leading-relaxed',
    base: 'text-base leading-relaxed',
    lg: 'text-lg sm:text-xl leading-relaxed',
    xl: 'text-xl sm:text-2xl leading-relaxed font-medium',
  };

  return {
    settings,
    setTheme,
    setCaptionFontSize,
    setAvatarSize,
    setAvatarMirrored,
    toggleAvatarMirrored,
    setPlaybackSpeed,
    setReducedMotion,
    dismissOnboarding,
    resetOnboarding,
    resetToDefaults,
    captionFontClass: captionFontSizeClasses[settings.captionFontSize],
  };
}
