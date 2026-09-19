/**
 * Types for speech recognition, text source abstraction, and caption feeds.
 */

export type SpeechStatus = 'idle' | 'listening' | 'error' | 'denied' | 'unsupported';

export type SpeechErrorCode =
  | 'not-allowed'
  | 'audio-capture'
  | 'network'
  | 'no-speech'
  | 'aborted'
  | 'unknown';

export interface TextEvent {
  type: 'interim' | 'final';
  text: string;
  timestamp: number;
  source: 'speech' | 'typed';
  id: string;
}

export interface CaptionItem {
  id: string;
  text: string;
  isFinal: boolean;
  source: 'speech' | 'typed';
  timestamp: number;
}
