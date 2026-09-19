import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
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
          bg: 'bg-emerald-950/70 border-emerald-700/70 text-emerald-300',
          dot: 'bg-emerald-400',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
          label: 'Passed Gate (Green)',
        };
      case 'AMBER':
        return {
          bg: 'bg-amber-950/70 border-amber-700/70 text-amber-300',
          dot: 'bg-amber-400',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
          label: 'Marginal Quality (Amber)',
        };
      case 'RED':
        return {
          bg: 'bg-rose-950/70 border-rose-700/70 text-rose-300',
          dot: 'bg-rose-400',
          icon: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
          label: 'Rejected (Red)',
        };
    }
  };

  const style = getBadgeStyle(metrics.verdict);

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-slate-200">Clip Quality Score</span>
        </div>
        <div className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 ${style.bg}`}>
          <span className={`w-2 h-2 rounded-full ${style.dot} animate-pulse`} />
          <span>{metrics.overallScore}% — {style.label}</span>
        </div>
      </div>

      {showDetails && (
        <>
          <div className="grid grid-cols-3 gap-2 mt-1 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            <div>
              <span className="block text-slate-500">Missing Hands</span>
              <span className="font-mono text-slate-200 font-medium">
                {(metrics.missingHandRatio * 100).toFixed(0)}%
              </span>
            </div>
            <div>
              <span className="block text-slate-500">Jitter</span>
              <span className="font-mono text-slate-200 font-medium">
                {(metrics.avgJitter * 1000).toFixed(1)} mU
              </span>
            </div>
            <div>
              <span className="block text-slate-500">Bone CoV</span>
              <span className="font-mono text-slate-200 font-medium">
                {(metrics.boneLengthCoV * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {metrics.issues.length > 0 && (
            <div className="mt-1 p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-rose-300 flex flex-col gap-1">
              {metrics.issues.map((iss, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-rose-400 font-bold">•</span>
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
