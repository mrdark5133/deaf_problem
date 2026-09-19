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
  wh: 'WH-QUESTION',
  yes_no: 'YES/NO-QUESTION',
};

export const GlossStrip: React.FC<GlossStripProps> = ({
  tokens,
  activeTokenIndex,
  isQuestion = false,
  questionType,
  className = '',
}) => {
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeTokenIndex]);

  if (tokens.length === 0) {
    return (
      <div
        className={`flex items-center h-9 px-3 rounded border border-neutral-200 bg-white font-mono ${className}`}
        role="status"
        aria-label="No gloss tokens"
      >
        <span className="text-[11px] text-neutral-400 uppercase tracking-wider">[NO ACTIVE GLOSS TOKENS]</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1.5 overflow-x-auto py-1 font-mono ${className}`}
      role="list"
      aria-label="ASL gloss sequence"
    >
      {isQuestion && questionType && (
        <div className="shrink-0 px-2 py-1 rounded bg-neutral-900 text-white text-[10px] font-mono font-bold tracking-wider select-none border border-black">
          [{QUESTION_LABELS[questionType] ?? 'QUESTION'}]
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
            className={`shrink-0 px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
              isActive
                ? 'bg-black text-white border border-black shadow-sm'
                : isFingerspell
                ? 'bg-neutral-100 border border-neutral-300 text-neutral-800'
                : 'bg-white border border-neutral-200 text-neutral-700 hover:border-neutral-400'
            }`}
          >
            {isFingerspell && (
              <span className="text-[9px] tracking-widest text-neutral-400 block leading-none mb-0.5">
                FS
              </span>
            )}
            {label.toUpperCase()}
          </div>
        );
      })}

      {isQuestion && (
        <div className="shrink-0 ml-1 px-1.5 py-0.5 rounded bg-neutral-200 border border-neutral-300 text-neutral-900 text-xs font-bold font-mono select-none">
          ?
        </div>
      )}
    </div>
  );
};
