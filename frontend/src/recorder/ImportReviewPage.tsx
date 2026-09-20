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
    <div className="min-h-screen bg-white text-neutral-900 font-mono flex flex-col p-6 max-w-7xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 text-neutral-600 hover:text-black hover:bg-neutral-100 rounded border border-neutral-300 transition-colors cursor-pointer"
              title="Back to Translator"
              aria-label="Back to Translator"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-0.5">
              // SIGN DATA IMPORT & PROVENANCE
            </div>
            <h1 className="text-base font-bold text-neutral-900 tracking-tight leading-none">
              Library Provenance Inspector
            </h1>
          </div>
        </div>

        {/* Global Library Stats Banner */}
        {indexData && (
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="px-2.5 py-1 rounded bg-neutral-100 border border-neutral-300 flex items-center gap-1.5 font-bold">
              <Database className="w-3.5 h-3.5 text-neutral-700" />
              <span className="text-neutral-500">TOTAL:</span>
              <span className="text-neutral-900">{indexData.total_signs}</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-emerald-50 border border-emerald-300 flex items-center gap-1.5 font-bold text-emerald-900">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>REAL:</span>
              <span>{indexData.real_signs}</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-amber-50 border border-amber-300 flex items-center gap-1.5 font-bold text-amber-900">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>SYNTHETIC:</span>
              <span>{indexData.synthetic_signs}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Workspace: 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4 flex-1 min-h-0">
        {/* Left 5 Cols: Clip Search & Table */}
        <div className="lg:col-span-5 flex flex-col gap-3 bg-white border border-neutral-300 rounded p-4">
          {/* Filter Toolbar */}
          <div className="flex flex-col gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by gloss, ID, source..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-neutral-300 rounded text-xs text-neutral-900 placeholder-neutral-400 outline-none focus:border-black font-mono"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {(['all', 'real', 'synthetic'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    filterType === t
                      ? 'bg-black text-white'
                      : 'bg-white text-neutral-700 hover:text-black border border-neutral-300'
                  }`}
                >
                  {t === 'all' ? `ALL (${indexData?.total_signs ?? 0})` : t}
                </button>
              ))}
            </div>
          </div>

          {/* Clip Table List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[600px]">
            {loading ? (
              <div className="p-8 text-center text-neutral-500 text-xs font-mono">Loading library index...</div>
            ) : filteredSigns.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs font-mono">No matching sign clips found.</div>
            ) : (
              filteredSigns.map((entry) => {
                const isSelected = entry.id === selectedClipId;
                return (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedClipId(entry.id)}
                    className={`w-full text-left p-2.5 rounded border transition-colors flex items-center justify-between cursor-pointer font-mono ${
                      isSelected
                        ? 'bg-neutral-100 border-black shadow-xs'
                        : 'bg-white border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-neutral-900">{entry.gloss}</span>
                        <span className="text-[10px] text-neutral-500">({entry.id})</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-600">
                        <span>{entry.duration_ms}ms</span>
                        <span>•</span>
                        <span>{entry.fps} FPS</span>
                        {entry.source && (
                          <>
                            <span>•</span>
                            <span className="text-neutral-700 truncate max-w-[140px]">
                              {entry.source}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      {entry.synthetic ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300">
                          SYNTHETIC
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
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
          <div className="relative aspect-[16/10] bg-white border border-neutral-300 rounded shadow-xs overflow-hidden flex items-center justify-center">
            {clipLoading ? (
              <div className="text-xs text-neutral-500 font-mono animate-pulse">Loading sign clip...</div>
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
                  <div className="px-2 py-0.5 rounded bg-white/95 border border-neutral-300 text-[10px] font-mono font-bold text-neutral-800 shadow-xs">
                    STATUS: <span className="text-black uppercase">{status}</span>
                  </div>
                </div>

                {/* Bottom Control Bar */}
                <div className="absolute bottom-3 inset-x-3 bg-white/95 backdrop-blur-md border border-neutral-300 rounded p-2 flex items-center justify-between font-mono">
                  <div className="flex items-center gap-1.5">
                    {status === 'playing' ? (
                      <button
                        onClick={pause}
                        className="p-1.5 rounded bg-black hover:bg-neutral-800 text-white cursor-pointer"
                        title="Pause"
                      >
                        <Pause className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={play}
                        className="p-1.5 rounded bg-black hover:bg-neutral-800 text-white cursor-pointer"
                        title="Play"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={handleReplay}
                      className="p-1.5 rounded bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-800 cursor-pointer"
                      title="Replay"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <span className="text-[11px] font-mono text-neutral-800 ml-1.5 font-bold">
                      {selectedClip?.gloss} ({selectedClip?.frames.length ?? 0} frames)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-neutral-500 uppercase font-bold">SPEED:</span>
                    {[0.5, 1.0, 1.5].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSpeed(s)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          Math.abs(speed - s) < 0.05
                            ? 'bg-black text-white'
                            : 'bg-neutral-100 border border-neutral-300 text-neutral-700 hover:text-black'
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
            <div className="bg-white border border-neutral-300 rounded p-4 flex flex-col gap-3 font-mono">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-neutral-800" />
                  <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">// PROVENANCE & METADATA</h3>
                </div>
                <span className="text-[10px] font-mono text-neutral-500 font-bold">
                  ID: <span className="text-neutral-900">{selectedClip.id}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded bg-neutral-50 border border-neutral-200">
                  <span className="block text-[9px] text-neutral-500 uppercase font-bold tracking-wider mb-0.5">
                    DATASET SOURCE
                  </span>
                  <span className="font-bold text-neutral-800 text-[11px] truncate block">
                    {(selectedClip as any).source || (selectedClip.synthetic ? 'Synthetic Generator' : 'Unknown')}
                  </span>
                </div>

                <div className="p-2 rounded bg-neutral-50 border border-neutral-200">
                  <span className="block text-[9px] text-neutral-500 uppercase font-bold tracking-wider mb-0.5">
                    LICENSE
                  </span>
                  <span className="font-bold text-emerald-800 text-[11px] truncate block">
                    {(selectedClip as any).license || (selectedClip.synthetic ? 'Project-internal' : 'Unknown')}
                  </span>
                </div>

                <div className="p-2 rounded bg-neutral-50 border border-neutral-200">
                  <span className="block text-[9px] text-neutral-500 uppercase font-bold tracking-wider mb-0.5">
                    SIGNER ID
                  </span>
                  <span className="font-bold text-neutral-800 text-[11px] truncate block">
                    {selectedClip.signer || 'anonymous'}
                  </span>
                </div>

                <div className="p-2 rounded bg-neutral-50 border border-neutral-200">
                  <span className="block text-[9px] text-neutral-500 uppercase font-bold tracking-wider mb-0.5">
                    SAMPLE ID
                  </span>
                  <span className="font-bold text-neutral-800 text-[11px] truncate block font-mono">
                    {(selectedClip as any).original_id || 'N/A'}
                  </span>
                </div>
              </div>

              {selectedClip.meta?.notes && (
                <div className="text-[10px] text-neutral-700 bg-neutral-50 p-2 rounded border border-neutral-200">
                  <span className="font-bold text-neutral-900">// ATTRIBUTION NOTE: </span>
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
