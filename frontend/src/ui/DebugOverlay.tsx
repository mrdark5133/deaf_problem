/**
 * DebugOverlay — toggleable floating panel showing real-time pipeline metrics.
 * Toggle with keyboard shortcut [D] or the button in the header.
 */

import React from 'react';
import { X } from 'lucide-react';

export interface DebugMetrics {
  fps: number;
  playerStatus: string;
  currentGloss: string | null;
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
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <span className="text-slate-500 text-[11px] font-mono shrink-0">{label}</span>
      <span
        className={`font-mono text-[11px] font-semibold tabular-nums ${
          warn ? 'text-rose-400' : highlight ? 'text-emerald-400' : 'text-slate-300'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({ metrics, onClose }) => {
  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-64 rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl shadow-black/50 overflow-hidden"
      role="complementary"
      aria-label="Debug overlay"
      id="debug-overlay"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800">
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-semibold">
          SignBridge Debug
        </span>
        <button
          onClick={onClose}
          className="text-slate-600 hover:text-slate-300 transition-colors cursor-pointer"
          aria-label="Close debug overlay"
          id="debug-close-btn"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Metrics */}
      <div className="px-4 py-3 space-y-0.5">
        <div className="text-[9px] uppercase tracking-widest text-slate-600 font-semibold mb-1">
          Renderer
        </div>
        <MetricRow label="fps" value={`${metrics.fps} fps`} highlight={metrics.fps >= 55} warn={metrics.fps < 30} />
        <MetricRow label="player" value={metrics.playerStatus} />
        <MetricRow label="gloss" value={metrics.currentGloss ?? '—'} />
        <MetricRow label="queue" value={`${metrics.queueLength} items`} warn={metrics.queueLength > 8} />
        <MetricRow label="lag est." value={`${Math.round(metrics.lagMs)} ms`} warn={metrics.lagMs > 4000} />
        <MetricRow label="speed" value={`${metrics.playerSpeed.toFixed(1)}×`} warn={metrics.playerSpeed > 1.0} />

        <div className="text-[9px] uppercase tracking-widest text-slate-600 font-semibold mt-2 mb-1">
          Pipeline
        </div>
        <MetricRow label="last seq" value={metrics.lastSeq} />
        <MetricRow label="pending reqs" value={metrics.pendingRequests} warn={metrics.pendingRequests > 2} />
        <MetricRow label="backend" value={metrics.backendReachable ? 'ok' : 'down'} highlight={metrics.backendReachable} warn={!metrics.backendReachable} />

        <div className="text-[9px] uppercase tracking-widest text-slate-600 font-semibold mt-2 mb-1">
          Latency
        </div>
        <MetricRow label="p50" value={`${metrics.latencyP50Ms} ms`} highlight={metrics.latencyP50Ms < 500} warn={metrics.latencyP50Ms > 1000} />
        <MetricRow label="p95" value={`${metrics.latencyP95Ms} ms`} highlight={metrics.latencyP95Ms < 1000} warn={metrics.latencyP95Ms > 2000} />
        <MetricRow label="samples" value={metrics.latencySamples} />

        {metrics.lastError && (
          <div className="mt-2 p-2 rounded-lg bg-rose-950/50 border border-rose-900/50 text-rose-300 text-[10px] font-mono break-words">
            {metrics.lastError}
          </div>
        )}
      </div>
    </div>
  );
};
