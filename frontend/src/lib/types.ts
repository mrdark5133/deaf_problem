/**
 * Core type definitions for SignBridge.
 */

export interface HealthResponse {
  status: 'ok' | string;
  version: string;
  service: string;
}

export type TokenKind = 'sign' | 'fingerspell';

export interface GlossToken {
  gloss: string;
  kind: TokenKind;
  clip_id?: string;
  source?: string;
  letters?: string[];
}

export interface TranslateRequest {
  text: string;
  is_final?: boolean;
  seq?: number;
}

export interface TranslateResponse {
  seq?: number;
  original: string;
  is_question: boolean;
  question_type?: 'wh' | 'yes_no' | null;
  tokens: GlossToken[];
  processing_ms: number;
}
