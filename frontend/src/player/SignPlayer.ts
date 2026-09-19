/**
 * SignPlayer — Pure-TypeScript state machine for ASL sign playback.
 *
 * Design principles:
 *  - No DOM / rAF dependencies. The caller (useSignPlayer hook) drives the RAF loop
 *    and calls tick(timestamp) on every animation frame.
 *  - Each tick() returns the current SignFrame to render plus metadata.
 *  - Supports queue, play/pause/resume/clear, variable speed (0.5×–1.5×), and
 *    ~150 ms ease blending between clips and back to the rest pose.
 *  - Emits onTokenStart / onTokenEnd / onIdle callbacks.
 */

import type { SignFrame, SignClip } from '../lib/clipTypes';
import { lerpFrames } from './lerpFrames';
import { REST_POSE } from './restPose';

// ─── Public Types ─────────────────────────────────────────────────────────────

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'blending';

/**
 * A resolved clip ready to be played.
 * Multiple ClipQueueItems may share the same tokenIndex (fingerspell letters).
 */
export interface ClipQueueItem {
  clipId: string;
  clip: SignClip;
  /** Index in the original GlossToken array. */
  tokenIndex: number;
  /** Human-readable gloss for this item (e.g. "DOCTOR" or "FS:J"). */
  gloss: string;
  /** True when this item is the first clip for its tokenIndex. */
  isTokenStart: boolean;
  /** True when this item is the last clip for its tokenIndex. */
  isTokenEnd: boolean;
}

export interface SignPlayerCallbacks {
  onTokenStart?: (gloss: string, tokenIndex: number) => void;
  onTokenEnd?: (gloss: string, tokenIndex: number) => void;
  onIdle?: () => void;
}

export interface PlayerTickResult {
  frame: SignFrame;
  status: PlayerStatus;
  /** tokenIndex of the currently-playing token, or -1 when idle. */
  currentTokenIndex: number;
  currentGloss: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BLEND_DURATION_MS = 100;
const MIN_SPEED = 0.5;
const MAX_SPEED = 1.5;

// ─── SignPlayer ────────────────────────────────────────────────────────────────

export class SignPlayer {
  // Queue
  private queue: ClipQueueItem[] = [];
  private queueHead = 0;

  // Playback state
  private _status: PlayerStatus = 'idle';
  private _speed = 1.0;
  private clipStartTime = 0;
  private lastKnownTimestamp = 0;
  private pausedFrameIdx = 0;

  // Blending state
  private blendStartTime = 0;
  private blendFromFrame: SignFrame = REST_POSE;
  private blendToFrame: SignFrame = REST_POSE;
  private blendTarget: 'next' | 'rest' = 'rest';

  // Current rendered frame
  private _currentFrame: SignFrame = REST_POSE;

  // Callback dedup guards
  private lastTokenStartEmit = -1;
  private lastTokenEndEmit = -1;

  private callbacks: SignPlayerCallbacks;

  constructor(callbacks: SignPlayerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  get status(): PlayerStatus {
    return this._status;
  }

  get speed(): number {
    return this._speed;
  }

  get currentFrame(): SignFrame {
    return this._currentFrame;
  }

  get queueLength(): number {
    return Math.max(0, this.queue.length - this.queueHead);
  }

  /** Add clips to the end of the queue and auto-start if idle. */
  enqueue(items: ClipQueueItem[], timestamp?: number): void {
    this.queue.push(...items);
    if (this._status === 'idle' && this.queue.length > this.queueHead) {
      this.startCurrentClip(timestamp ?? performance.now());
    }
  }

  /** Stop playback, empty the queue, and return to rest pose. */
  clear(): void {
    this.queue = [];
    this.queueHead = 0;
    this._status = 'idle';
    this._currentFrame = REST_POSE;
    this.lastTokenStartEmit = -1;
    this.lastTokenEndEmit = -1;
    this.callbacks.onIdle?.();
  }

  /** Resume from paused state. */
  play(timestamp: number = performance.now()): void {
    if (this._status === 'paused') {
      // Re-anchor clip start time so playback resumes at the correct frame.
      const item = this.queue[this.queueHead];
      if (item) {
        const msPerFrame = 1000 / (item.clip.fps * this._speed);
        this.clipStartTime = timestamp - this.pausedFrameIdx * msPerFrame;
      }
      this._status = 'playing';
    } else if (this._status === 'idle' && this.queueLength > 0) {
      this.startCurrentClip(timestamp);
    }
  }

  /** Freeze the current frame. */
  pause(): void {
    if (this._status === 'playing') {
      const item = this.queue[this.queueHead];
      if (item) {
        const msPerFrame = 1000 / (item.clip.fps * this._speed);
        const elapsed = this.lastKnownTimestamp - this.clipStartTime;
        this.pausedFrameIdx = Math.min(
          Math.floor(elapsed / msPerFrame),
          item.clip.frames.length - 1
        );
      }
      this._status = 'paused';
    }
  }

  /** Clamp speed to [0.5, 1.5]. */
  setSpeed(speed: number): void {
    this._speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed));
  }

  /**
   * Advance the player by one RAF tick.
   * Returns the frame to render for this tick.
   */
  tick(timestamp: number): PlayerTickResult {
    this.lastKnownTimestamp = timestamp;

    if (this._status === 'idle' || this._status === 'paused') {
      return this.buildResult();
    }

    if (this._status === 'blending') {
      this._currentFrame = this.tickBlending(timestamp);
    } else if (this._status === 'playing') {
      this.tickPlaying(timestamp);
    }

    return this.buildResult();
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private tickPlaying(timestamp: number): void {
    const item = this.queue[this.queueHead];
    if (!item) {
      this.transitionToRest(timestamp);
      return;
    }

    const msPerFrame = 1000 / (item.clip.fps * this._speed);
    const elapsed = timestamp - this.clipStartTime;
    const frameIdx = Math.floor(elapsed / msPerFrame);

    // Emit onTokenStart (once per token)
    if (item.isTokenStart && this.lastTokenStartEmit !== item.tokenIndex) {
      this.lastTokenStartEmit = item.tokenIndex;
      this.callbacks.onTokenStart?.(item.gloss, item.tokenIndex);
    }

    if (frameIdx >= item.clip.frames.length) {
      // Clip finished
      const lastFrame = item.clip.frames[item.clip.frames.length - 1];
      this._currentFrame = lastFrame;
      this.pausedFrameIdx = item.clip.frames.length - 1;

      // Emit onTokenEnd when the last clip for this token finishes
      if (item.isTokenEnd && this.lastTokenEndEmit !== item.tokenIndex) {
        this.lastTokenEndEmit = item.tokenIndex;
        this.callbacks.onTokenEnd?.(item.gloss, item.tokenIndex);
      }

      this.queueHead++;

      if (this.queueHead < this.queue.length) {
        const nextItem = this.queue[this.queueHead];
        this.startBlend(timestamp, lastFrame, nextItem.clip.frames[0], 'next');
      } else {
        this.transitionToRest(timestamp);
      }
    } else {
      this.pausedFrameIdx = frameIdx;
      this._currentFrame = item.clip.frames[frameIdx];
    }
  }

  private tickBlending(timestamp: number): SignFrame {
    const elapsed = timestamp - this.blendStartTime;
    const t = Math.min(1.0, elapsed / BLEND_DURATION_MS);
    const easeT = t * t * (3 - 2 * t);
    const blended = lerpFrames(this.blendFromFrame, this.blendToFrame, easeT);

    if (t >= 1.0) {
      if (this.blendTarget === 'next') {
        this.startCurrentClip(timestamp);
      } else {
        this._status = 'idle';
        this.callbacks.onIdle?.();
      }
    }

    return blended;
  }

  private startBlend(
    timestamp: number,
    from: SignFrame,
    to: SignFrame,
    target: 'next' | 'rest'
  ): void {
    this.blendStartTime = timestamp;
    this.blendFromFrame = from;
    this.blendToFrame = to;
    this.blendTarget = target;
    this._status = 'blending';
  }

  private transitionToRest(timestamp: number): void {
    this.startBlend(timestamp, this._currentFrame, REST_POSE, 'rest');
  }

  private startCurrentClip(timestamp: number): void {
    if (this.queueHead >= this.queue.length) {
      this._status = 'idle';
      this._currentFrame = REST_POSE;
      this.callbacks.onIdle?.();
      return;
    }
    this.clipStartTime = timestamp;
    this.pausedFrameIdx = 0;
    this._status = 'playing';
    this._currentFrame = this.queue[this.queueHead].clip.frames[0];
  }

  private buildResult(): PlayerTickResult {
    const item =
      this.queueHead < this.queue.length ? this.queue[this.queueHead] : null;
    const f = this._currentFrame ?? REST_POSE;
    const frameCopy: SignFrame = {
      pose: f.pose ?? REST_POSE.pose,
      left_hand: f.left_hand ?? null,
      right_hand: f.right_hand ?? null,
    };
    return {
      frame: frameCopy,
      status: this._status,
      currentTokenIndex: item?.tokenIndex ?? -1,
      currentGloss: item?.gloss ?? null,
    };
  }
}
