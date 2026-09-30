import React, { useState, useMemo } from 'react';
import { SubtitleSegment } from '../types/lyrics';
import { generateSRT, downloadFile, formatSRTTime } from '../utils/srt';
import { Copy, Download, Check, FileText, Layers } from 'lucide-react';

interface SRTPreviewProps {
  subtitles: SubtitleSegment[];
  songTitle: string;
  duration: number;
  includeSections: boolean;
  onToggleIncludeSections: () => void;
  onExportSRT: () => void;
}

export const SRTPreview: React.FC<SRTPreviewProps> = ({
  subtitles,
  songTitle,
  duration,
  includeSections,
  onToggleIncludeSections,
  onExportSRT,
}) => {
  const [copied, setCopied] = useState(false);

  const srtContent = useMemo(() => {
    return generateSRT(subtitles, { includeSections });
  }, [subtitles, includeSections]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(srtContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const lineCount = srtContent.split('\n').length;
  const wordCount = srtContent.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="bg-[#11151A] rounded-xl border border-[#252A31] p-4 space-y-4 shadow-xl">
      {/* Header with Stats & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#252A31] pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <h3 className="font-semibold text-sm text-slate-100">Raw SRT Subtitle Stream</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono-numbers">
            <span>{subtitles.length} cues</span>
            <span aria-hidden="true">·</span>
            <span>{lineCount} lines</span>
            <span aria-hidden="true">·</span>
            <span>{wordCount} words</span>
            <span aria-hidden="true">·</span>
            <span>UTF-8</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Section labels toggle */}
          <button
            type="button"
            onClick={onToggleIncludeSections}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
              includeSections
                ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                : 'bg-[#161B22] border-[#252A31] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Sections: {includeSections ? 'ON' : 'OFF'}</span>
          </button>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#181D24] text-slate-200 hover:text-white border border-[#252A31] hover:border-slate-600 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-purple-400" />
                <span>Copy SRT</span>
              </>
            )}
          </button>

          {/* Export SRT File */}
          <button
            type="button"
            onClick={onExportSRT}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .SRT</span>
          </button>
        </div>
      </div>

      {/* Code Textarea View */}
      <div className="relative rounded-xl overflow-hidden border border-[#252A31] bg-[#0B0D10]">
        <div className="absolute top-2 right-3 text-[10px] font-mono text-slate-500 uppercase">
          Standard SubRip (.srt)
        </div>
        <pre className="p-4 text-xs font-mono leading-relaxed text-slate-200 overflow-x-auto max-h-[520px] select-all whitespace-pre-wrap">
          {srtContent || '// No subtitles generated yet.'}
        </pre>
      </div>
    </div>
  );
};
