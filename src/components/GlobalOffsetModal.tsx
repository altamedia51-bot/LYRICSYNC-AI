import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, X, Check, ArrowRight, Target, Clock } from 'lucide-react';
import { formatSRTTime } from '../utils/srt';
import { SubtitleSegment } from '../types/lyrics';

interface GlobalOffsetModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtitles: SubtitleSegment[];
  currentTime: number;
  onApplyOffset: (deltaSeconds: number, fromSubtitleId?: number) => void;
}

export const GlobalOffsetModal: React.FC<GlobalOffsetModalProps> = ({
  isOpen,
  onClose,
  subtitles,
  currentTime,
  onApplyOffset,
}) => {
  const [scope, setScope] = useState<'all' | 'from_selected'>('all');
  const [selectedSubId, setSelectedSubId] = useState<number>(1);
  const [offsetSeconds, setOffsetSeconds] = useState<number>(0);

  // If user opened modal while audio is playing at e.g. 01:22, auto-select nearest subtitle
  useEffect(() => {
    if (subtitles.length > 0) {
      const match = subtitles.find((s) => s.start >= currentTime) || subtitles[0];
      setSelectedSubId(match.id);
    }
  }, [isOpen, subtitles, currentTime]);

  if (!isOpen) return null;

  const handleApply = () => {
    const fromId = scope === 'from_selected' ? selectedSubId : undefined;
    onApplyOffset(offsetSeconds, fromId);
    onClose();
  };

  // Quick snap from current audio time:
  // e.g. if subtitle #8 was at 01:22, but audio is currently at 01:45, delta = 01:45 - 01:22 = +23s
  const selectedSub = subtitles.find((s) => s.id === selectedSubId) || subtitles[0];
  const audioSnapDelta = selectedSub ? parseFloat((currentTime - selectedSub.start).toFixed(3)) : 0;

  const sampleSub = scope === 'from_selected' ? selectedSub : subtitles[0];
  const sampleNewStart = sampleSub ? Math.max(0, sampleSub.start + offsetSeconds) : 0;
  const sampleNewEnd = sampleSub ? Math.max(0.5, sampleSub.end + offsetSeconds) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#11151A] border border-[#252A31] rounded-2xl shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#252A31] pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-base text-white">Alat Penyelarasan Waktu & Jeda Musik</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#1A202C]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scope Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Pilih Cakupan Pergeseran:</label>
          <div className="grid grid-cols-2 gap-2 bg-[#0B0D10] p-1 rounded-xl border border-[#252A31]">
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                scope === 'all'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semua Subtitle (All)
            </button>
            <button
              type="button"
              onClick={() => setScope('from_selected')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                scope === 'from_selected'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mulai dari Baris Ini ke Bawah
            </button>
          </div>
        </div>

        {/* If from_selected: pick starting subtitle */}
        {scope === 'from_selected' && (
          <div className="space-y-1 bg-[#161B22] p-3 rounded-xl border border-[#252A31]">
            <label className="text-[11px] text-slate-300 font-medium flex items-center justify-between">
              <span>Mulai dari Subtitle (Titik Selesai Instrumen):</span>
              <span className="text-purple-300 font-mono text-[10px]">
                {subtitles.filter((s) => s.id >= selectedSubId).length} baris terpengaruh
              </span>
            </label>
            <select
              value={selectedSubId}
              onChange={(e) => setSelectedSubId(parseInt(e.target.value, 10))}
              className="w-full bg-[#0B0D10] border border-[#252A31] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              {subtitles.map((s) => (
                <option key={s.id} value={s.id}>
                  #{String(s.id).padStart(2, '0')} [{formatSRTTime(s.start)}] - {s.text.slice(0, 45)}
                </option>
              ))}
            </select>

            {/* Quick Snap to Audio Time Button */}
            {currentTime > 0 && Math.abs(audioSnapDelta) > 0.1 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setOffsetSeconds(audioSnapDelta)}
                  className="w-full py-2 px-3 rounded-lg bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    Snap ke Detik Audio Saat Ini ({formatSRTTime(currentTime)}) : Geser{' '}
                    <strong className="font-mono text-white">
                      {audioSnapDelta >= 0 ? `+${audioSnapDelta.toFixed(2)}s` : `${audioSnapDelta.toFixed(2)}s`}
                    </strong>
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Quick Shift Buttons */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Tombol Cepat Geser Waktu:</span>
            <span className="font-mono text-purple-300 font-bold">
              {offsetSeconds >= 0 ? `+${offsetSeconds.toFixed(2)}s` : `${offsetSeconds.toFixed(2)}s`}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-xs font-mono">
            {[-10, -5, -2, -1].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setOffsetSeconds((prev) => parseFloat((prev + s).toFixed(3)))}
                className="py-1.5 rounded-lg bg-[#161B22] border border-[#252A31] hover:border-purple-500/50 hover:text-purple-300 transition-colors text-slate-300"
              >
                {s}s
              </button>
            ))}
            {[+1, +2, +5, +10].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setOffsetSeconds((prev) => parseFloat((prev + s).toFixed(3)))}
                className="py-1.5 rounded-lg bg-[#161B22] border border-[#252A31] hover:border-purple-500/50 hover:text-purple-300 transition-colors text-slate-300"
              >
                +{s}s
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-[11px] font-mono pt-1">
            {[-0.5, -0.1, 0.1, 0.5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setOffsetSeconds((prev) => parseFloat((prev + s).toFixed(3)))}
                className="py-1 rounded bg-[#0E1217] border border-[#252A31] hover:text-white text-slate-400"
              >
                {s > 0 ? `+${s}s` : `${s}s`}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input */}
        <div className="flex items-center gap-2 bg-[#0B0D10] p-2.5 rounded-xl border border-[#252A31]">
          <span className="text-xs text-slate-400 whitespace-nowrap">Input Detik Manual:</span>
          <input
            type="number"
            step={0.1}
            value={offsetSeconds}
            onChange={(e) => setOffsetSeconds(parseFloat(e.target.value) || 0)}
            className="w-full bg-[#161B22] border border-[#252A31] rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
          />
          <button
            type="button"
            onClick={() => setOffsetSeconds(0)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-[#161B22] text-slate-400 hover:text-white border border-[#252A31]"
          >
            Reset
          </button>
        </div>

        {/* Live Preview on Sample Subtitle */}
        {sampleSub && (
          <div className="p-3 rounded-xl bg-[#161B22] border border-[#252A31] space-y-1.5 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">
              Pratinjau Hasil pada Subtitle #{sampleSub.id} ({sampleSub.text.slice(0, 30)}...):
            </span>
            <div className="flex items-center gap-2 font-mono text-slate-300">
              <span className="line-through text-slate-500">{formatSRTTime(sampleSub.start)}</span>
              <ArrowRight className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="text-purple-300 font-bold">{formatSRTTime(sampleNewStart)}</span>
              <span className="text-[11px] text-slate-500 ml-1">
                ({offsetSeconds >= 0 ? `+${offsetSeconds.toFixed(2)}s` : `${offsetSeconds.toFixed(2)}s`})
              </span>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#252A31]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={offsetSeconds === 0}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md disabled:opacity-40 transition-colors flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Terapkan Pergeseran</span>
          </button>
        </div>
      </div>
    </div>
  );
};
