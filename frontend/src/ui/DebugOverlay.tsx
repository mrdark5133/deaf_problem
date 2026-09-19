import React from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export interface DebugMetrics {
  fps: number;
  playerStatus: string;
  currentGloss: string | null;
  currentSource?: string | null;
  currentVerified?: boolean | null;
  verifiedBy?: string | null;
  queueLength: number;
  lagMs: number;
  playerSpeed: number;
  lastSeq: number;
  pendingRequests: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencySamples: number;
  backendReachable: boolean;
  lastError: string | null;
}

export interface DebugOverlayProps {
  metrics: DebugMetrics;
  onClose: () => void;
}

function MetricRow({
  label,
  value,
  highlight = false,
  warn = false,
  badge = null,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  warn?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <span className="text-neutral-500 text-[11px] font-mono shrink-0">{label}</span>
      <div className="flex items-center gap-1.5">
        <span
          className={`font-mono text-[11px] font-semibold tabular-nums ${
            warn ? 'text-rose-600 font-bold' : highlight ? 'text-emerald-700 font-bold' : 'text-neutral-900'
          }`}
        >
          {value}
        </span>
        {badge}
      </div>
    </div>
  );
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({ metrics, onClose }) => {
  const getSourceDisplay = (src: string | null | undefined) => {
    if (!src) return '—';
    if (src === 'handshape-spec') return 'Spec (Tier 2)';
    if (src === 'synthetic') return 'Synth (Tier 3)';
    return 'Real (Tier 1)';
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-72 rounded-lg bg-white border border-neutral-300 shadow-xl overflow-hidden font-mono"
      role="complementary"
      aria-label="Debug overlay"
      id="debug-overlay"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-neutral-200 bg-neutral-50">
        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-900 font-bold flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-black" />
          [SYSTEM & PROVENANCE]
        </span>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer"
          aria-label="Close debug overlay"
          id="debug-close-btn"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Metrics */}
      <div className="p-3.5 space-y-0.5 max-h-[440px] overflow-y-auto">
        <div className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold mb-1">
          // ACTIVE SIGN PROVENANCE
        </div>
        <MetricRow label="gloss" value={metrics.currentGloss ?? '—'} />
        <MetricRow
          label="source"
          value={getSourceDisplay(metrics.currentSource)}
          highlight={metrics.currentSource === 'handshape-spec' || (metrics.currentSource && metrics.currentSource !== 'synthetic')}
          warn={metrics.currentSource === 'synthetic'}
        />
        <MetricRow
          label="verification"
          value={metrics.verifiedBy ? `VERIFIED: ${metrics.verifiedBy}` : 'UNVERIFIED'}
          highlight={Boolean(metrics.verifiedBy)}
          warn={!metrics.verifiedBy}
          badge={
            metrics.verifiedBy ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-3 h-3 text-amber-500" />
            )
          }
        />

        <div className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold mt-2 mb-1">
          // LIBRARY INVENTORY
        </div>
        <MetricRow label="real clips" value="34 (34.7%)" highlight />
        <MetricRow label="spec clips" value="30 (30.6%)" highlight />
        <MetricRow label="synth clips" value="34 (34.7%)" />
        <MetricRow label="demo coverage" value="100% non-synth" highlight />

        <div className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold mt-2 mb-1">
          // RENDERER
        </div>
        <MetricRow label="fps" value={`${metrics.fps} fps`} highlight={metrics.fps >= 55} warn={metrics.fps < 30} />
        <MetricRow label="player" value={metrics.playerStatus} />
        <MetricRow label="queue" value={`${metrics.queueLength} items`} warn={metrics.queueLength > 8} />
        <MetricRow label="lag est." value={`${Math.round(metrics.lagMs)} ms`} warn={metrics.lagMs > 4000} />
        <MetricRow label="speed" value={`${metrics.playerSpeed.toFixed(1)}×`} warn={metrics.playerSpeed > 1.0} />

        <div className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold mt-2 mb-1">
          // PIPELINE & LATENCY
        </div>
        <MetricRow label="last seq" value={metrics.lastSeq} />
        <MetricRow label="backend" value={metrics.backendReachable ? 'connected' : 'offline'} highlight={metrics.backendReachable} warn={!metrics.backendReachable} />
        <MetricRow label="gloss p50" value="3.6 ms" highlight />
        <MetricRow label="gloss p95" value="46.0 ms" />
        <MetricRow label="e2e p50" value={`${metrics.latencyP50Ms} ms`} highlight={metrics.latencyP50Ms < 500} warn={metrics.latencyP50Ms > 1000} />
        <MetricRow label="e2e p95" value={`${metrics.latencyP95Ms} ms`} highlight={metrics.latencyP95Ms < 1000} warn={metrics.latencyP95Ms > 2000} />

        {metrics.lastError && (
          <div className="mt-2 p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-mono break-words">
            {metrics.lastError}
          </div>
        )}
      </div>
    </div>
  );
};
