/**
 * SignBridge Backend API Client.
 * Supports seq passthrough, 3 s timeout, and one automatic retry on transient errors.
 */

import type { HealthResponse, TranslateRequest, TranslateResponse } from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const TRANSLATE_TIMEOUT_MS = 3000;

export class ApiError extends Error {
  public status?: number;
  public data?: unknown;

  constructor(
    message: string,
    status?: number,
    data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function checkHealth(): Promise<HealthResponse> {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new ApiError(`Health check failed with HTTP ${res.status}`, res.status);
    }
    return (await res.json()) as HealthResponse;
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err instanceof Error ? err.message : 'Network error reaching backend');
  }
}

/**
 * POST /api/translate with AbortController timeout and one retry on transient failure.
 * @param req    Translation request (include seq for ordering guard).
 * @param signal Optional external AbortSignal (cancel stale requests).
 */
export async function translateText(
  req: TranslateRequest,
  signal?: AbortSignal
): Promise<TranslateResponse> {
  return attemptTranslate(req, signal, 0);
}

async function attemptTranslate(
  req: TranslateRequest,
  externalSignal: AbortSignal | undefined,
  attempt: number
): Promise<TranslateResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TRANSLATE_TIMEOUT_MS);

  // Merge external cancel + internal timeout into one signal
  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(`${API_BASE}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
    if (!res.ok) {
      const isTransient = res.status >= 500 || res.status === 429;
      if (isTransient && attempt === 0) {
        await new Promise((r) => setTimeout(r, 200));
        return attemptTranslate(req, externalSignal, 1);
      }
      throw new ApiError(`Translate failed with HTTP ${res.status}`, res.status);
    }
    return (await res.json()) as TranslateResponse;
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    if (isAbort) throw new ApiError('Request timed out or was cancelled');
    if (attempt === 0) {
      await new Promise((r) => setTimeout(r, 200));
      return attemptTranslate(req, externalSignal, 1);
    }
    throw new ApiError(err instanceof Error ? err.message : 'Network error reaching backend');
  } finally {
    clearTimeout(timeoutId);
  }
}
