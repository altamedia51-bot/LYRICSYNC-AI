import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { 
  UploadCloud, 
  Music, 
  FileAudio, 
  FileText, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Globe, 
  Layers 
} from 'lucide-react';

interface UploadZoneProps {
  onAudioSelected: (file: File, options: {
    language: string;
    customLyrics?: string;
    includeSections: boolean;
  }) => void;
  onLoadDemoTrack: (type: 'arabic' | 'english' | 'indonesian') => void;
  isProcessing: boolean;
}

const SUPPORTED_LANGUAGES = [
  { code: 'auto', label: 'Auto Detect' },
  { code: 'ar', label: 'Arabic (العربية)' },
  { code: 'en', label: 'English' },
  { code: 'id', label: 'Indonesian (Bahasa Indonesia)' },
  { code: 'ms', label: 'Malay (Bahasa Melayu)' },
  { code: 'fr', label: 'French (Français)' },
  { code: 'es', label: 'Spanish (Español)' },
  { code: 'tr', label: 'Turkish (Türkçe)' },
  { code: 'ur', label: 'Urdu (اردو)' },
  { code: 'hi', label: 'Hindi (हिन्दी)' },
  { code: 'fa', label: 'Persian (فارسی)' },
  { code: 'other', label: 'Other Language' },
];

export const UploadZone: React.FC<UploadZoneProps> = ({
  onAudioSelected,
  onLoadDemoTrack,
  isProcessing,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<'ai_transcribe' | 'use_lyrics'>('ai_transcribe');
  const [language, setLanguage] = useState('auto');
  const [customLyrics, setCustomLyrics] = useState('');
  const [includeSections, setIncludeSections] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const validateAndProceed = (file: File) => {
    setErrorMsg(null);
    const validExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.webm'];
    const filename = file.name.toLowerCase();
    const isValidExt = validExtensions.some((ext) => filename.endsWith(ext));
    const isAudioMime = file.type.startsWith('audio/') || isValidExt;

    if (!isAudioMime) {
      setErrorMsg('Please select a valid audio file (.mp3, .wav, .m4a, .aac, .flac).');
      return;
    }

    // 50MB size limit
    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg('File size is too large. Please select an audio file under 50MB.');
      return;
    }

    onAudioSelected(file, {
      language,
      customLyrics: mode === 'use_lyrics' ? customLyrics.trim() : undefined,
      includeSections,
    });
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProceed(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProceed(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Main Hero Card */}
      <div className="relative rounded-2xl border border-[#252A31] bg-[#11151A] overflow-hidden shadow-2xl">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-1/4 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-6 sm:p-10 space-y-8">
          {/* Header Typography */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Music-Optimized Vocal Alignment & Segmentation
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-sans">
              LYRICSYNC AI
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              Turn your music into perfectly timed SRT subtitles. Natural musical phrasing, millisecond timestamp precision, and instant export.
            </p>
          </div>

          {/* Mode Configuration Tabs */}
          <div className="bg-[#0B0D10] p-1.5 rounded-xl border border-[#252A31] max-w-lg mx-auto grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setMode('ai_transcribe')}
              className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold transition-all ${
                mode === 'ai_transcribe'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileAudio className="w-4 h-4" />
              AI Transcribe from Audio
            </button>
            <button
              type="button"
              onClick={() => setMode('use_lyrics')}
              className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold transition-all ${
                mode === 'use_lyrics'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              Use My Lyrics (Alignment)
            </button>
          </div>

          {/* User Lyrics Input (if Use My Lyrics selected) */}
          {mode === 'use_lyrics' && (
            <div className="space-y-2 bg-[#0B0D10]/80 p-4 rounded-xl border border-[#252A31] animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <label className="font-semibold flex items-center gap-1.5 text-purple-300">
                  <FileText className="w-4 h-4" />
                  Authoritative Lyrics
                </label>
                <span className="text-[11px] text-slate-400">
                  The AI preserves your exact wording and aligns it to the audio.
                </span>
              </div>
              <textarea
                value={customLyrics}
                onChange={(e) => setCustomLyrics(e.target.value)}
                placeholder="Paste your lyrics here (one line per musical phrase)...&#10;&#10;Example:&#10;يا من أضاء الكون بالأنوار&#10;قلبٌ حزينٌ يرتجي الأخبار&#10;جئتَ إلينا رحمةً للناس"
                rows={6}
                dir="auto"
                className="w-full bg-[#161B22] border border-[#252A31] focus:border-purple-500 rounded-lg p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-y font-sans leading-relaxed"
              />
            </div>
          )}

          {/* Options: Language and Section labels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#0B0D10]/50 p-4 rounded-xl border border-[#252A31]">
            {/* Language Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-purple-400" />
                Song Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-[#161B22] border border-[#252A31] text-xs text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Labels Setting */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                Include Section Labels
              </label>
              <div className="flex items-center justify-between bg-[#161B22] border border-[#252A31] rounded-lg px-3 py-1.5">
                <span className="text-xs text-slate-400">
                  e.g. [Intro], [Verse 1], [Chorus]
                </span>
                <button
                  type="button"
                  onClick={() => setIncludeSections(!includeSections)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${
                    includeSections
                      ? 'bg-purple-600 text-white'
                      : 'bg-[#252A31] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {includeSections ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Drag & Drop Upload Container */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 group ${
              isDragging
                ? 'border-purple-500 bg-purple-600/10 scale-[1.01]'
                : 'border-[#252A31] hover:border-purple-500/60 bg-[#0B0D10]/60 hover:bg-[#0B0D10]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg"
              className="hidden"
            />

            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#161B22] border border-[#252A31] flex items-center justify-center group-hover:scale-110 group-hover:border-purple-500/50 transition-all shadow-inner">
                <UploadCloud className="w-8 h-8 text-purple-400 group-hover:text-purple-300" />
              </div>

              <div className="space-y-1">
                <div className="text-base sm:text-lg font-semibold text-white">
                  Drop your audio file here, or{' '}
                  <span className="text-purple-400 underline decoration-purple-500/40 underline-offset-4">
                    browse
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Supports MP3, WAV, M4A, AAC, and FLAC (up to 50MB)
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs sm:text-sm shadow-lg shadow-purple-900/30 transition-all inline-flex items-center gap-2"
                >
                  <Music className="w-4 h-4" />
                  Upload Audio File
                </button>
              </div>
            </div>
          </div>

          {/* Quick Demo Track Cards */}
          <div className="pt-4 border-t border-[#252A31]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Or try an instant sample song with verified lyrics:
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => onLoadDemoTrack('arabic')}
                className="text-left p-3 rounded-xl bg-[#0B0D10] border border-[#252A31] hover:border-purple-500/50 hover:bg-[#14181E] transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-purple-300">
                    Noor Al Huda (نور الهدى)
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40">
                    AR
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate font-arabic">
                  يا من أضاء الكون بالأنوار...
                </p>
              </button>

              <button
                type="button"
                onClick={() => onLoadDemoTrack('english')}
                className="text-left p-3 rounded-xl bg-[#0B0D10] border border-[#252A31] hover:border-purple-500/50 hover:bg-[#14181E] transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-purple-300">
                    Midnight Serenade
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40">
                    EN
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  Shadows fade when morning arrives...
                </p>
              </button>

              <button
                type="button"
                onClick={() => onLoadDemoTrack('indonesian')}
                className="text-left p-3 rounded-xl bg-[#0B0D10] border border-[#252A31] hover:border-purple-500/50 hover:bg-[#14181E] transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-purple-300">
                    Senandung Senja
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40">
                    ID
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  Lentera malam membimbing langkah...
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
