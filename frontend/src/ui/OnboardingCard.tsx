import React from 'react';
import { Mic, ArrowRight, Activity, X, HelpCircle } from 'lucide-react';

export interface OnboardingCardProps {
  onDismiss: () => void;
  onOpenShortcuts?: () => void;
}

export const OnboardingCard: React.FC<OnboardingCardProps> = ({
  onDismiss,
  onOpenShortcuts,
}) => {
  return (
    <div className="relative rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900/80 p-4 sm:p-5 shadow-xl backdrop-blur-md">
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none cursor-pointer"
        aria-label="Dismiss onboarding guide"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
          <HelpCircle className="w-3.5 h-3.5" />
          Quick Start Guide
        </span>
        <span className="text-xs text-slate-400">How SignBridge Works in 3 Steps</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-3">
        {/* Step 1 */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/40 flex items-center justify-center shrink-0 text-xs font-bold font-mono">
            1
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1">
              <Mic className="w-3 h-3 text-blue-400" />
              Speak or Type
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Click the Mic or type text (e.g. <em>"Where is the doctor?"</em>) and press Enter.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center shrink-0 text-xs font-bold font-mono">
            2
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1">
              <ArrowRight className="w-3 h-3 text-indigo-400" />
              ASL Grammar
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              FastAPI parses grammar (Topic-Comment, WH-questions, fingerspelling fallback).
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 text-xs font-bold font-mono">
            3
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" />
              Live Signing
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Avatar renders at 60 FPS with synchronized Gloss highlighting and backpressure control.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        {onOpenShortcuts ? (
          <button
            type="button"
            onClick={onOpenShortcuts}
            className="text-[11px] text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none cursor-pointer"
          >
            Press [?] for Keyboard Shortcuts
          </button>
        ) : (
          <div />
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="px-3.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none cursor-pointer"
        >
          Got It
        </button>
      </div>
    </div>
  );
};
