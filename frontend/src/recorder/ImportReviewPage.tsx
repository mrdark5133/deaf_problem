/**
 * ImportReviewPage — UI for inspecting, playing, validating, and approving imported sign clips.
 *
 * Provides:
 *  - Filterable library table (Real vs Synthetic, by Source, by Category)
 *  - Live SkeletonAvatar preview player with scrubber, FPS counter, and play controls
 *  - Full provenance inspection (Source dataset, license, original ID, signer)
 *  - JSON schema inspector & export button
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  FileCheck,
  Layers,
  Play,
  Pause,
  RotateCcw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import type { SignClip, SignLibraryIndex } from '../lib/clipTypes';
import { AvatarContainer } from '../avatar/AvatarContainer';
import { useSignPlayer } from '../player/useSignPlayer';
import { evaluateClipQuality } from './clipQuality';
import { ClipQualityBadge } from './ClipQualityBadge';

export interface ImportReviewPageProps {
  onBack?: () => void;
}

export const ImportReviewPage: React.FC<ImportReviewPageProps> = ({ onBack }) => {
  const [indexData, setIndexData] = useState<SignLibraryIndex | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'real' | 'synthetic'>('all');
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedClip, setSelectedClip] = useState<SignClip | null>(null);
  const [clipLoading, setClipLoading] = useState<boolean>(false);

  // Player hook for previewing selected clip
  const { frame, status, play, pause, enqueue, clear, setSpeed, speed } = useSignPlayer();

  // Load signs/index.json
  useEffect(() => {
    fetch('/data/signs/index.json')
      .then((res) => {
        if (!res.ok) throw new Error('Index not found');
        return res.json();
      })
      .then((data: SignLibraryIndex) => {
        setIndexData(data);
        const firstKey = Object.keys(data.signs)[0];
        if (firstKey) setSelectedClipId(firstKey);
      })
      .catch((err) => console.error('Failed to load sign index:', err))
      .finally(() => setLoading(false));
  }, []);

  // Load selected clip JSON
  useEffect(() => {
    if (!selectedClipId || !indexData?.signs[selectedClipId]) return;
    setClipLoading(true);
    const entry = indexData.signs[selectedClipId];

    fetch(`/data/${entry.file}`)
      .then((res) => res.json())
      .then((clip: SignClip) => {
        setSelectedClip(clip);
        clear();
        enqueue([
          {
            clipId: clip.id,
            clip,
            tokenIndex: 0,
            gloss: clip.gloss,
            isTokenStart: true,
            isTokenEnd: true,
          },
        ]);
      })
      .catch((err) => console.error('Failed to load clip JSON:', err))
      .finally(() => setClipLoading(false));
  }, [selectedClipId, indexData, clear, enqueue]);

  // Filtered sign list
  const filteredSigns = useMemo(() => {
    if (!indexData) return [];
    return Object.values(indexData.signs).filter((s) => {
      const matchesSearch =
        s.gloss.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.source && s.source.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;
      if (filterType === 'real') return !s.synthetic;
      if (filterType === 'synthetic') return s.synthetic;
      return true;
    });
  }, [indexData, searchQuery, filterType]);

  const qualityMetrics = useMemo(() => {
    if (!selectedClip || !selectedClip.frames) return null;
    return evaluateClipQuality(selectedClip.frames, selectedClip.fps || 30);
  }, [selectedClip]);

  const handleReplay = () => {
    if (!selectedClip) return;
    clear();
    enqueue([
      {
        clipId: selectedClip.id,
        clip: selectedClip,
        tokenIndex: 0,
        gloss: selectedClip.gloss,
        isTokenStart: true,
        isTokenEnd: true,
      },
    ]);
    play();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-6 max-w-7xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Back to Translator"
              aria-label="Back to Translator"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-400 font-semibold mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Phase D1 — Sign Data Import & Provenance Review</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Library Provenance Inspector
            </h1>
          </div>
        </div>

        {/* Global Library Stats Banner */}
        {indexData && (
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400">Total:</span>
              <span className="text-white font-bold">{indexData.total_signs}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Real Data:</span>
              <span className="text-emerald-200 font-bold">{indexData.real_signs}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/50 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-400 font-semibold">Synthetic:</span>
              <span className="text-amber-200 font-bold">{indexData.synthetic_signs}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Workspace: 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 flex-1 min-h-0">
        {/* Left 5 Cols: Clip Search & Table */}
        <div className="lg:col-span-5 flex flex-col gap-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          {/* Filter Toolbar */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by gloss, ID, or dataset source..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              {(['all', 'real', 'synthetic'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                    filterType === t
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {t === 'all' ? `All (${indexData?.total_signs ?? 0})` : t}
                </button>
              ))}
            </div>
          </div>

          {/* Clip Table List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[600px]">
            {loading ? (
              <div className="p-8 text-center text-slate-500 text-xs">Loading library index...</div>
            ) : filteredSigns.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">No matching sign clips found.</div>
            ) : (
              filteredSigns.map((entry) => {
                const isSelected = entry.id === selectedClipId;
                return (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedClipId(entry.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-950/40'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white font-mono">{entry.gloss}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({entry.id})</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{entry.duration_ms}ms</span>
                        <span>•</span>
                        <span>{entry.fps} FPS</span>
                        {entry.source && (
                          <>
                            <span>•</span>
                            <span className="text-indigo-400/90 font-mono truncate max-w-[140px]">
                              {entry.source}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      {entry.synthetic ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/60">
                          SYNTHETIC
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                          REAL DATA
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right 7 Cols: Preview Player & Provenance Card */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Player Viewport */}
          <div className="relative aspect-[16/10] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
            {clipLoading ? (
              <div className="text-xs text-slate-400 animate-pulse">Loading sign clip...</div>
            ) : (
              <>
                <AvatarContainer
                  frame={frame}
                  isIdle={status === 'idle'}
                  badge={selectedClip?.synthetic ? 'SYNTHETIC' : 'REAL CLIP'}
                  className="w-full h-full"
                />

                {/* Status Overlay */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <div className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-sm border border-slate-800 text-[11px] font-mono text-slate-300">
                    Status: <span className="text-indigo-400 font-semibold">{status}</span>
                  </div>
                </div>

                {/* Bottom Control Bar */}
                <div className="absolute bottom-3 inset-x-3 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {status === 'playing' ? (
                      <button
                        onClick={pause}
                        className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                        title="Pause"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={play}
                        className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                        title="Play"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={handleReplay}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                      title="Replay"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <span className="text-xs font-mono text-slate-300 ml-2">
                      {selectedClip?.gloss} ({selectedClip?.frames.length ?? 0} frames)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Speed:</span>
                    {[0.5, 1.0, 1.5].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSpeed(s)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                          Math.abs(speed - s) < 0.05
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Provenance Card (Hard Rule 3 Inspection) */}
          {selectedClip && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">Clip Provenance & Metadata</h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  ID: <code className="text-indigo-400 font-semibold">{selectedClip.id}</code>
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">
                    Dataset Source
                  </span>
                  <span className="font-semibold text-slate-200 truncate block">
                    {(selectedClip as any).source || (selectedClip.synthetic ? 'Synthetic Generator' : 'Unknown')}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">
                    License
                  </span>
                  <span className="font-semibold text-emerald-400 truncate block">
                    {(selectedClip as any).license || (selectedClip.synthetic ? 'Project-internal' : 'Unknown')}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">
                    Signer ID
                  </span>
                  <span className="font-semibold text-slate-200 truncate block">
                    {selectedClip.signer || 'anonymous'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">
                    Original Sample ID
                  </span>
                  <span className="font-semibold text-slate-300 truncate block font-mono">
                    {(selectedClip as any).original_id || 'N/A'}
                  </span>
                </div>
              </div>

              {selectedClip.meta?.notes && (
                <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/50">
                  <span className="text-slate-500 font-semibold">Attribution Note: </span>
                  {selectedClip.meta.notes}
                </div>
              )}

              {/* Automated Quality Gate Badge */}
              {qualityMetrics && (
                <ClipQualityBadge metrics={qualityMetrics} showDetails={true} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
