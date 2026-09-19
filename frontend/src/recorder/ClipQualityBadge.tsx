import React from 'react';
import { ShieldCheck } from 'lucide-react';
import type { QualityMetrics, QualityVerdict } from './clipQuality';

export interface ClipQualityBadgeProps {
  metrics: QualityMetrics;
  showDetails?: boolean;
}

export const ClipQualityBadge: React.FC<ClipQualityBadgeProps> = ({
  metrics,
  showDetails = true,
}) => {
  const getBadgeStyle = (verdict: QualityVerdict) => {
    switch (verdict) {
      case 'GREEN':
        return {
          bg: 'bg-green-50 border-green-300 text-green-800',
          dot: 'bg-green-600',
          label: 'PASSED GATE',
        };
      case 'AMBER':
        return {
          bg: 'bg-amber-50 border-amber-300 text-amber-800',
          dot: 'bg-amber-600',
          label: 'MARGINAL',
        };
      case 'RED':
        return {
          bg: 'bg-red-50 border-red-300 text-red-800',
          dot: 'bg-red-600',
          label: 'REJECTED',
        };
    }
  };

  const style = getBadgeStyle(metrics.verdict);

  return (
    <div className="flex flex-col gap-2 p-3 rounded border border-neutral-300 bg-white font-mono text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-neutral-800" />
          <span className="font-bold text-neutral-900 uppercase">CLIP QUALITY SCORE</span>
        </div>
        <div className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${style.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
          <span>{metrics.overallScore}% — {style.label}</span>
        </div>
      </div>

      {showDetails && (
        <>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-200 text-[11px] text-neutral-600">
            <div>
              <span className="block text-neutral-400 uppercase text-[9px]">Missing Hands</span>
              <span className="font-mono text-neutral-900 font-bold">
                {(metrics.missingHandRatio * 100).toFixed(0)}%
              </span>
            </div>
            <div>
              <span className="block text-neutral-400 uppercase text-[9px]">Jitter</span>
              <span className="font-mono text-neutral-900 font-bold">
                {(metrics.avgJitter * 1000).toFixed(1)} mU
              </span>
            </div>
            <div>
              <span className="block text-neutral-400 uppercase text-[9px]">Bone CoV</span>
              <span className="font-mono text-neutral-900 font-bold">
                {(metrics.boneLengthCoV * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {metrics.issues.length > 0 && (
            <div className="mt-1 p-2 rounded bg-neutral-50 border border-neutral-200 text-[10px] text-red-700 flex flex-col gap-1">
              {metrics.issues.map((iss, i) => (
                <div key={i} className="flex items-start gap-1">
                  <span className="font-bold">•</span>
                  <span>{iss}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
