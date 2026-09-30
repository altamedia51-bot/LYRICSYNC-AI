import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { SubtitleSegment, LyricSettings, ProjectState } from './types/lyrics';
import { 
  formatSRTTime, 
  generateSRT, 
  downloadFile, 
  validateSubtitles, 
  fixSubtitleIssues 
} from './utils/srt';
import { DEMO_TRACKS, generateDemoAudioWav } from './utils/demoData';
import { compressAudioForAI } from './utils/audioCompressor';
import { Header } from './components/Header';
import { UploadZone } from './components/UploadZone';
import { AudioPlayer } from './components/AudioPlayer';
import { Waveform } from './components/Waveform';
import { PreviewPanel } from './components/PreviewPanel';
import { SubtitleEditor } from './components/SubtitleEditor';
import { SRTPreview } from './components/SRTPreview';
import { GlobalOffsetModal } from './components/GlobalOffsetModal';
import { ImportSRTModal } from './components/ImportSRTModal';
import { SplitModal } from './components/SplitModal';
import { ProcessingOverlay } from './components/ProcessingOverlay';
import { ApiKeyModal } from './components/ApiKeyModal';
import { AlertCircle, CheckCircle2, Music, Sparkles, KeyRound } from 'lucide-react';

const DEFAULT_SETTINGS: LyricSettings = {
  includeSections: false,
  font: 'plus-jakarta',
  fontSize: 26,
  position: 'center',
  bold: false,
  italic: false,
  background: true,
  outline: false,
  shadow: true,
  alignment: 'center',
};

export default function App() {
  // Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  // Metadata
  const [songTitle, setSongTitle] = useState<string>('');
  const [filename, setFilename] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [language, setLanguage] = useState<string>('auto');

  // Subtitles
  const [subtitles, setSubtitles] = useState<SubtitleSegment[]>([]);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<number | null>(null);

  // Playback
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // View state & modals
  const [activeTab, setActiveTab] = useState<'editor' | 'srt_preview'>('editor');
  const [settings, setSettings] = useState<LyricSettings>(DEFAULT_SETTINGS);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isResyncing, setIsResyncing] = useState<boolean>(false);
  const [processingMode, setProcessingMode] = useState<'transcribe' | 'align'>('transcribe');
  const [lastUploadOptions, setLastUploadOptions] = useState<{
    language: string;
    customLyrics?: string;
    includeSections: boolean;
  }>({ language: 'auto', includeSections: false });
  const [isOffsetModalOpen, setIsOffsetModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [splittingSubtitle, setSplittingSubtitle] = useState<SubtitleSegment | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [showPasteLyricsInline, setShowPasteLyricsInline] = useState<boolean>(false);
  const [inlineLyricsText, setInlineLyricsText] = useState<string>('');

  // API Key BYOK state (for Vercel or custom key)
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('user_gemini_api_key') || '';
    } catch {
      return '';
    }
  });
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [hasServerKey, setHasServerKey] = useState<boolean>(true);

  // Check backend API key readiness
  useEffect(() => {
    fetch('/api/health', {
      headers: {
        ...(customApiKey ? { 'x-gemini-api-key': customApiKey.trim() } : {}),
      },
    })
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.hasServerKey === 'boolean') {
          setHasServerKey(data.hasServerKey);
        }
      })
      .catch((e) => console.warn('Health check failed:', e));
  }, [customApiKey]);

  const handleSaveApiKey = (key: string) => {
    setCustomApiKey(key);
    try {
      if (key) {
        localStorage.setItem('user_gemini_api_key', key);
        showToast('✓ Kunci API Gemini disimpan di browser (BYOK).');
      } else {
        localStorage.removeItem('user_gemini_api_key');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearApiKey = () => {
    setCustomApiKey('');
    try {
      localStorage.removeItem('user_gemini_api_key');
      showToast('Kunci API pribadi telah dihapus.');
    } catch (e) {
      console.error(e);
    }
  };

  // Toast notification helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  // Compute Active Subtitle (ensuring latest started segment takes precedence if any overlaps exist)
  const activeSubtitle = useMemo(() => {
    const matching = subtitles.filter(
      (sub) => currentTime >= sub.start && currentTime <= sub.end
    );
    if (matching.length === 0) return null;
    if (matching.length === 1) return matching[0];
    return matching.sort((a, b) => b.start - a.start)[0];
  }, [subtitles, currentTime]);

  // Compute Quality Validation
  const validation = useMemo(() => {
    return validateSubtitles(subtitles, duration);
  }, [subtitles, duration]);

  // Initialize or recreate HTML Audio Element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Sync volume, mute, playbackRate with audio element
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
    audioRef.current.playbackRate = playbackRate;
  }, [volume, isMuted, playbackRate]);

  // Decode audio data into AudioBuffer for Waveform
  const decodeAudioForWaveform = async (blobOrFile: Blob) => {
    try {
      const arrayBuf = await blobOrFile.arrayBuffer();
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const decoded = await audioCtx.decodeAudioData(arrayBuf);
      setAudioBuffer(decoded);
      if (decoded.duration && (!duration || duration <= 0)) {
        setDuration(decoded.duration);
      }
    } catch (e) {
      console.warn('Could not decode audio buffer for waveform:', e);
    }
  };

  // Convert file/blob to Base64
  const fileToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        resolve(res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Handle user uploaded audio file
  const handleAudioUpload = async (
    file: File,
    options: { language: string; customLyrics?: string; includeSections: boolean }
  ) => {
    setBannerError(null);
    setAudioFile(file);
    setFilename(file.name);
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
    setSongTitle(cleanTitle);
    setLanguage(options.language);
    setLastUploadOptions(options);
    setSettings((prev) => ({ ...prev, includeSections: options.includeSections }));

    // Create URL for playback
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    const newUrl = URL.createObjectURL(file);
    setAudioUrl(newUrl);

    if (audioRef.current) {
      audioRef.current.src = newUrl;
      audioRef.current.load();
    }

    // Decode waveform
    decodeAudioForWaveform(file);

    // Call AI Backend
    setIsProcessing(true);
    setProcessingMode(options.customLyrics ? 'align' : 'transcribe');

    try {
      const { base64: base64Audio, mimeType: audioMime } = await compressAudioForAI(file);

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(customApiKey ? { 'x-gemini-api-key': customApiKey.trim() } : {}),
        },
        body: JSON.stringify({
          audioData: base64Audio,
          mimeType: audioMime,
          filename: file.name,
          songTitle: cleanTitle,
          duration: audioRef.current?.duration || undefined,
          language: options.language,
          customLyrics: options.customLyrics,
          includeSections: options.includeSections,
        }),
      });

      const rawText = await res.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        if (res.status === 413 || rawText.includes('Entity Too Large')) {
          throw new Error('Ukuran file audio melebihi batas request Vercel (4.5 MB). Sistem telah mengoptimalkan audio, silakan coba unggah kembali.');
        }
        if (res.status === 504 || rawText.includes('timed out') || rawText.includes('FUNCTION_INVOCATION_TIMEOUT')) {
          throw new Error('Serverless function timeout di Vercel (melebihi batas durasi). Coba lagu dengan durasi lebih pendek atau gunakan API Key sendiri.');
        }
        throw new Error(rawText || `Server error (${res.status})`);
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to analyze song.');
      }

      if (Array.isArray(data.segments) && data.segments.length > 0) {
        const cleaned = fixSubtitleIssues(data.segments, audioRef.current?.duration || duration);
        setSubtitles(cleaned);
        if (data.title) setSongTitle(data.title);
        showToast(`✓ Berhasil membuat ${cleaned.length} baris subtitle tersinkronisasi.`);
      } else {
        throw new Error('AI analysis completed without identifying distinct vocal phrases.');
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      let cleanMsg = err.message || 'Could not analyze song.';
      try {
        if (cleanMsg.startsWith('{') && cleanMsg.endsWith('}')) {
          const parsed = JSON.parse(cleanMsg);
          if (parsed?.error?.message) cleanMsg = parsed.error.message;
        }
      } catch (_) {}

      if (cleanMsg.includes('429') || cleanMsg.includes('quota') || cleanMsg.includes('RESOURCE_EXHAUSTED')) {
        cleanMsg = 'Batas kuota harian Gemini API gratis untuk server ini telah habis (429 Quota Exceeded). Silakan masukkan API Key Gemini Anda sendiri (Gratis di aistudio.google.com) melalui tombol "Kunci API" di atas.';
      } else if (cleanMsg.includes('503') || cleanMsg.includes('high demand') || cleanMsg.includes('UNAVAILABLE')) {
        cleanMsg = 'Server Gemini sedang mengalami lonjakan trafik sementara (503 High Demand). Silakan klik "Coba Analisis AI Lagi" di bawah untuk mencoba kembali.';
      }

      setBannerError(cleanMsg);

      // Fallback: If user provided lyrics, load them into editor so they can adjust immediately
      if (options.customLyrics) {
        const lines = options.customLyrics.split('\n').filter((l) => l.trim().length > 0);
        const fallbackSubs: SubtitleSegment[] = lines.map((line, idx) => ({
          id: idx + 1,
          start: idx * 4.0,
          end: idx * 4.0 + 3.5,
          text: line.trim(),
        }));
        setSubtitles(fallbackSubs);
        showToast('Lirik Anda telah dimuat ke editor untuk penyelarasan manual.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Retry previous analysis
  const handleRetryAnalysis = () => {
    if (audioFile) {
      handleAudioUpload(audioFile, lastUploadOptions);
    }
  };

  // Align custom lyrics on already-loaded audio
  const handleAlignInlineLyrics = () => {
    if (!audioFile || !inlineLyricsText.trim()) return;
    const opts = {
      ...lastUploadOptions,
      customLyrics: inlineLyricsText.trim(),
    };
    setShowPasteLyricsInline(false);
    handleAudioUpload(audioFile, opts);
  };

  // Load Demo Track
  const handleLoadDemoTrack = async (type: 'arabic' | 'english' | 'indonesian') => {
    setBannerError(null);
    const demo = DEMO_TRACKS[type] || DEMO_TRACKS.arabic;

    setIsProcessing(true);
    setProcessingMode('align');

    try {
      // Synthesize realistic musical backing track
      const demoWavBlob = await generateDemoAudioWav(demo.duration);
      const demoFile = new File([demoWavBlob], `${demo.name}.wav`, { type: 'audio/wav' });

      setAudioFile(demoFile);
      setFilename(`${demo.name}.wav`);
      setSongTitle(demo.name);
      setDuration(demo.duration);
      setLanguage(demo.language);
      setSubtitles(demo.subtitles);

      // Setup audio playback
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      const newUrl = URL.createObjectURL(demoWavBlob);
      setAudioUrl(newUrl);

      if (audioRef.current) {
        audioRef.current.src = newUrl;
        audioRef.current.load();
      }

      // Decode for waveform visualizer
      decodeAudioForWaveform(demoWavBlob);

      // Auto-set appropriate font for demo
      if (demo.language === 'ar') {
        setSettings((prev) => ({ ...prev, font: 'amiri' }));
      } else {
        setSettings((prev) => ({ ...prev, font: 'plus-jakarta' }));
      }

      showToast(`Loaded "${demo.name}" demo with ${demo.subtitles.length} synchronized cues.`);
    } catch (err: any) {
      console.error('Demo load error:', err);
      setBannerError('Failed to load demo track audio.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Play / Pause Toggle
  const handlePlayPause = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn('Playback error:', e);
      });
    }
  };

  // Seek
  const handleSeek = (seconds: number) => {
    if (!audioRef.current) return;
    const clamped = Math.max(0, Math.min(duration || 3600, seconds));
    audioRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  };

  // Jump to Prev / Next Subtitle
  const handlePrevSubtitle = () => {
    if (subtitles.length === 0) return;
    const currentIdx = subtitles.findIndex(
      (s) => currentTime >= s.start && currentTime <= s.end
    );
    if (currentIdx > 0) {
      handleSeek(subtitles[currentIdx - 1].start);
    } else {
      // Find nearest previous subtitle start
      const prevs = subtitles.filter((s) => s.start < currentTime - 0.2);
      if (prevs.length > 0) {
        handleSeek(prevs[prevs.length - 1].start);
      } else {
        handleSeek(subtitles[0].start);
      }
    }
  };

  const handleNextSubtitle = () => {
    if (subtitles.length === 0) return;
    const nextSub = subtitles.find((s) => s.start > currentTime + 0.1);
    if (nextSub) {
      handleSeek(nextSub.start);
    }
  };

  // Subtitle updates
  const handleUpdateSubtitle = (id: number, updates: Partial<SubtitleSegment>) => {
    setSubtitles((prev) =>
      prev.map((sub) => (sub.id === id ? { ...sub, ...updates } : sub))
    );
  };

  // Subtitle deletion with sequential renumbering
  const handleDeleteSubtitle = (id: number) => {
    setSubtitles((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      return filtered.map((s, idx) => ({ ...s, id: idx + 1 }));
    });
    showToast('Subtitle deleted and sequence renumbered.');
  };

  // Add subtitle at current time
  const handleAddSubtitle = (time: number) => {
    const start = parseFloat(time.toFixed(3));
    const end = parseFloat((time + 3.0).toFixed(3));

    const newSub: SubtitleSegment = {
      id: subtitles.length + 1,
      start,
      end: duration > 0 ? Math.min(duration, end) : end,
      text: 'New lyric phrase',
    };

    const updated = [...subtitles, newSub].sort((a, b) => a.start - b.start);
    const reindexed = updated.map((s, i) => ({ ...s, id: i + 1 }));
    setSubtitles(reindexed);
    setSelectedSubtitleId(newSub.id);
    showToast(`Added subtitle at ${formatSRTTime(start)}.`);
  };

  // Open split modal
  const handleOpenSplit = (id: number) => {
    const sub = subtitles.find((s) => s.id === id);
    if (sub) {
      setSplittingSubtitle(sub);
    }
  };

  // Confirm split
  const handleConfirmSplit = (splitTime: number, firstText: string, secondText: string) => {
    if (!splittingSubtitle) return;

    const sub1: SubtitleSegment = {
      id: splittingSubtitle.id,
      start: splittingSubtitle.start,
      end: splitTime,
      text: firstText,
      section: splittingSubtitle.section,
    };

    const sub2: SubtitleSegment = {
      id: splittingSubtitle.id + 1,
      start: splitTime,
      end: splittingSubtitle.end,
      text: secondText,
    };

    setSubtitles((prev) => {
      const idx = prev.findIndex((s) => s.id === splittingSubtitle.id);
      if (idx === -1) return prev;
      const copy = [...prev];
      copy.splice(idx, 1, sub1, sub2);
      return copy.map((s, i) => ({ ...s, id: i + 1 }));
    });

    setSplittingSubtitle(null);
    showToast(`Split subtitle #${splittingSubtitle.id} into two segments.`);
  };

  // Set start of subtitle to current playback time AND shift all subsequent subtitles by same delta
  const handleSnapStartAndShiftRest = (id: number) => {
    const targetSub = subtitles.find((s) => s.id === id);
    if (!targetSub) return;
    const delta = currentTime - targetSub.start;
    if (Math.abs(delta) < 0.02) return;

    setSubtitles((prev) => {
      const shifted = prev.map((s) => {
        if (s.id >= id) {
          const dur = s.end - s.start;
          const newStart = Math.max(0, parseFloat((s.start + delta).toFixed(3)));
          const newEnd = parseFloat((newStart + dur).toFixed(3));
          return { ...s, start: newStart, end: newEnd };
        }
        return s;
      });
      return fixSubtitleIssues(shifted, duration);
    });

    const deltaSign = delta >= 0 ? `+${delta.toFixed(2)}s` : `${delta.toFixed(2)}s`;
    showToast(`✓ Menyetel baris #${id} ke ${formatSRTTime(currentTime)} dan otomatis menggeser baris seterusnya (${deltaSign}).`);
  };

  // Merge with next subtitle
  const handleMergeWithNext = (id: number) => {
    setSubtitles((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1 || idx >= prev.length - 1) return prev;

      const current = prev[idx];
      const next = prev[idx + 1];

      const merged: SubtitleSegment = {
        id: current.id,
        start: current.start,
        end: next.end,
        text: `${current.text} ${next.text}`.trim(),
        section: current.section,
      };

      const copy = [...prev];
      copy.splice(idx, 2, merged);
      return copy.map((s, i) => ({ ...s, id: i + 1 }));
    });

    showToast(`Merged subtitle #${id} with #${id + 1}.`);
  };

  // Apply Global or Partial Offset
  const handleApplyGlobalOffset = (deltaSeconds: number, fromSubtitleId?: number) => {
    setSubtitles((prev) =>
      prev.map((s) => {
        if (fromSubtitleId && s.id < fromSubtitleId) {
          return s;
        }
        const dur = s.end - s.start;
        const newStart = Math.max(0, parseFloat((s.start + deltaSeconds).toFixed(3)));
        const newEnd = parseFloat((newStart + dur).toFixed(3));
        return {
          ...s,
          start: newStart,
          end: newEnd,
        };
      })
    );
    const sec = deltaSeconds >= 0 ? `+${deltaSeconds.toFixed(2)}s` : `${deltaSeconds.toFixed(2)}s`;
    if (fromSubtitleId) {
      showToast(`Menggeser baris #${fromSubtitleId} ke bawah sebesar ${sec}.`);
    } else {
      showToast(`Menggeser seluruh subtitle sebesar ${sec}.`);
    }
  };

  // Fix issues automatically
  const handleFixIssues = () => {
    const fixed = fixSubtitleIssues(subtitles, duration);
    setSubtitles(fixed);
    showToast('✓ Automatically resolved subtitle overlaps and timing issues.');
  };

  // AI Re-sync
  const handleResync = async (mode: 'all' | 'selected' | 'from_index', targetIndex?: number) => {
    if (!audioFile) {
      showToast('Please upload an audio file first to re-sync.');
      return;
    }

    setIsResyncing(true);
    try {
      const { base64: base64Audio, mimeType: audioMime } = await compressAudioForAI(audioFile);
      const res = await fetch('/api/resync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(customApiKey ? { 'x-gemini-api-key': customApiKey.trim() } : {}),
        },
        body: JSON.stringify({
          audioData: base64Audio,
          mimeType: audioMime,
          segments: subtitles,
          mode,
          targetIndex,
          duration,
        }),
      });

      const rawText = await res.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        if (res.status === 413 || rawText.includes('Entity Too Large')) {
          throw new Error('Ukuran file audio melebihi batas request Vercel (4.5 MB).');
        }
        throw new Error(rawText || `Server error (${res.status})`);
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Re-sync failed.');
      }

      if (Array.isArray(data.segments)) {
        const cleaned = fixSubtitleIssues(data.segments, audioRef.current?.duration || duration);
        setSubtitles(cleaned);
        showToast('✓ Successfully re-synchronized timestamps with vocals.');
      }
    } catch (err: any) {
      console.error('Re-sync error:', err);
      showToast(`AI Re-sync notice: ${err.message || 'Failed to re-sync'}`);
    } finally {
      setIsResyncing(false);
    }
  };

  // Import SRT
  const handleImportSRT = (imported: SubtitleSegment[]) => {
    const cleaned = fixSubtitleIssues(imported, audioRef.current?.duration || duration);
    setSubtitles(cleaned);
    if (!songTitle) {
      setSongTitle('Imported Subtitles');
    }
    showToast(`Imported ${cleaned.length} subtitles into editor.`);
  };

  // Export SRT
  const handleExportSRT = () => {
    if (subtitles.length === 0) {
      showToast('No subtitles available to export.');
      return;
    }

    // Automatically check and fix issues before export
    const content = generateSRT(subtitles, { includeSections: settings.includeSections });
    const cleanFilename = songTitle
      ? `${songTitle.replace(/\.[^/.]+$/, '').trim()}.srt`
      : 'lyrics.srt';

    downloadFile(content, cleanFilename, 'text/plain;charset=utf-8');
    showToast(`Exported "${cleanFilename}" successfully.`);
  };

  // Reset Project
  const handleResetProject = () => {
    if (subtitles.length > 0 && !window.confirm('Start a new project? Current subtitles will be cleared.')) {
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioFile(null);
    setAudioUrl(null);
    setAudioBuffer(null);
    setSongTitle('');
    setFilename('');
    setDuration(0);
    setSubtitles([]);
    setCurrentTime(0);
    setIsPlaying(false);
    setBannerError(null);
  };

  return (
    <div className="min-h-screen bg-[#0B0D10] text-slate-100 flex flex-col font-sans selection:bg-purple-600/30">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#161B22] border border-purple-500/50 shadow-2xl px-4 py-3 rounded-xl text-xs font-medium text-white flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Header
        songTitle={songTitle}
        duration={duration}
        subtitleCount={subtitles.length}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenImportSRT={() => setIsImportModalOpen(true)}
        onOpenOffsetModal={() => setIsOffsetModalOpen(true)}
        onResetProject={handleResetProject}
        onExportSRT={handleExportSRT}
        onLoadDemoTrack={handleLoadDemoTrack}
        isProcessing={isProcessing}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        hasCustomApiKey={Boolean(customApiKey)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6">
        {/* Banner error if any */}
        {bannerError && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-200 text-xs shadow-lg">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{bannerError}</span>
            </div>
            <div className="flex items-center gap-2">
              {(bannerError.includes('kuota') || bannerError.includes('quota') || bannerError.includes('429')) && (
                <button
                  type="button"
                  onClick={() => setIsApiKeyModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all shadow flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Atur Kunci API (Gratis)</span>
                </button>
              )}
              {audioFile && (
                <button
                  type="button"
                  onClick={handleRetryAnalysis}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all shadow disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Coba Lagi (Retry)</span>
                </button>
              )}
              {audioFile && (
                <button
                  type="button"
                  onClick={() => setShowPasteLyricsInline(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#181D24] hover:bg-[#1E2530] text-slate-200 border border-[#252A31] font-medium transition-colors"
                >
                  <span>Gunakan Lirik Sendiri</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setBannerError(null)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* View State 1: No Audio & No Subtitles -> Show Upload Zone */}
        {!audioUrl && subtitles.length === 0 ? (
          <UploadZone
            onAudioSelected={handleAudioUpload}
            onLoadDemoTrack={handleLoadDemoTrack}
            isProcessing={isProcessing}
          />
        ) : activeTab === 'srt_preview' ? (
          /* View State 2: Raw SRT View */
          <SRTPreview
            subtitles={subtitles}
            songTitle={songTitle}
            duration={duration}
            includeSections={settings.includeSections}
            onToggleIncludeSections={() =>
              setSettings((prev) => ({ ...prev, includeSections: !prev.includeSections }))
            }
            onExportSRT={handleExportSRT}
          />
        ) : (
          /* View State 3: Professional Dual-Pane Studio Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (5 cols on desktop): Player, Waveform, Preview */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
              {/* Audio Player */}
              <AudioPlayer
                audioUrl={audioUrl}
                currentTime={currentTime}
                duration={duration}
                isPlaying={isPlaying}
                volume={volume}
                isMuted={isMuted}
                playbackRate={playbackRate}
                onPlayPause={handlePlayPause}
                onSeek={handleSeek}
                onVolumeChange={setVolume}
                onMuteToggle={() => setIsMuted(!isMuted)}
                onPlaybackRateChange={setPlaybackRate}
                onPrevSubtitle={handlePrevSubtitle}
                onNextSubtitle={handleNextSubtitle}
              />

              {/* Interactive Audio Waveform */}
              <Waveform
                audioBuffer={audioBuffer}
                duration={duration}
                currentTime={currentTime}
                subtitles={subtitles}
                activeSubtitleId={activeSubtitle ? activeSubtitle.id : null}
                onSeek={handleSeek}
                onSelectSubtitle={(id) => setSelectedSubtitleId(id)}
              />

              {/* Live Cinematic Subtitle Preview */}
              <PreviewPanel
                activeSubtitle={activeSubtitle}
                subtitles={subtitles}
                currentTime={currentTime}
                isPlaying={isPlaying}
                settings={settings}
                onUpdateSettings={(newSettings) =>
                  setSettings((prev) => ({ ...prev, ...newSettings }))
                }
                onJumpTo={handleSeek}
              />
            </div>

            {/* Right Column (7 cols on desktop): Subtitle Editor List */}
            <div className="lg:col-span-7">
              <SubtitleEditor
                subtitles={subtitles}
                activeSubtitleId={activeSubtitle ? activeSubtitle.id : null}
                selectedSubtitleId={selectedSubtitleId}
                currentTime={currentTime}
                duration={duration}
                validation={validation}
                onUpdateSubtitle={handleUpdateSubtitle}
                onDeleteSubtitle={handleDeleteSubtitle}
                onAddSubtitle={handleAddSubtitle}
                onSplitSubtitle={handleOpenSplit}
                onMergeWithNext={handleMergeWithNext}
                onJumpToTime={handleSeek}
                onFixIssues={handleFixIssues}
                onResync={handleResync}
                isResyncing={isResyncing}
                onRetryAnalysis={handleRetryAnalysis}
                onOpenPasteLyrics={() => setShowPasteLyricsInline(true)}
                isAudioLoaded={Boolean(audioUrl)}
                onSnapStartAndShiftRest={handleSnapStartAndShiftRest}
                onApplyGlobalOffset={handleApplyGlobalOffset}
              />
            </div>
          </div>
        )}
      </main>

      {/* Paste Lyrics Inline Modal */}
      {showPasteLyricsInline && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#11151A] border border-[#252A31] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#252A31] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base text-white">Gunakan Lirik Anda Sendiri (Alignment Mode)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasteLyricsInline(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Tempel lirik lagu Anda di bawah (satu baris per frasa vokal). AI akan menyelaraskan teks asli Anda ke audio dengan mempertahankan kata-katanya secara akurat.
            </p>
            <textarea
              value={inlineLyricsText}
              onChange={(e) => setInlineLyricsText(e.target.value)}
              placeholder="Contoh:&#10;يا من أضاء الكون بالأنوار&#10;قلبٌ حزينٌ يرتجي الأخبار&#10;جئتَ إلينا رحمةً للناس"
              rows={8}
              dir="auto"
              className="w-full bg-[#0B0D10] border border-[#252A31] focus:border-purple-500 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none resize-y font-sans leading-relaxed"
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#252A31]">
              <button
                type="button"
                onClick={() => setShowPasteLyricsInline(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAlignInlineLyrics}
                disabled={!inlineLyricsText.trim()}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md disabled:opacity-40 transition-colors"
              >
                Selaraskan ke Audio (Align)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Offset Modal */}
      <GlobalOffsetModal
        isOpen={isOffsetModalOpen}
        onClose={() => setIsOffsetModalOpen(false)}
        subtitles={subtitles}
        currentTime={currentTime}
        onApplyOffset={handleApplyGlobalOffset}
      />

      {/* Import SRT Modal */}
      <ImportSRTModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportSRT}
      />

      {/* Split Subtitle Modal */}
      <SplitModal
        isOpen={Boolean(splittingSubtitle)}
        onClose={() => setSplittingSubtitle(null)}
        subtitle={splittingSubtitle}
        currentTime={currentTime}
        onConfirmSplit={handleConfirmSplit}
      />

      {/* Processing Screen Overlay */}
      <ProcessingOverlay
        isVisible={isProcessing}
        songTitle={songTitle}
        isAlignmentMode={processingMode === 'align'}
      />

      {/* API Key Modal (BYOK for Vercel / Personal Use) */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKey={customApiKey}
        onSaveApiKey={handleSaveApiKey}
        onClearApiKey={handleClearApiKey}
        hasServerKey={hasServerKey}
      />
    </div>
  );
}
