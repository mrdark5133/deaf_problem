import React, { useEffect, useRef } from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import type { CaptionItem } from '../speech/types';

export interface CaptionPanelProps {
  captions: CaptionItem[];
  interimText?: string;
  onClear?: () => void;
  className?: string;
  fontSizeClass?: string;
}

export const CaptionPanel: React.FC<CaptionPanelProps> = ({
  captions,
  interimText = '',
  onClear,
  className = '',
  fontSizeClass = 'text-sm leading-relaxed',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [captions, interimText]);

  return (
    <section
      aria-label="Live Captions"
      className={`flex flex-col bg-white border border-neutral-200 rounded-lg overflow-hidden font-mono ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-neutral-50">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-neutral-700" />
          <h2 className="text-xs font-bold tracking-wider text-neutral-900 uppercase">
            Live Captions
          </h2>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-200 text-neutral-700 font-mono font-semibold">
            {captions.length}
          </span>
        </div>

        {captions.length > 0 && onClear && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 rounded transition-colors cursor-pointer"
            title="Clear caption history"
            aria-label="Clear caption history"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Captions scroll list */}
      <div
        ref={scrollContainerRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        tabIndex={0}
        aria-label="Caption history log"
        className="flex-1 p-4 overflow-y-auto max-h-80 min-h-48 space-y-3 focus:outline-none custom-scrollbar"
      >
        {captions.length === 0 && !interimText && (
          <div className="h-full min-h-36 flex flex-col items-center justify-center text-neutral-400 text-xs text-center px-4">
            <p className="font-semibold uppercase tracking-wider text-neutral-500">No captions yet.</p>
            <p className="text-[11px] text-neutral-400 mt-1">
              Click the microphone or type below to see live translation captions.
            </p>
          </div>
        )}

        {captions.map((cap) => (
          <div
            key={cap.id}
            className="flex items-start gap-2.5 pb-2.5 border-b border-neutral-100 last:border-b-0"
          >
            <div
              className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold shrink-0 ${
                cap.source === 'speech'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-200 text-neutral-800'
              }`}
              title={`Source: ${cap.source}`}
            >
              {cap.source === 'speech' ? 'VOICE' : 'TYPED'}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-neutral-900 font-medium ${fontSizeClass}`}>
                {cap.text}
              </p>
              <span className="text-[10px] text-neutral-400 font-mono">
                {new Date(cap.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}

        {/* Interim text */}
        {interimText && (
          <div className="flex items-start gap-2.5 bg-neutral-50 p-2.5 rounded border border-neutral-200 animate-pulse">
            <div className="mt-0.5 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold shrink-0 bg-red-600 text-white">
              REC
            </div>
            <div className="flex-1 min-w-0">
              <p
                data-testid="interim-caption"
                className={`text-neutral-700 italic ${fontSizeClass}`}
              >
                {interimText}
                <span className="inline-block w-1.5 h-3.5 ml-1 bg-black animate-pulse align-middle" />
              </p>
              <span className="text-[10px] text-neutral-400 font-mono">listening...</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
