import React, { useState } from 'react';
import { SubtitleSegment, LyricSettings, PreviewPosition, PreviewFont, PreviewAlign } from '../types/lyrics';
import { 
  Settings2, 
  Type, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Bold, 
  Italic, 
  Eye, 
  Maximize2 
} from 'lucide-react';

interface PreviewPanelProps {
  activeSubtitle: SubtitleSegment | null;
  subtitles?: SubtitleSegment[];
  currentTime: number;
  isPlaying: boolean;
  settings: LyricSettings;
  onUpdateSettings: (newSettings: Partial<LyricSettings>) => void;
  onJumpTo?: (seconds: number) => void;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  activeSubtitle,
  subtitles = [],
  currentTime,
  isPlaying,
  settings,
  onUpdateSettings,
  onJumpTo,
}) => {
  const [showStyleControls, setShowStyleControls] = useState(false);

  // Position classes
  const positionClasses: Record<PreviewPosition, string> = {
    top: 'justify-start pt-6',
    center: 'justify-center',
    bottom: 'justify-end pb-8',
  };

  // Font family classes
  const fontClasses: Record<PreviewFont, string> = {
    'plus-jakarta': 'font-sans',
    amiri: 'font-arabic text-right',
    outfit: 'font-["Outfit",sans-serif]',
    mono: 'font-mono',
  };

  // Text alignment
  const alignClasses: Record<PreviewAlign, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const isRtl = activeSubtitle?.text && /[\u0600-\u06FF]/.test(activeSubtitle.text);

  // Find upcoming subtitle during instrumental interludes
  const upcomingSubtitle = !activeSubtitle
    ? subtitles.find((s) => s.start > currentTime)
    : null;
  const timeToNext = upcomingSubtitle ? (upcomingSubtitle.start - currentTime) : null;
  const upcomingIsRtl = upcomingSubtitle?.text && /[\u0600-\u06FF]/.test(upcomingSubtitle.text);

  return (
    <div className="bg-[#11151A] rounded-xl border border-[#252A31] overflow-hidden shadow-xl flex flex-col">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161B22] border-b border-[#252A31]">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-semibold text-slate-200">Cinematic Lyric Preview</span>
          {activeSubtitle && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
              #{activeSubtitle.id}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowStyleControls(!showStyleControls)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors ${
            showStyleControls
              ? 'bg-purple-600/20 border-purple-500/40 text-purple-200'
              : 'bg-[#181D24] border-[#252A31] text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>Style</span>
        </button>
      </div>

      {/* Style Controls Drawer (Collapsible) */}
      {showStyleControls && (
        <div className="p-3 bg-[#0E1217] border-b border-[#252A31] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs animate-in fade-in duration-150">
          {/* Font Selector */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-medium">Font Family</label>
            <select
              value={settings.font}
              onChange={(e) => onUpdateSettings({ font: e.target.value as PreviewFont })}
              className="w-full bg-[#161B22] border border-[#252A31] rounded px-2 py-1 text-slate-200 text-xs focus:outline-none"
            >
              <option value="plus-jakarta">Modern Sans</option>
              <option value="amiri">Amiri (Arabic)</option>
              <option value="outfit">Outfit Display</option>
              <option value="mono">JetBrains Mono</option>
            </select>
          </div>

          {/* Font Size */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Size</span>
              <span className="font-mono">{settings.fontSize}px</span>
            </div>
            <input
              type="range"
              min={18}
              max={42}
              value={settings.fontSize}
              onChange={(e) => onUpdateSettings({ fontSize: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-[#1A202C] rounded-lg accent-purple-500"
            />
          </div>

          {/* Position Selector */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-medium">Position</label>
            <div className="flex bg-[#161B22] p-0.5 rounded border border-[#252A31]">
              {(['top', 'center', 'bottom'] as PreviewPosition[]).map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => onUpdateSettings({ position: pos })}
                  className={`flex-1 py-0.5 text-[10px] capitalize rounded ${
                    settings.position === pos ? 'bg-purple-600 text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles (Bold, Italic, Box, Shadow) */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400 font-medium">Modifiers</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onUpdateSettings({ bold: !settings.bold })}
                className={`p-1.5 rounded border text-xs ${
                  settings.bold
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'bg-[#161B22] text-slate-400 border-[#252A31]'
                }`}
                title="Bold"
              >
                <Bold className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ italic: !settings.italic })}
                className={`p-1.5 rounded border text-xs ${
                  settings.italic
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'bg-[#161B22] text-slate-400 border-[#252A31]'
                }`}
                title="Italic"
              >
                <Italic className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ background: !settings.background })}
                className={`px-2 py-1 rounded border text-[10px] font-medium ${
                  settings.background
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'bg-[#161B22] text-slate-400 border-[#252A31]'
                }`}
                title="Dark Background Plate"
              >
                Box
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ shadow: !settings.shadow })}
                className={`px-2 py-1 rounded border text-[10px] font-medium ${
                  settings.shadow
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'bg-[#161B22] text-slate-400 border-[#252A31]'
                }`}
                title="Text Shadow & Glow"
              >
                Glow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cinematic Preview Screen */}
      <div
        className={`relative w-full h-44 sm:h-52 bg-gradient-to-b from-[#0A0C10] via-[#08090C] to-[#040507] p-6 flex flex-col ${positionClasses[settings.position]} items-center overflow-hidden`}
      >
        {/* Subtle background audio atmosphere */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute -top-12 left-1/3 w-64 h-64 bg-purple-900/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 right-1/3 w-64 h-64 bg-indigo-900/30 rounded-full blur-3xl" />
        </div>

        {/* Ambient audio visualizer bars along bottom */}
        {isPlaying && (
          <div className="absolute bottom-1 left-0 right-0 flex justify-center items-end gap-1 h-8 opacity-30 pointer-events-none">
            {[40, 65, 85, 45, 95, 70, 30, 50, 75, 90, 60, 40, 80, 55].map((h, i) => (
              <div
                key={i}
                className="w-1 bg-purple-400 rounded-t transition-all duration-100 animate-pulse"
                style={{ height: `${(h * (Math.sin(currentTime * 5 + i) * 0.4 + 0.6)).toFixed(0)}%` }}
              />
            ))}
          </div>
        )}

        {/* The Live Subtitle Element */}
        <div className="relative z-10 max-w-xl mx-auto px-4 transition-all duration-200">
          {activeSubtitle ? (
            <div
              dir={isRtl ? 'rtl' : 'auto'}
              className={`transition-all duration-150 leading-snug tracking-wide ${fontClasses[settings.font]} ${alignClasses[settings.alignment]} ${
                settings.bold ? 'font-bold' : 'font-normal'
              } ${settings.italic ? 'italic' : ''} ${
                settings.background
                  ? 'bg-black/80 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10 shadow-2xl'
                  : ''
              } ${
                settings.shadow
                  ? 'drop-shadow-[0_4px_16px_rgba(168,85,247,0.7)] text-white'
                  : 'text-slate-100'
              }`}
              style={{ fontSize: `${settings.fontSize}px` }}
            >
              {activeSubtitle.text}
            </div>
          ) : upcomingSubtitle ? (
            <div className="text-center space-y-2 select-none animate-in fade-in duration-200">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/40 border border-purple-800/40 text-purple-300 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                <span>Bagian Musik / Instrumental</span>
                {timeToNext !== null && timeToNext > 0 && (
                  <span className="font-mono text-purple-200 font-bold ml-1">
                    (Lirik masuk dlm {timeToNext.toFixed(1)}s)
                  </span>
                )}
              </div>
              <div
                dir={upcomingIsRtl ? 'rtl' : 'auto'}
                className={`text-slate-400 opacity-80 text-sm sm:text-base leading-relaxed max-w-md mx-auto italic ${fontClasses[settings.font]}`}
              >
                "{upcomingSubtitle.text}"
              </div>
              {onJumpTo && (
                <button
                  type="button"
                  onClick={() => onJumpTo(upcomingSubtitle.start)}
                  className="text-[11px] text-purple-400 hover:text-purple-300 underline underline-offset-4 cursor-pointer pt-1"
                >
                  Loncat langsung ke lirik ini (▶ {upcomingSubtitle.start.toFixed(1)}s)
                </button>
              )}
            </div>
          ) : (
            <div className="text-center text-slate-500 text-xs italic select-none">
              {isPlaying ? '— Bagian Musik / Instrumental —' : 'Putar audio atau geser durasi untuk melihat lirik tersinkronisasi'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
