import React, { useEffect, useRef } from 'react';
import { MessageSquare, Trash2, Mic, Keyboard } from 'lucide-react';
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
  fontSizeClass = 'text-base leading-relaxed',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new captions arrive
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [captions, interimText]);

  return (
    <section
      aria-label="Live Captions"
      className={`flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-xl ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
            Live Captions
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {captions.length}
          </span>
        </div>

        {captions.length > 0 && onClear && (
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
            title="Clear caption history"
            aria-label="Clear caption history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Captions scroll list with aria-live="polite" */}
      <div
        ref={scrollContainerRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        tabIndex={0}
        aria-label="Caption history log"
        className="flex-1 p-5 overflow-y-auto max-h-80 min-h-48 space-y-3.5 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
      >
        {captions.length === 0 && !interimText && (
          <div className="h-full min-h-36 flex flex-col items-center justify-center text-slate-500 text-sm italic text-center px-4">
            <p>No captions yet.</p>
            <p className="text-xs text-slate-600 mt-1">
              Click the microphone or type below to see live translation captions.
            </p>
          </div>
        )}

        {captions.map((cap) => (
          <div
            key={cap.id}
            className="flex items-start gap-3 group animate-in fade-in slide-in-from-bottom-1 duration-200"
          >
            <div
              className={`mt-1 p-1 rounded-md text-xs shrink-0 ${
                cap.source === 'speech'
                  ? 'bg-blue-950/60 text-blue-400 border border-blue-900/40'
                  : 'bg-indigo-950/60 text-indigo-400 border border-indigo-900/40'
              }`}
              title={`Source: ${cap.source}`}
            >
              {cap.source === 'speech' ? (
                <Mic className="w-3 h-3" />
              ) : (
                <Keyboard className="w-3 h-3" />
              )}
            </div>
            <div className="flex-1">
              <p className={`text-slate-100 font-medium ${fontSizeClass}`}>
                {cap.text}
              </p>
              <span className="text-[10px] text-slate-500 font-mono">
                {new Date(cap.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}

        {/* Interim (in-flight) text */}
        {interimText && (
          <div className="flex items-start gap-3 animate-pulse">
            <div className="mt-1 p-1 rounded-md text-xs shrink-0 bg-blue-950/80 text-blue-300 border border-blue-800/50">
              <Mic className="w-3 h-3 animate-spin" />
            </div>
            <div className="flex-1">
              <p
                data-testid="interim-caption"
                className={`text-slate-400 italic font-normal ${fontSizeClass}`}
              >
                {interimText}
                <span className="inline-block w-1.5 h-4 ml-1 bg-blue-400 animate-pulse align-middle" />
              </p>
              <span className="text-[10px] text-blue-400/70 font-mono">listening...</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
