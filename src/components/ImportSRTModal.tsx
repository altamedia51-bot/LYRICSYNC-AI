import React, { useState, ChangeEvent } from 'react';
import { FileUp, X, Check, AlertCircle } from 'lucide-react';
import { parseSRT } from '../utils/srt';
import { SubtitleSegment } from '../types/lyrics';

interface ImportSRTModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (subtitles: SubtitleSegment[]) => void;
}

export const ImportSRTModal: React.FC<ImportSRTModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [rawText, setRawText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleParseAndImport = () => {
    setErrorMsg(null);
    if (!rawText.trim()) {
      setErrorMsg('Please paste SRT content or select an .srt file.');
      return;
    }

    try {
      const parsed = parseSRT(rawText);
      if (parsed.length === 0) {
        setErrorMsg('Could not find any valid subtitle blocks in the provided text.');
        return;
      }
      onImport(parsed);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse SRT file.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#11151A] border border-[#252A31] rounded-2xl shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#252A31] pb-3">
          <div className="flex items-center gap-2">
            <FileUp className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-base text-white">Import Existing SRT Subtitles</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#1A202C]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Upload file or paste */}
        <div className="space-y-3">
          <label className="text-xs text-slate-300 font-medium block">
            Upload .srt file or paste raw subtitle text:
          </label>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer px-4 py-2 rounded-xl bg-[#161B22] border border-[#252A31] hover:border-purple-500/50 text-xs font-semibold text-slate-200 hover:text-white transition-colors">
              Choose .SRT File
              <input
                type="file"
                accept=".srt,text/plain"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <span className="text-xs text-slate-500">or paste directly below</span>
          </div>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={8}
            placeholder={`1\n00:00:03,250 --> 00:00:07,420\nيا من أضاء الكون بالأنوار\n\n2\n00:00:07,420 --> 00:00:11,800\nقلبٌ حزينٌ يرتجي الأخبار`}
            className="w-full bg-[#0B0D10] border border-[#252A31] focus:border-purple-500 rounded-xl p-3 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none resize-y"
          />

          {errorMsg && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Actions */}
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
            onClick={handleParseAndImport}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md transition-colors flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Load into Editor</span>
          </button>
        </div>
      </div>
    </div>
  );
};
