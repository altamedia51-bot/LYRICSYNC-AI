import React from 'react';
import { 
  Music2, 
  FileUp, 
  SlidersHorizontal, 
  RotateCcw, 
  Download, 
  Sparkles, 
  Languages, 
  FileText,
  KeyRound 
} from 'lucide-react';
import { formatSRTTime } from '../utils/srt';

interface HeaderProps {
  songTitle: string;
  duration: number;
  subtitleCount: number;
  activeTab: 'editor' | 'srt_preview';
  setActiveTab: (tab: 'editor' | 'srt_preview') => void;
  onOpenImportSRT: () => void;
  onOpenOffsetModal: () => void;
  onResetProject: () => void;
  onExportSRT: () => void;
  onLoadDemoTrack: (type: 'arabic' | 'english' | 'indonesian') => void;
  isProcessing: boolean;
  onOpenApiKeyModal?: () => void;
  hasCustomApiKey?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  songTitle,
  duration,
  subtitleCount,
  activeTab,
  setActiveTab,
  onOpenImportSRT,
  onOpenOffsetModal,
  onResetProject,
  onExportSRT,
  onLoadDemoTrack,
  isProcessing,
  onOpenApiKeyModal,
  hasCustomApiKey,
}) => {
  return (
    <header className="border-b border-[#252A31] bg-[#11151A]/95 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-900/30">
            <Music2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white font-sans">
                LYRICSYNC <span className="text-purple-400 font-extrabold">AI</span>
              </span>
              <span className="text-[11px] font-mono uppercase bg-purple-500/10 text-purple-300 border border-purple-500/20 px-1.5 py-0.5 rounded">
                MP3 → SRT
              </span>
            </div>
            {songTitle ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 truncate max-w-[280px] sm:max-w-md">
                <span className="truncate text-slate-200 font-medium">{songTitle}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-numbers">{formatSRTTime(duration)}</span>
                <span aria-hidden="true">·</span>
                <span>{subtitleCount} lines</span>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Song Lyric & Subtitle Synchronizer</p>
            )}
          </div>
        </div>

        {/* View Switcher Tabs */}
        {subtitleCount > 0 && (
          <div className="flex items-center bg-[#0B0D10] p-1 rounded-lg border border-[#252A31]">
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'editor'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Editor
            </button>
            <button
              onClick={() => setActiveTab('srt_preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'srt_preview'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              SRT Output
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Demo Dropdown */}
          <div className="relative group">
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#181D24] text-slate-300 hover:text-white border border-[#252A31] hover:border-slate-600 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Load Demo</span>
            </button>
            <div className="absolute right-0 mt-1 w-52 bg-[#161B22] border border-[#252A31] rounded-xl shadow-2xl py-1.5 hidden group-hover:block z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Sample Tracks
              </div>
              <button
                onClick={() => onLoadDemoTrack('arabic')}
                className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-purple-600/20 hover:text-purple-200 flex items-center justify-between"
              >
                <span>Arabic Nasheed (نور الهدى)</span>
                <span className="text-[10px] text-purple-400 font-mono">AR</span>
              </button>
              <button
                onClick={() => onLoadDemoTrack('english')}
                className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-purple-600/20 hover:text-purple-200 flex items-center justify-between"
              >
                <span>Midnight Serenade</span>
                <span className="text-[10px] text-purple-400 font-mono">EN</span>
              </button>
              <button
                onClick={() => onLoadDemoTrack('indonesian')}
                className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-purple-600/20 hover:text-purple-200 flex items-center justify-between"
              >
                <span>Senandung Senja</span>
                <span className="text-[10px] text-purple-400 font-mono">ID</span>
              </button>
            </div>
          </div>

          {/* Import SRT */}
          <button
            onClick={onOpenImportSRT}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#181D24] text-slate-300 hover:text-white border border-[#252A31] hover:border-slate-600 transition-colors"
            title="Import existing .SRT file"
          >
            <FileUp className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Import SRT</span>
          </button>

          {/* API Key BYOK button */}
          {onOpenApiKeyModal && (
            <button
              onClick={onOpenApiKeyModal}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                hasCustomApiKey
                  ? 'bg-purple-950/40 text-purple-300 border-purple-500/50 hover:bg-purple-900/50'
                  : 'bg-[#181D24] text-slate-300 hover:text-white border-[#252A31] hover:border-slate-600'
              }`}
              title="Atur Gemini API Key (BYOK untuk Vercel / Pribadi)"
            >
              <KeyRound className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Kunci API</span>
              {hasCustomApiKey && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Kunci pribadi aktif" />
              )}
            </button>
          )}

          {/* Global Offset Tool */}
          {subtitleCount > 0 && (
            <button
              onClick={onOpenOffsetModal}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#181D24] text-slate-300 hover:text-white border border-[#252A31] hover:border-slate-600 transition-colors"
              title="Adjust global timestamp offset"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden md:inline">Offset</span>
            </button>
          )}

          {/* Reset / New Project */}
          {subtitleCount > 0 && (
            <button
              onClick={onResetProject}
              className="p-1.5 rounded-lg bg-[#181D24] text-slate-400 hover:text-rose-400 border border-[#252A31] hover:border-rose-900/50 transition-colors"
              title="Start New Project"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {/* Primary Export SRT Button */}
          {subtitleCount > 0 && (
            <button
              onClick={onExportSRT}
              disabled={isProcessing}
              className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-950 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT SRT</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
