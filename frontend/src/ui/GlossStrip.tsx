/**
 * GlossStrip — horizontal token strip that highlights the currently-playing gloss.
 *
 * Shows the sequence of ASL gloss tokens for the most recent translation,
 * with the active token lit up in indigo.  Fingerspell tokens use a distinct
 * purple style.  Question-type tokens show a non-manual cue badge.
 */

import React, { useEffect, useRef } from 'react';
import type { GlossToken } from '../lib/types';

export interface GlossStripProps {
  tokens: GlossToken[];
  activeTokenIndex: number;
  isQuestion?: boolean;
  questionType?: 'wh' | 'yes_no' | null;
  className?: string;
}

const QUESTION_LABELS: Record<string, string> = {
  wh: 'WH?',
  yes_no: 'Y/N?',
};

export const GlossStrip: React.FC<GlossStripProps> = ({
  tokens,
  activeTokenIndex,
  isQuestion = false,
  questionType,
  className = '',
}) => {
  const activeRef = useRef<HTMLDivElement>(null);

  // Scroll active token into view
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeTokenIndex]);

  if (tokens.length === 0) {
    return (
      <div
        className={`flex items-center gap-2 h-10 px-4 rounded-xl bg-slate-900/60 border border-slate-800/60 ${className}`}
        role="status"
        aria-label="No gloss tokens"
      >
        <span className="text-xs text-slate-600 font-mono italic">waiting for translation…</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1.5 overflow-x-auto py-1 px-1 scrollbar-hide ${className}`}
      role="list"
      aria-label="ASL gloss sequence"
    >
      {isQuestion && questionType && (
        <div className="shrink-0 px-2 py-1 rounded-lg bg-amber-950/60 border border-amber-700/60 text-amber-300 text-[10px] font-mono font-bold select-none">
          {QUESTION_LABELS[questionType] ?? 'Q?'}
        </div>
      )}

      {tokens.map((token, i) => {
        const isActive = i === activeTokenIndex;
        const isFingerspell = token.kind === 'fingerspell';
        const label = isFingerspell
          ? token.letters?.join('') ?? token.gloss
          : token.gloss;

        return (
          <div
            key={`${i}-${token.gloss}`}
            ref={isActive ? activeRef : undefined}
            role="listitem"
            aria-current={isActive ? 'true' : undefined}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-mono font-semibold transition-all duration-200 ${
              isActive
                ? isFingerspell
                  ? 'bg-purple-950 border border-purple-500 text-purple-200 shadow-lg shadow-purple-500/25 scale-110'
                  : 'bg-indigo-950 border border-indigo-500 text-indigo-200 shadow-lg shadow-indigo-500/25 scale-110'
                : isFingerspell
                  ? 'bg-slate-900 border border-purple-900/40 text-purple-400/70'
                  : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            {isFingerspell && (
              <span className="text-[9px] tracking-widest text-purple-500/70 block leading-none mb-0.5">
                FS
              </span>
            )}
            {label.toUpperCase()}
          </div>
        );
      })}

      {isQuestion && (
        <div className="shrink-0 ml-1 w-5 h-5 rounded-full bg-amber-950/60 border border-amber-700/60 flex items-center justify-center text-amber-300 text-xs font-bold select-none">
          ?
        </div>
      )}
    </div>
  );
};
