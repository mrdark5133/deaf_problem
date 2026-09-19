/**
 * useSignPlayer — React hook that wires SignPlayer to a requestAnimationFrame loop.
 *
 * Usage:
 *   const { frame, status, fps, enqueue, play, pause, clear, setSpeed } = useSignPlayer({ ... });
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SignPlayer, type ClipQueueItem, type PlayerStatus } from './SignPlayer';
import type { SignPlayerCallbacks } from './SignPlayer';
import type { SignFrame } from '../lib/clipTypes';

export interface UseSignPlayerOptions {
  onTokenStart?: (gloss: string, tokenIndex: number) => void;
  onTokenEnd?: (gloss: string, tokenIndex: number) => void;
  onIdle?: () => void;
}

export interface UseSignPlayerReturn {
  frame: SignFrame;
  status: PlayerStatus;
  currentGloss: string | null;
  currentTokenIndex: number;
  /** Measured frames-per-second of the RAF loop. */
  fps: number;
  /** Number of ClipQueueItems not yet played. */
  queueLength: number;
  enqueue: (items: ClipQueueItem[], timestamp?: number) => void;
  play: () => void;
  pause: () => void;
  clear: () => void;
  setSpeed: (speed: number) => void;
  speed: number;
}

export function useSignPlayer(options: UseSignPlayerOptions = {}): UseSignPlayerReturn {
  const callbacksRef = useRef<SignPlayerCallbacks>({});
  callbacksRef.current = {
    onTokenStart: options.onTokenStart,
    onTokenEnd: options.onTokenEnd,
    onIdle: options.onIdle,
  };

  // Stable SignPlayer instance
  const player = useMemo(
    () =>
      new SignPlayer({
        onTokenStart: (g, i) => callbacksRef.current.onTokenStart?.(g, i),
        onTokenEnd: (g, i) => callbacksRef.current.onTokenEnd?.(g, i),
        onIdle: () => callbacksRef.current.onIdle?.(),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [frame, setFrame] = useState<SignFrame>(player.currentFrame);
  const [status, setStatus] = useState<PlayerStatus>(player.status);
  const [currentGloss, setCurrentGloss] = useState<string | null>(null);
  const [currentTokenIndex, setCurrentTokenIndex] = useState<number>(-1);
  const [fps, setFps] = useState<number>(0);
  const [speed, setSpeedState] = useState<number>(1.0);
  const [queueLength, setQueueLength] = useState<number>(0);

  // FPS measurement state
  const fpsFrameCount = useRef(0);
  const fpsLastTime = useRef(0);
  const rafId = useRef<number | null>(null);

  // RAF loop
  useEffect(() => {
    const loop = (timestamp: number) => {
      const result = player.tick(timestamp);
      setFrame(result.frame);
      setStatus(result.status);
      setCurrentGloss(result.currentGloss);
      setCurrentTokenIndex(result.currentTokenIndex);
      setQueueLength(player.queueLength);

      // FPS measurement (update every second)
      fpsFrameCount.current++;
      if (timestamp - fpsLastTime.current >= 1000) {
        setFps(Math.round((fpsFrameCount.current * 1000) / (timestamp - fpsLastTime.current)));
        fpsFrameCount.current = 0;
        fpsLastTime.current = timestamp;
      }

      rafId.current = requestAnimationFrame(loop);
    };

    fpsLastTime.current = performance.now();
    rafId.current = requestAnimationFrame(loop);
    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, [player]);

  const enqueue = useCallback(
    (items: ClipQueueItem[], timestamp?: number) => player.enqueue(items, timestamp),
    [player]
  );

  const play = useCallback(() => player.play(), [player]);
  const pause = useCallback(() => player.pause(), [player]);
  const clear = useCallback(() => player.clear(), [player]);

  const setSpeed = useCallback(
    (s: number) => {
      player.setSpeed(s);
      setSpeedState(player.speed);
    },
    [player]
  );

  return {
    frame,
    status,
    currentGloss,
    currentTokenIndex,
    fps,
    queueLength,
    enqueue,
    play,
    pause,
    clear,
    setSpeed,
    speed,
  };
}
