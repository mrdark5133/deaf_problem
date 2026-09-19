import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  useAccessibilitySettings,
  DEFAULT_SETTINGS,
  getStoredSettings,
  saveStoredSettings,
} from './useAccessibilitySettings';

describe('useAccessibilitySettings', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  it('initializes with default settings when localStorage is empty', () => {
    const { result } = renderHook(() => useAccessibilitySettings());
    expect(result.current.settings.theme).toBe('dark');
    expect(result.current.settings.captionFontSize).toBe('base');
    expect(result.current.settings.avatarMirrored).toBe(false);
    expect(result.current.settings.playbackSpeed).toBe(1.0);
    expect(result.current.settings.hasSeenOnboarding).toBe(false);
  });

  it('updates theme and sets data-theme attribute on document root', () => {
    const { result } = renderHook(() => useAccessibilitySettings());

    act(() => {
      result.current.setTheme('high-contrast');
    });

    expect(result.current.settings.theme).toBe('high-contrast');
    expect(document.documentElement.getAttribute('data-theme')).toBe('high-contrast');
    expect(document.documentElement.classList.contains('theme-high-contrast')).toBe(true);
  });

  it('persists settings to localStorage', () => {
    const { result } = renderHook(() => useAccessibilitySettings());

    act(() => {
      result.current.setCaptionFontSize('xl');
      result.current.toggleAvatarMirrored();
      result.current.setPlaybackSpeed(1.25);
    });

    const stored = getStoredSettings();
    expect(stored.captionFontSize).toBe('xl');
    expect(stored.avatarMirrored).toBe(true);
    expect(stored.playbackSpeed).toBe(1.25);
  });

  it('clamps playback speed between 0.5x and 1.5x', () => {
    const { result } = renderHook(() => useAccessibilitySettings());

    act(() => {
      result.current.setPlaybackSpeed(3.0);
    });
    expect(result.current.settings.playbackSpeed).toBe(1.5);

    act(() => {
      result.current.setPlaybackSpeed(0.1);
    });
    expect(result.current.settings.playbackSpeed).toBe(0.5);
  });

  it('handles onboarding dismiss and reset', () => {
    const { result } = renderHook(() => useAccessibilitySettings());

    expect(result.current.settings.hasSeenOnboarding).toBe(false);

    act(() => {
      result.current.dismissOnboarding();
    });
    expect(result.current.settings.hasSeenOnboarding).toBe(true);

    act(() => {
      result.current.resetOnboarding();
    });
    expect(result.current.settings.hasSeenOnboarding).toBe(false);
  });
});
