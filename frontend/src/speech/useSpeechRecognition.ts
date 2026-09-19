/**
 * Custom React hook for Web Speech API SpeechRecognition.
 * Supports continuous capture, interim/final emission, auto-restart on timeout,
 * and robust error state mapping.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpeechErrorCode, SpeechStatus } from './types';
import { globalTextSource, TextSource } from './TextSource';

// Browser Web Speech API type definitions for TypeScript compatibility
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length: number;
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstanceLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstanceLike;

interface ExtendedWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export interface UseSpeechRecognitionOptions {
  lang?: string;
  textSource?: TextSource;
  onInterimText?: (text: string) => void;
  onFinalText?: (text: string) => void;
}

export interface UseSpeechRecognitionReturn {
  status: SpeechStatus;
  isListening: boolean;
  isSupported: boolean;
  errorMessage: string | null;
  interimText: string;
  finalText: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  clearTranscript: () => void;
}

function getSpeechRecognitionClass(): SpeechRecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const win = window as unknown as ExtendedWindow;
  return win.SpeechRecognition || win.webkitSpeechRecognition;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const {
    lang = 'en-US',
    textSource = globalTextSource,
    onInterimText,
    onFinalText,
  } = options;

  const SpeechRecognitionClass = getSpeechRecognitionClass();
  const isSupported = !!SpeechRecognitionClass;

  const [status, setStatus] = useState<SpeechStatus>(isSupported ? 'idle' : 'unsupported');
  const [errorMessage, setErrorMessage] = useState<string | null>(
    isSupported
      ? null
      : 'Web Speech API is not supported in this browser. Please use Google Chrome or Microsoft Edge.'
  );
  const [interimText, setInterimText] = useState<string>('');
  const [finalText, setFinalText] = useState<string>('');

  const recognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);
  const shouldListenRef = useRef<boolean>(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper to construct a fresh recognition instance
  const createInstance = useCallback(() => {
    const Recognition = getSpeechRecognitionClass();
    if (!Recognition) return null;

    try {
      const instance = new Recognition();
      instance.continuous = true;
      instance.interimResults = true;
      instance.lang = lang;
      instance.maxAlternatives = 1;

      instance.onstart = () => {
        setStatus('listening');
        setErrorMessage(null);
      };

      instance.onresult = (event: SpeechRecognitionEventLike) => {
        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const transcript = result[0]?.transcript || '';

          if (result.isFinal) {
            currentFinal += transcript;
          } else {
            currentInterim += transcript;
          }
        }

        if (currentInterim.trim()) {
          setInterimText(currentInterim);
          textSource.emitInterimSpeech(currentInterim);
          onInterimText?.(currentInterim);
        }

        if (currentFinal.trim()) {
          setFinalText(currentFinal);
          setInterimText('');
          textSource.emitFinalSpeech(currentFinal);
          onFinalText?.(currentFinal);
        }
      };

      instance.onerror = (event: SpeechRecognitionErrorEventLike) => {
        const err = event.error as SpeechErrorCode;
        console.warn('SpeechRecognition error:', err, event);

        if (err === 'not-allowed') {
          shouldListenRef.current = false;
          setStatus('denied');
          setErrorMessage(
            'Microphone access was denied. Please allow microphone permissions in your browser URL bar.'
          );
        } else if (err === 'no-speech') {
          // No speech detected for a few seconds; will auto-restart in onend if shouldListen is true
        } else if (err === 'audio-capture') {
          shouldListenRef.current = false;
          setStatus('error');
          setErrorMessage('No microphone detected. Please connect a microphone.');
        } else if (err === 'network') {
          shouldListenRef.current = false;
          setStatus('error');
          setErrorMessage('Network error occurred during speech recognition.');
        } else if (err !== 'aborted') {
          setStatus('error');
          setErrorMessage(`Speech recognition error: ${event.error}`);
        }
      };

      instance.onend = () => {
        // Auto-restart with fresh instance if user intended to keep listening
        if (shouldListenRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (shouldListenRef.current) {
              try {
                const fresh = createInstance();
                recognitionRef.current = fresh;
                fresh?.start();
              } catch (e) {
                console.warn('Failed to restart speech recognition:', e);
              }
            }
          }, 150);
        } else {
          setStatus('idle');
        }
      };

      return instance;
    } catch (e) {
      console.error('Failed to create SpeechRecognition instance:', e);
      return null;
    }
  }, [lang, textSource, onInterimText, onFinalText]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setStatus('unsupported');
      setErrorMessage('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    shouldListenRef.current = true;
    setErrorMessage(null);

    // Stop any existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore
      }
    }

    const instance = createInstance();
    recognitionRef.current = instance;

    if (!instance) {
      setStatus('error');
      setErrorMessage('Failed to initialize Speech Recognition.');
      return;
    }

    try {
      instance.start();
    } catch (err: unknown) {
      console.warn('SpeechRecognition start error:', err);
      const e = err as { name?: string; message?: string };
      if (e?.name === 'NotAllowedError') {
        setStatus('denied');
        setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser URL bar.');
      } else {
        setStatus('error');
        setErrorMessage(`Microphone error: ${e?.message || 'Failed to start microphone'}`);
      }
    }
  }, [isSupported, createInstance]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore
    }
    setStatus('idle');
    setInterimText('');
  }, []);

  const toggleListening = useCallback(() => {
    if (status === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  }, [status, startListening, stopListening]);

  const clearTranscript = useCallback(() => {
    setInterimText('');
    setFinalText('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
      }
      try {
        recognitionRef.current?.abort();
      } catch {
        // Ignored on cleanup
      }
    };
  }, []);

  return {
    status,
    isListening: status === 'listening',
    isSupported,
    errorMessage,
    interimText,
    finalText,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
  };
}
