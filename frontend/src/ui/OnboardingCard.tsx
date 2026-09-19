import React from 'react';
import { X, ArrowRight } from 'lucide-react';

export interface OnboardingCardProps {
  onDismiss: () => void;
  onOpenShortcuts?: () => void;
}

export const OnboardingCard: React.FC<OnboardingCardProps> = ({
  onDismiss,
  onOpenShortcuts,
}) => {
  return (
    <div className="relative rounded-lg border border-neutral-300 bg-white p-5 font-mono shadow-sm">
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1 text-neutral-400 hover:text-neutral-900 rounded transition-colors cursor-pointer"
        aria-label="Dismiss onboarding guide"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-900 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded">
          SYSTEM GUIDE
        </span>
        <span className="text-xs text-neutral-500">Pipeline Workflow in 3 Steps</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-3">
        {/* Step 1 */}
        <div className="p-3.5 rounded border border-neutral-200 bg-neutral-50">
          <div className="text-xs font-bold text-neutral-900 flex items-center justify-between mb-1.5">
            <span>01 // INPUT</span>
            <span className="text-[10px] text-neutral-400">[VOICE / TEXT]</span>
          </div>
          <p className="text-[11px] text-neutral-600 leading-relaxed">
            Click the Mic or type text (e.g. <em>"Where is the doctor?"</em>) and press Enter.
          </p>
        </div>

        {/* Step 2 */}
        <div className="p-3.5 rounded border border-neutral-200 bg-neutral-50">
          <div className="text-xs font-bold text-neutral-900 flex items-center justify-between mb-1.5">
            <span>02 // ASL GRAMMAR</span>
            <span className="text-[10px] text-neutral-400">[FASTAPI NLP]</span>
          </div>
          <p className="text-[11px] text-neutral-600 leading-relaxed">
            Parses Topic-Comment, Time-First adverbs, WH-inversion, and fingerspelling fallback.
          </p>
        </div>

        {/* Step 3 */}
        <div className="p-3.5 rounded border border-neutral-200 bg-neutral-50">
          <div className="text-xs font-bold text-neutral-900 flex items-center justify-between mb-1.5">
            <span>03 // 60 FPS AVATAR</span>
            <span className="text-[10px] text-neutral-400">[2D / 3D CANVAS]</span>
          </div>
          <p className="text-[11px] text-neutral-600 leading-relaxed">
            Signs with smooth interpolation, 21-joint articulated hands, and live gloss tracking.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        {onOpenShortcuts ? (
          <button
            type="button"
            onClick={onOpenShortcuts}
            className="text-[11px] text-neutral-600 hover:text-black underline underline-offset-2 transition-colors cursor-pointer"
          >
            [?] VIEW KEYBOARD SHORTCUTS
          </button>
        ) : (
          <div />
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="px-3 py-1.5 rounded bg-black hover:bg-neutral-800 text-white text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer"
        >
          [GOT IT]
        </button>
      </div>
    </div>
  );
};
