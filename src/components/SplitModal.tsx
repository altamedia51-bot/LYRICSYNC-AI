import React, { useState } from 'react';
import { SubtitleSegment } from '../types/lyrics';
import { formatSRTTime } from '../utils/srt';
import { Scissors, X, Check } from 'lucide-react';

interface SplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtitle: SubtitleSegment | null;
  currentTime: number;
  onConfirmSplit: (splitTime: number, firstText: string, secondText: string) => void;
}

export const SplitModal: React.FC<SplitModalProps> = ({
  isOpen,
  onClose,
  subtitle,
  currentTime,
  onConfirmSplit,
}) => {
  if (!isOpen || !subtitle) return null;

  // Split point default: current audio cursor if between start and end, otherwise midpoint
  const defaultSplitTime =
    currentTime > subtitle.start && currentTime < subtitle.end
      ? parseFloat(currentTime.toFixed(3))
      : parseFloat(((subtitle.start + subtitle.end) / 2).toFixed(3));

  const [splitTime, setSplitTime] = useState<number>(defaultSplitTime);

  // Divide words roughly proportionally
  const words = subtitle.text.trim().split(/\s+/);
  const midWordIndex = Math.max(1, Math.floor(words.length / 2));
  const defaultPart1 = words.slice(0, midWordIndex).join(' ');
  const defaultPart2 = words.slice(midWordIndex).join(' ');

  const [part1Text, setPart1Text] = useState<string>(defaultPart1);
  const [part2Text, setPart2Text] = useState<string>(defaultPart2);

  const isRtl = /[\u0600-\u06FF]/.test(subtitle.text);

  const handleConfirm = () => {
    onConfirmSplit(splitTime, part1Text.trim(), part2Text.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#11151A] border border-[#252A31] rounded-2xl shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#252A31] pb-3">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-white">
              Split Subtitle #{subtitle.id}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#1A202C]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Original Text Reference */}
        <div className="p-3 rounded-xl bg-[#0B0D10] border border-[#252A31] space-y-1">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Original Phrase ({formatSRTTime(subtitle.start)} → {formatSRTTime(subtitle.end)})
          </span>
          <p dir={isRtl ? 'rtl' : 'auto'} className="text-xs text-slate-300 font-medium">
            {subtitle.text}
          </p>
        </div>

        {/* Split Timestamp Slider */}
        <div className="space-y-1.5 bg-[#161B22] p-3.5 rounded-xl border border-[#252A31]">
          <div className="flex justify-between text-xs text-slate-300 font-mono-numbers">
            <span>Split Cut Timestamp</span>
            <span className="text-purple-300 font-bold">{formatSRTTime(splitTime)}</span>
          </div>
          <input
            type="range"
            min={subtitle.start + 0.2}
            max={subtitle.end - 0.2}
            step={0.05}
            value={splitTime}
            onChange={(e) => setSplitTime(parseFloat(e.target.value))}
            className="w-full h-2 bg-[#0B0D10] rounded-lg accent-purple-500"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>Start: {formatSRTTime(subtitle.start)}</span>
            <span>End: {formatSRTTime(subtitle.end)}</span>
          </div>
        </div>

        {/* Two Part Textboxes */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">First Segment</span>
              <span className="font-mono text-purple-300">
                {formatSRTTime(subtitle.start)} → {formatSRTTime(splitTime)}
              </span>
            </div>
            <input
              type="text"
              value={part1Text}
              dir={isRtl ? 'rtl' : 'auto'}
              onChange={(e) => setPart1Text(e.target.value)}
              className="w-full bg-[#0B0D10] border border-[#252A31] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Second Segment</span>
              <span className="font-mono text-purple-300">
                {formatSRTTime(splitTime)} → {formatSRTTime(subtitle.end)}
              </span>
            </div>
            <input
              type="text"
              value={part2Text}
              dir={isRtl ? 'rtl' : 'auto'}
              onChange={(e) => setPart2Text(e.target.value)}
              className="w-full bg-[#0B0D10] border border-[#252A31] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#252A31]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md transition-colors flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Split into 2 Subtitles</span>
          </button>
        </div>
      </div>
    </div>
  );
};
