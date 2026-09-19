import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSpeechRecognition } from './useSpeechRecognition';
import { TextSource } from './TextSource';

class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = 'en-US';
  maxAlternatives = 1;

  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onresult: ((event: unknown) => void) | null = null;

  static lastInstance: MockSpeechRecognition | null = null;

  constructor() {
    MockSpeechRecognition.lastInstance = this;
  }

  start = vi.fn(() => {
    this.onstart?.();
  });
  stop = vi.fn(() => {
    this.onend?.();
  });
  abort = vi.fn(() => {
    this.onend?.();
  });
}

describe('useSpeechRecognition', () => {
  let originalSpeechRecognition: unknown;

  beforeEach(() => {
    originalSpeechRecognition = (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = MockSpeechRecognition;
    MockSpeechRecognition.lastInstance = null;
  });

  afterEach(() => {
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = originalSpeechRecognition;
    vi.clearAllMocks();
  });

  it('initializes with supported status and starts listening', () => {
    const textSource = new TextSource();
    const { result } = renderHook(() => useSpeechRecognition({ textSource }));

    expect(result.current.isSupported).toBe(true);
    expect(result.current.status).toBe('idle');
    expect(result.current.isListening).toBe(false);

    act(() => {
      result.current.startListening();
    });

    expect(result.current.status).toBe('listening');
    expect(result.current.isListening).toBe(true);
  });

  it('handles interim and final speech recognition events', () => {
    const textSource = new TextSource();
    const onInterimText = vi.fn();
    const onFinalText = vi.fn();

    const { result } = renderHook(() =>
      useSpeechRecognition({
        textSource,
        onInterimText,
        onFinalText,
      })
    );

    act(() => {
      result.current.startListening();
    });

    const instance = MockSpeechRecognition.lastInstance;
    expect(instance).not.toBeNull();

    // Trigger interim result
    act(() => {
      instance?.onresult?.({
        resultIndex: 0,
        results: [
          {
            isFinal: false,
            length: 1,
            0: { transcript: 'Where is', confidence: 0.9 },
          },
        ],
      });
    });

    expect(result.current.interimText).toBe('Where is');
    expect(onInterimText).toHaveBeenCalledWith('Where is');

    // Trigger final result
    act(() => {
      instance?.onresult?.({
        resultIndex: 0,
        results: [
          {
            isFinal: true,
            length: 1,
            0: { transcript: 'Where is doctor?', confidence: 0.95 },
          },
        ],
      });
    });

    expect(result.current.finalText).toBe('Where is doctor?');
    expect(result.current.interimText).toBe('');
    expect(onFinalText).toHaveBeenCalledWith('Where is doctor?');
  });

  it('handles permission denied error (not-allowed)', () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.startListening();
    });

    const instance = MockSpeechRecognition.lastInstance;
    expect(instance).not.toBeNull();

    act(() => {
      instance?.onerror?.({ error: 'not-allowed' });
    });

    expect(result.current.status).toBe('denied');
    expect(result.current.errorMessage).toContain('Microphone access was denied');
  });

  it('gracefully marks unsupported browser when SpeechRecognition is missing', () => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

    const { result } = renderHook(() => useSpeechRecognition());

    expect(result.current.isSupported).toBe(false);
    expect(result.current.status).toBe('unsupported');
    expect(result.current.errorMessage).toContain('not supported in this browser');
  });
});
