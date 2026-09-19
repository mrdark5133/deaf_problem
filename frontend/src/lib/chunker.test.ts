/**
 * Chunker unit tests.
 * Uses vitest fake timers to control the stable-interim 800 ms window.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Chunker } from './chunker';
import type { ChunkEvent } from './chunker';
import type { TextEvent } from '../speech/types';

function makeEvent(type: 'interim' | 'final', text: string): TextEvent {
  return { type, text, timestamp: Date.now(), source: 'speech', id: `evt-${Math.random()}` };
}

describe('Chunker', () => {
  let onChunk: ReturnType<typeof vi.fn<(chunk: ChunkEvent) => void>>;
  let chunker: Chunker;

  beforeEach(() => {
    vi.useFakeTimers();
    onChunk = vi.fn();
    chunker = new Chunker(onChunk, 800, 6);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Final events ─────────────────────────────────────────────────────────

  it('emits immediately on final event', () => {
    chunker.feed(makeEvent('final', 'Where is the doctor?'));
    expect(onChunk).toHaveBeenCalledTimes(1);
    const chunk = onChunk.mock.calls[0][0] as ChunkEvent;
    expect(chunk.text).toBe('Where is the doctor?');
    expect(chunk.isFinal).toBe(true);
    expect(chunk.seq).toBe(1);
  });

  it('assigns monotonically increasing seq numbers', () => {
    chunker.feed(makeEvent('final', 'Hello world'));
    chunker.feed(makeEvent('final', 'How are you'));
    chunker.feed(makeEvent('final', 'I need help'));
    const seqs = (onChunk.mock.calls as ChunkEvent[][]).map((c) => c[0].seq);
    expect(seqs).toEqual([1, 2, 3]);
  });

  it('emits repeat final even if text is identical to last sent', () => {
    chunker.feed(makeEvent('final', 'Help'));
    chunker.feed(makeEvent('final', 'Help'));
    // Finals always emit
    expect(onChunk).toHaveBeenCalledTimes(2);
  });

  // ── Interim: stable timer ─────────────────────────────────────────────────

  it('does not emit interim before stable timeout', () => {
    chunker.feed(makeEvent('interim', 'I need some water'));
    vi.advanceTimersByTime(500);
    expect(onChunk).not.toHaveBeenCalled();
  });

  it('emits interim after stable timeout (800 ms)', () => {
    chunker.feed(makeEvent('interim', 'I need some water'));
    vi.advanceTimersByTime(800);
    expect(onChunk).toHaveBeenCalledTimes(1);
    const chunk = onChunk.mock.calls[0][0] as ChunkEvent;
    expect(chunk.text).toBe('I need some water');
    expect(chunk.isFinal).toBe(false);
  });

  it('resets stable timer when interim text changes', () => {
    chunker.feed(makeEvent('interim', 'I need'));
    vi.advanceTimersByTime(600);
    chunker.feed(makeEvent('interim', 'I need some')); // timer resets
    vi.advanceTimersByTime(600);
    expect(onChunk).not.toHaveBeenCalled(); // not yet 800ms from last update
    vi.advanceTimersByTime(200);
    expect(onChunk).toHaveBeenCalledTimes(1);
  });

  it('does not re-emit same interim text that was already sent', () => {
    chunker.feed(makeEvent('interim', 'I need some water'));
    vi.advanceTimersByTime(800); // emits
    expect(onChunk).toHaveBeenCalledTimes(1);

    // Feed same text again as interim
    chunker.feed(makeEvent('interim', 'I need some water'));
    vi.advanceTimersByTime(800);
    // Should NOT emit again (lastSentText guard)
    expect(onChunk).toHaveBeenCalledTimes(1);
  });

  // ── Interim: early word count ─────────────────────────────────────────────

  it('emits early when interim reaches earlyWordCount (6)', () => {
    chunker.feed(makeEvent('interim', 'one two three four five six'));
    // Should emit immediately without waiting for timer
    expect(onChunk).toHaveBeenCalledTimes(1);
    const chunk = onChunk.mock.calls[0][0] as ChunkEvent;
    expect(chunk.text).toBe('one two three four five six');
    expect(chunk.isFinal).toBe(false);
  });

  it('does not emit early for fewer than earlyWordCount words', () => {
    chunker.feed(makeEvent('interim', 'one two three four five'));
    expect(onChunk).not.toHaveBeenCalled(); // 5 words < 6 threshold
  });

  it('cancels stable timer when early emission fires', () => {
    chunker.feed(makeEvent('interim', 'one two three'));
    chunker.feed(makeEvent('interim', 'one two three four five six')); // early emit
    vi.advanceTimersByTime(800); // no additional emit from earlier timer
    expect(onChunk).toHaveBeenCalledTimes(1);
  });

  // ── Final cancels interim timer ────────────────────────────────────────────

  it('final event cancels pending stable interim timer', () => {
    chunker.feed(makeEvent('interim', 'some interim text'));
    vi.advanceTimersByTime(400);
    chunker.feed(makeEvent('final', 'some final text'));
    vi.advanceTimersByTime(800);
    // Only 1 emission (the final), not 2
    expect(onChunk).toHaveBeenCalledTimes(1);
    expect((onChunk.mock.calls[0][0] as ChunkEvent).isFinal).toBe(true);
  });

  // ── Reset ─────────────────────────────────────────────────────────────────

  it('reset clears lastSentText so same text can be sent again', () => {
    chunker.feed(makeEvent('interim', 'Hello world'));
    vi.advanceTimersByTime(800); // emit
    expect(onChunk).toHaveBeenCalledTimes(1);

    chunker.reset();

    chunker.feed(makeEvent('interim', 'Hello world'));
    vi.advanceTimersByTime(800); // should emit again after reset
    expect(onChunk).toHaveBeenCalledTimes(2);
  });

  it('reset cancels pending stable timer', () => {
    chunker.feed(makeEvent('interim', 'pending text'));
    chunker.reset();
    vi.advanceTimersByTime(800);
    expect(onChunk).not.toHaveBeenCalled();
  });

  // ── Ignored inputs ────────────────────────────────────────────────────────

  it('ignores empty text events', () => {
    chunker.feed(makeEvent('final', ''));
    chunker.feed(makeEvent('interim', '   '));
    vi.advanceTimersByTime(800);
    expect(onChunk).not.toHaveBeenCalled();
  });

  it('deduplicates identical consecutive interim events', () => {
    chunker.feed(makeEvent('interim', 'same text'));
    chunker.feed(makeEvent('interim', 'same text'));
    chunker.feed(makeEvent('interim', 'same text'));
    vi.advanceTimersByTime(800);
    expect(onChunk).toHaveBeenCalledTimes(1);
  });
});
