import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SubtitleSegment, ValidationResult } from '../types/lyrics';
import { SubtitleRow } from './SubtitleRow';
import { 
  Search, 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  Split, 
  X 
} from 'lucide-react';

interface SubtitleEditorProps {
  subtitles: SubtitleSegment[];
  activeSubtitleId: number | null;
  selectedSubtitleId: number | null;
  currentTime: number;
  duration: number;
  validation: ValidationResult;
  onUpdateSubtitle: (id: number, updates: Partial<SubtitleSegment>) => void;
  onDeleteSubtitle: (id: number) => void;
  onAddSubtitle: (time: number) => void;
  onSplitSubtitle: (id: number, splitRatio?: number) => void;
  onMergeWithNext: (id: number) => void;
  onJumpToTime: (time: number) => void;
  onFixIssues: () => void;
  onResync: (mode: 'all' | 'selected' | 'from_index', targetIndex?: number) => void;
  isResyncing: boolean;
  onRetryAnalysis?: () => void;
  onOpenPasteLyrics?: () => void;
  isAudioLoaded?: boolean;
  onSnapStartAndShiftRest?: (id: number) => void;
}

export const SubtitleEditor: React.FC<SubtitleEditorProps> = ({
  subtitles,
  activeSubtitleId,
  selectedSubtitleId,
  currentTime,
  duration,
  validation,
  onUpdateSubtitle,
  onDeleteSubtitle,
  onAddSubtitle,
  onSplitSubtitle,
  onMergeWithNext,
  onJumpToTime,
  onFixIssues,
  onResync,
  isResyncing,
  onRetryAnalysis,
  onOpenPasteLyrics,
  isAudioLoaded,
  onSnapStartAndShiftRest,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
  const [showResyncMenu, setShowResyncMenu] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  // Search matching logic
  const matchingIndices = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const indices: number[] = [];
    subtitles.forEach((s, idx) => {
      if (s.text.toLowerCase().includes(q)) {
        indices.push(idx);
      }
    });
    return indices;
  }, [subtitles, searchQuery]);

  // Jump to match
  const handleNextMatch = () => {
    if (matchingIndices.length === 0) return;
    const nextIdx = (currentMatchIdx + 1) % matchingIndices.length;
    setCurrentMatchIdx(nextIdx);
    scrollToSubtitleIndex(matchingIndices[nextIdx]);
  };

  const handlePrevMatch = () => {
    if (matchingIndices.length === 0) return;
    const prevIdx = (currentMatchIdx - 1 + matchingIndices.length) % matchingIndices.length;
    setCurrentMatchIdx(prevIdx);
    scrollToSubtitleIndex(matchingIndices[prevIdx]);
  };

  const scrollToSubtitleIndex = (index: number) => {
    const targetSub = subtitles[index];
    if (!targetSub) return;
    const el = document.getElementById(`subtitle-row-${targetSub.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Auto-scroll to active subtitle
  useEffect(() => {
    if (!autoScroll || !activeSubtitleId) return;
    const el = document.getElementById(`subtitle-row-${activeSubtitleId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeSubtitleId, autoScroll]);

  // Handlers for setting start/end to current time
  const handleSetStartToCurrent = (id: number) => {
    const rounded = parseFloat(currentTime.toFixed(3));
    const sub = subtitles.find((s) => s.id === id);
    if (sub && rounded < sub.end) {
      onUpdateSubtitle(id, { start: rounded });
    }
  };

  const handleSetEndToCurrent = (id: number) => {
    const rounded = parseFloat(currentTime.toFixed(3));
    const sub = subtitles.find((s) => s.id === id);
    if (sub && rounded > sub.start) {
      onUpdateSubtitle(id, { end: rounded });
    }
  };

  return (
    <div className="space-y-3 flex flex-col h-full">
      {/* Editor Controls Bar */}
      <div className="bg-[#11151A] rounded-xl border border-[#252A31] p-3 space-y-2.5 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Search Input & Navigation */}
          <div className="relative flex items-center min-w-[220px] flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentMatchIdx(0);
              }}
              placeholder="Search lyrics (Arabic, English...)"
              className="w-full bg-[#161B22] border border-[#252A31] focus:border-purple-500 rounded-lg pl-8 pr-16 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
            {matchingIndices.length > 0 && (
              <div className="absolute right-1.5 flex items-center gap-1 text-[11px] text-slate-400">
                <span className="font-mono">{currentMatchIdx + 1}/{matchingIndices.length}</span>
                <button
                  type="button"
                  onClick={handlePrevMatch}
                  className="p-0.5 hover:text-white"
                  title="Previous match"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMatch}
                  className="p-0.5 hover:text-white"
                  title="Next match"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            )}
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            {/* Auto-scroll toggle */}
            <button
              type="button"
              onClick={() => setAutoScroll(!autoScroll)}
              className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                autoScroll
                  ? 'bg-purple-600/15 border-purple-500/40 text-purple-300'
                  : 'bg-[#161B22] border-[#252A31] text-slate-400 hover:text-slate-200'
              }`}
              title="Follow active lyric during playback"
            >
              Auto-Scroll: {autoScroll ? 'ON' : 'OFF'}
            </button>

            {/* AI Resync Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowResyncMenu(!showResyncMenu)}
                disabled={isResyncing}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#181D24] text-purple-300 hover:text-purple-200 border border-purple-500/30 hover:border-purple-500/60 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>{isResyncing ? 'Re-syncing...' : 'AI Re-sync'}</span>
              </button>

              {showResyncMenu && (
                <div className="absolute right-0 mt-1.5 w-56 bg-[#161B22] border border-[#252A31] rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in duration-100">
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Re-align Timestamps
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowResyncMenu(false);
                      onResync('all');
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-purple-600/20 hover:text-purple-200"
                  >
                    Re-sync All Subtitles
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowResyncMenu(false);
                      const targetIdx = subtitles.findIndex((s) => s.id === activeSubtitleId);
                      onResync('selected', targetIdx >= 0 ? targetIdx : 0);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-purple-600/20 hover:text-purple-200"
                  >
                    Re-sync Active Subtitle Only
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowResyncMenu(false);
                      const targetIdx = subtitles.findIndex((s) => s.id === activeSubtitleId);
                      onResync('from_index', targetIdx >= 0 ? targetIdx : 0);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-purple-600/20 hover:text-purple-200"
                  >
                    Re-sync From Active Subtitle Onward
                  </button>
                </div>
              )}
            </div>

            {/* + Add Subtitle Button */}
            <button
              type="button"
              onClick={() => onAddSubtitle(currentTime)}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white shadow-sm transition-colors"
              title="Add a new lyric subtitle at current playback position"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Line</span>
            </button>
          </div>
        </div>

        {/* Quality Check Status Bar */}
        <div className="pt-1 border-t border-[#252A31]/50">
          {validation.isValid && validation.warnings.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                ✓ {validation.stats.total} subtitles · Valid timestamps · No overlaps · UTF-8 · Ready to export
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs">
              <div className="flex items-center gap-2 text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {validation.errors.length > 0
                    ? `⚠ ${validation.errors.length} subtitle errors detected`
                    : `Notice: ${validation.warnings.length} timing warnings detected`}
                </span>
              </div>
              <button
                type="button"
                onClick={onFixIssues}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 font-medium text-xs border border-amber-500/40 transition-colors"
              >
                <Wrench className="w-3 h-3" />
                <span>Fix Automatically</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Subtitles Scroll List */}
      <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
        {subtitles.length === 0 ? (
          <div className="text-center p-6 sm:p-8 rounded-xl border border-dashed border-[#252A31] bg-[#0E1217] space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-purple-600/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-slate-200">
                Belum Ada Subtitle Tersinkronisasi
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {isAudioLoaded
                  ? 'Audio Anda telah berhasil dimuat. Silakan jalankan analisis AI atau gunakan lirik sendiri.'
                  : 'Unggah file audio atau tambahkan baris subtitle baru.'}
              </p>
            </div>

            {isAudioLoaded && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {onRetryAnalysis && (
                  <button
                    type="button"
                    onClick={onRetryAnalysis}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md shadow-purple-950 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Coba Analisis AI Lagi</span>
                  </button>
                )}
                {onOpenPasteLyrics && (
                  <button
                    type="button"
                    onClick={onOpenPasteLyrics}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#181D24] hover:bg-[#1E2530] text-slate-200 hover:text-white font-medium text-xs border border-[#252A31] transition-colors"
                  >
                    <span>Gunakan Lirik Sendiri (Alignment)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onAddSubtitle(currentTime)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#181D24] hover:bg-[#1E2530] text-slate-400 hover:text-slate-200 text-xs border border-[#252A31] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Baris Manual</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          subtitles.map((sub, idx) => (
            <SubtitleRow
              key={sub.id}
              subtitle={sub}
              index={idx}
              isActive={sub.id === activeSubtitleId}
              isSelected={sub.id === selectedSubtitleId}
              currentTime={currentTime}
              isLast={idx === subtitles.length - 1}
              onUpdate={onUpdateSubtitle}
              onDelete={onDeleteSubtitle}
              onSplit={onSplitSubtitle}
              onMergeWithNext={onMergeWithNext}
              onJumpTo={onJumpToTime}
              onSetStartToCurrent={handleSetStartToCurrent}
              onSetEndToCurrent={handleSetEndToCurrent}
              onSnapStartAndShiftRest={onSnapStartAndShiftRest}
            />
          ))
        )}
      </div>
    </div>
  );
};
