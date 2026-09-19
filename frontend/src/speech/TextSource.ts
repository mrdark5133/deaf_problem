/**
 * TextSource abstraction.
 * Unifies speech recognition streams and typed inputs into a single observable event stream.
 */

import type { TextEvent } from './types';

export type TextEventListener = (event: TextEvent) => void;

export class TextSource {
  private listeners: Set<TextEventListener> = new Set();
  private eventCounter: number = 0;

  public subscribe(listener: TextEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public emit(type: 'interim' | 'final', text: string, source: 'speech' | 'typed'): TextEvent {
    this.eventCounter += 1;
    const event: TextEvent = {
      id: `evt-${Date.now()}-${this.eventCounter}`,
      type,
      text: text.trim(),
      timestamp: Date.now(),
      source,
    };

    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in TextSource listener:', err);
      }
    });

    return event;
  }

  public emitTyped(text: string): TextEvent | null {
    const trimmed = text.trim();
    if (!trimmed) return null;
    return this.emit('final', trimmed, 'typed');
  }

  public emitInterimSpeech(text: string): TextEvent {
    return this.emit('interim', text, 'speech');
  }

  public emitFinalSpeech(text: string): TextEvent {
    return this.emit('final', text, 'speech');
  }
}

export const globalTextSource = new TextSource();
