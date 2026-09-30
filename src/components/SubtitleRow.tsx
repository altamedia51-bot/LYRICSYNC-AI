import React, { useState } from 'react';
import { SubtitleSegment } from '../types/lyrics';
import { formatSRTTime, parseSRTTime } from '../utils/srt';
import { 
  Play, 
  Trash2, 
  Scissors, 
  Combine, 
  Target, 
  Clock, 
  Check, 
  ChevronDown 
} from 'lucide-react';

interface SubtitleRowProps {
  subtitle: SubtitleSegment;
  index: number;
  isActive: boolean;
  isSelected: boolean;
  currentTime: number;
  isLast: boolean;
  onUpdate: (id: number, updates: Partial<SubtitleSegment>) => void;
  onDelete: (id: number) => void;
  onSplit: (id: number, splitRatio?: number) => void;
  onMergeWithNext: (id: number) => void;
  onJumpTo: (seconds: number) => void;
  onSetStartToCurrent: (id: number) => void;
  onSetEndToCurrent: (id: number) => void;
  onSnapStartAndShiftRest?: (id: number) => void;
}

export const SubtitleRow: React.FC<SubtitleRowProps> = ({
  subtitle,
  index,
  isActive,
  isSelected,
  currentTime,
  isLast,
  onUpdate,
  onDelete,
  onSplit,
  onMergeWithNext,
  onJumpTo,
  onSetStartToCurrent,
  onSetEndToCurrent,
  onSnapStartAndShiftRest,
}) => {
  const [isEditingStart, setIsEditingStart] = useState(false);
  const [isEditingEnd, setIsEditingEnd] = useState(false);
  const [startInput, setStartInput] = useState(formatSRTTime(subtitle.start));
  const [endInput, setEndInput] = useState(formatSRTTime(subtitle.end));

  const isRtl = /[\u0600-\u06FF]/.test(subtitle.text);

  // Micro adjustments
  const adjustTime = (type: 'start' | 'end', delta: number) => {
    if (type === 'start') {
      const newStart = Math.max(0, parseFloat((subtitle.start + delta).toFixed(3)));
      if (newStart < subtitle.end) {
        onUpdate(subtitle.id, { start: newStart });
        setStartInput(formatSRTTime(newStart));
      }
    } else {
      const newEnd = parseFloat((subtitle.end + delta).toFixed(3));
      if (newEnd > subtitle.start) {
        onUpdate(subtitle.id, { end: newEnd });
        setEndInput(formatSRTTime(newEnd));
      }
    }
  };

  const handleStartBlur = () => {
    setIsEditingStart(false);
    const parsed = parseSRTTime(startInput);
    if (!isNaN(parsed) && parsed >= 0 && parsed < subtitle.end) {
      onUpdate(subtitle.id, { start: parseFloat(parsed.toFixed(3)) });
    } else {
      setStartInput(formatSRTTime(subtitle.start));
    }
  };

  const handleEndBlur = () => {
    setIsEditingEnd(false);
    const parsed = parseSRTTime(endInput);
    if (!isNaN(parsed) && parsed > subtitle.start) {
      onUpdate(subtitle.id, { end: parseFloat(parsed.toFixed(3)) });
    } else {
      setEndInput(formatSRTTime(subtitle.end));
    }
  };

  const durationSecs = (subtitle.end - subtitle.start).toFixed(2);

  return (
    <div
      id={`subtitle-row-${subtitle.id}`}
      className={`rounded-xl border transition-all duration-200 p-3.5 space-y-3 ${
        isActive
          ? 'bg-[#181524] border-purple-500 shadow-lg shadow-purple-950/40 ring-1 ring-purple-500/50'
          : isSelected
          ? 'bg-[#151A22] border-slate-600'
          : 'bg-[#11151A] border-[#252A31] hover:border-slate-700'
      }`}
    >
      {/* Top Meta Line: Number, Jump Play, Duration, and Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#252A31]/60 pb-2">
        <div className="flex items-center gap-2">
          {/* Subtitle Index Pill */}
          <span
            className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
              isActive
                ? 'bg-purple-600 text-white'
                : 'bg-[#1A202C] text-slate-300 border border-[#252A31]'
            }`}
          >
            #{String(subtitle.id).padStart(2, '0')}
          </span>

          {/* Jump Play Button */}
          <button
            type="button"
            onClick={() => onJumpTo(subtitle.start)}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-300 hover:text-purple-300 bg-[#161B22] hover:bg-[#1E2530] px-2 py-0.5 rounded border border-[#252A31] transition-colors"
            title="Play from this subtitle start"
          >
            <Play className="w-3 h-3 fill-current text-purple-400" />
            <span>Play</span>
          </button>

          <span className="text-[11px] font-mono-numbers text-slate-400">
            {durationSecs}s duration
          </span>
        </div>

        {/* Row Operations */}
        <div className="flex items-center gap-1">
          {/* Split */}
          <button
            type="button"
            onClick={() => onSplit(subtitle.id)}
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-[#161B22] hover:bg-[#1E2530] text-slate-300 hover:text-white border border-[#252A31] transition-colors"
            title="Split subtitle into two"
          >
            <Scissors className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Split</span>
          </button>

          {/* Merge with next */}
          {!isLast && (
            <button
              type="button"
              onClick={() => onMergeWithNext(subtitle.id)}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-[#161B22] hover:bg-[#1E2530] text-slate-300 hover:text-white border border-[#252A31] transition-colors"
              title="Merge with next subtitle"
            >
              <Combine className="w-3 h-3 text-indigo-400" />
              <span className="hidden sm:inline">Merge</span>
            </button>
          )}

          {/* Delete */}
          <button
            type="button"
            onClick={() => onDelete(subtitle.id)}
            className="p-1 rounded bg-[#161B22] hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 border border-[#252A31] hover:border-rose-800/40 transition-colors"
            title="Delete subtitle"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Body: Timestamp Controls & Text Input */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
        {/* Left: Timing Controls (5 cols) */}
        <div className="md:col-span-5 space-y-2 bg-[#0B0D10]/80 p-2.5 rounded-lg border border-[#252A31]">
          {/* Start Timestamp Control */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-semibold tracking-wider uppercase text-[10px]">
                START
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onSetStartToCurrent(subtitle.id)}
                  className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 hover:underline"
                  title="Set Start ke posisi pemutaran audio saat ini"
                >
                  <Target className="w-2.5 h-2.5" />
                  <span>Set Saat Ini</span>
                </button>
                {onSnapStartAndShiftRest && (
                  <button
                    type="button"
                    onClick={() => onSnapStartAndShiftRest(subtitle.id)}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-medium hover:underline"
                    title="Set baris ini ke audio saat ini DAN geser semua baris lirik berikutnya (cocok setelah jeda instrumen)"
                  >
                    & Geser Seterusnya
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {isEditingStart ? (
                <input
                  type="text"
                  value={startInput}
                  onChange={(e) => setStartInput(e.target.value)}
                  onBlur={handleStartBlur}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartBlur()}
                  autoFocus
                  className="w-24 bg-[#161B22] border border-purple-500 rounded px-1.5 py-0.5 text-xs font-mono-numbers text-white focus:outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingStart(true)}
                  className="w-24 text-left font-mono-numbers text-xs text-purple-300 bg-[#161B22] px-1.5 py-0.5 rounded border border-[#252A31] hover:border-purple-500/60"
                  title="Click to type exact timestamp"
                >
                  {formatSRTTime(subtitle.start)}
                </button>
              )}

              {/* Micro buttons */}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => adjustTime('start', -0.5)}
                  className="px-1 py-0.5 text-[10px] font-mono rounded bg-[#161B22] text-slate-400 hover:text-white border border-[#252A31]"
                >
                  -0.5
                </button>
                <button
                  type="button"
                  onClick={() => adjustTime('start', -0.1)}
                  className="px-1 py-0.5 text-[10px] font-mono rounded bg-[#161B22] text-slate-400 hover:text-white border border-[#252A31]"
                >
                  -0.1
                </button>
                <button
                  type="button"
                  onClick={() => adjustTime('start', 0.1)}
                  className="px-1 py-0.5 text-[10px] font-mono rounded bg-[#161B22] text-slate-400 hover:text-white border border-[#252A31]"
                >
                  +0.1
                </button>
                <button
                  type="button"
                  onClick={() => adjustTime('start', 0.5)}
                  className="px-1 py-0.5 text-[10px] font-mono rounded bg-[#161B22] text-slate-400 hover:text-white border border-[#252A31]"
                >
                  +0.5
                </button>
              </div>
            </div>
          </div>

          {/* End Timestamp Control */}
          <div className="space-y-1 pt-1 border-t border-[#252A31]/50">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-semibold tracking-wider uppercase text-[10px]">
                END
              </span>
              <button
                type="button"
                onClick={() => onSetEndToCurrent(subtitle.id)}
                className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 hover:underline"
                title="Set End to current audio playback position"
              >
                <Target className="w-2.5 h-2.5" />
                <span>Set to Current Time</span>
              </button>
            </div>

            <div className="flex items-center gap-1">
              {isEditingEnd ? (
                <input
                  type="text"
                  value={endInput}
                  onChange={(e) => setEndInput(e.target.value)}
                  onBlur={handleEndBlur}
                  onKeyDown={(e) => e.key === 'Enter' && handleEndBlur()}
                  autoFocus
                  className="w-24 bg-[#161B22] border border-purple-500 rounded px-1.5 py-0.5 text-xs font-mono-numbers text-white focus:outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingEnd(true)}
                  className="w-24 text-left font-mono-numbers text-xs text-slate-200 bg-[#161B22] px-1.5 py-0.5 rounded border border-[#252A31] hover:border-purple-500/60"
                  title="Click to type exact timestamp"
                >
                  {formatSRTTime(subtitle.end)}
                </button>
              )}

              {/* Micro buttons */}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => adjustTime('end', -0.5)}
                  className="px-1 py-0.5 text-[10px] font-mono rounded bg-[#161B22] text-slate-400 hover:text-white border border-[#252A31]"
                >
                  -0.5
                </button>
                <button
                  type="button"
                  onClick={() => adjustTime('end', -0.1)}
                  className="px-1 py-0.5 text-[10px] font-mono rounded bg-[#161B22] text-slate-400 hover:text-white border border-[#252A31]"
                >
                  -0.1
                </button>
                <button
                  type="button"
                  onClick={() => adjustTime('end', 0.1)}
                  className="px-1 py-0.5 text-[10px] font-mono rounded bg-[#161B22] text-slate-400 hover:text-white border border-[#252A31]"
                >
                  +0.1
                </button>
                <button
                  type="button"
                  onClick={() => adjustTime('end', 0.5)}
                  className="px-1 py-0.5 text-[10px] font-mono rounded bg-[#161B22] text-slate-400 hover:text-white border border-[#252A31]"
                >
                  +0.5
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Subtitle Text Input (7 cols) */}
        <div className="md:col-span-7 space-y-1">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            LYRIC PHRASE
          </label>
          <textarea
            value={subtitle.text}
            onChange={(e) => onUpdate(subtitle.id, { text: e.target.value })}
            rows={2}
            dir={isRtl ? 'rtl' : 'auto'}
            className={`w-full bg-[#0B0D10] border rounded-lg p-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-y transition-colors leading-relaxed ${
              isRtl ? 'font-arabic text-base' : 'font-sans'
            } ${
              isActive
                ? 'border-purple-500/70 bg-[#0F0E17]'
                : 'border-[#252A31] focus:border-purple-500'
            }`}
            placeholder="Enter lyric subtitle text..."
          />
        </div>
      </div>
    </div>
  );
};
