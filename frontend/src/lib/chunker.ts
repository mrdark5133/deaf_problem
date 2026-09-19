/**
 * Chunker — decides when to fire a translation request.
 *
 * Trigger conditions (first match wins for a given piece of text):
 *  1. `final` event   — always emit immediately.
 *  2. Interim ≥ earlyWordCount (default 6) — emit early, don't re-emit same text.
 *  3. Interim stable for stableMs (default 800) — emit if still unsent.
 *
 * Deduplication: a text that was already emitted is not re-emitted unless
 * a newer `final` carries different text.
 */

import type { TextEvent } from '../speech/types';

export interface ChunkEvent {
  text: string;
  /** Monotonically increasing per Chunker instance. Used for ordering guard. */
  seq: number;
  isFinal: boolean;
  sentAt: number; // performance.now() at emission time
}

export type ChunkCallback = (chunk: ChunkEvent) => void;

export class Chunker {
  private nextSeq = 1;
  private lastSentText = '';
  private lastInterimText = '';
  private stableTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly onChunk: ChunkCallback;
  private readonly stableMs: number;
  private readonly earlyWordCount: number;

  constructor(
    onChunk: ChunkCallback,
    stableMs: number = 800,
    earlyWordCount: number = 6
  ) {
    this.onChunk = onChunk;
    this.stableMs = stableMs;
    this.earlyWordCount = earlyWordCount;
  }

  /** Feed a TextEvent into the chunker. */
  feed(event: TextEvent): void {
    const text = event.text.trim();
    if (!text) return;

    if (event.type === 'final') {
      this.clearStableTimer();
      this.lastInterimText = '';
      // Always emit finals (even if same as last sent — signer may have repeated)
      this.emit(text, true);
    } else {
      // interim
      if (text === this.lastInterimText) return; // no change, skip
      this.lastInterimText = text;

      // Early emission when interim reaches the word threshold
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      if (wordCount >= this.earlyWordCount && text !== this.lastSentText) {
        this.clearStableTimer();
        this.emit(text, false);
        return;
      }

      // Stable-interim timer: emit if unchanged after stableMs
      this.clearStableTimer();
      this.stableTimer = setTimeout(() => {
        if (this.lastInterimText === text && text !== this.lastSentText) {
          this.emit(text, false);
        }
      }, this.stableMs);
    }
  }

  /** Reset state (e.g., on session start or mic off). */
  reset(): void {
    this.clearStableTimer();
    this.lastSentText = '';
    this.lastInterimText = '';
  }

  /** Current seq counter value (next seq that will be assigned). */
  get currentSeq(): number {
    return this.nextSeq;
  }

  private emit(text: string, isFinal: boolean): void {
    const seq = this.nextSeq++;
    this.lastSentText = text;
    this.onChunk({ text, seq, isFinal, sentAt: performance.now() });
  }

  private clearStableTimer(): void {
    if (this.stableTimer !== null) {
      clearTimeout(this.stableTimer);
      this.stableTimer = null;
    }
  }
}
