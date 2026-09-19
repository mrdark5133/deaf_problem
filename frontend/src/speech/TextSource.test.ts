import { describe, it, expect, vi } from 'vitest';
import { TextSource } from './TextSource';
import type { TextEvent } from './types';

describe('TextSource', () => {
  it('emits typed input events to subscribers', () => {
    const textSource = new TextSource();
    const listener = vi.fn();

    const unsubscribe = textSource.subscribe(listener);

    const event = textSource.emitTyped('Hello doctor');

    expect(event).not.toBeNull();
    expect(event?.text).toBe('Hello doctor');
    expect(event?.type).toBe('final');
    expect(event?.source).toBe('typed');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(event);

    unsubscribe();
    textSource.emitTyped('Another sentence');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('ignores empty or whitespace-only typed inputs', () => {
    const textSource = new TextSource();
    const listener = vi.fn();
    textSource.subscribe(listener);

    const event = textSource.emitTyped('   ');
    expect(event).toBeNull();
    expect(listener).not.toHaveBeenCalled();
  });

  it('emits interim and final speech events in correct order', () => {
    const textSource = new TextSource();
    const events: TextEvent[] = [];
    textSource.subscribe((evt) => events.push(evt));

    textSource.emitInterimSpeech('Where is');
    textSource.emitInterimSpeech('Where is the doctor');
    textSource.emitFinalSpeech('Where is the doctor?');

    expect(events.length).toBe(3);
    expect(events[0].type).toBe('interim');
    expect(events[0].text).toBe('Where is');
    expect(events[1].type).toBe('interim');
    expect(events[1].text).toBe('Where is the doctor');
    expect(events[2].type).toBe('final');
    expect(events[2].text).toBe('Where is the doctor?');
  });
});
