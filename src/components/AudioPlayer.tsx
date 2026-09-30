import React, { useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { formatSRTTime } from '../utils/srt';

interface AudioPlayerProps {
  audioUrl: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onMuteToggle: () => void;
  onPlaybackRateChange: (rate: number) => void;
  onPrevSubtitle: () => void;
  onNextSubtitle: () => void;
}

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  currentTime,
  duration,
  isPlaying,
  volume,
  isMuted,
  playbackRate,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onPlaybackRateChange,
  onPrevSubtitle,
  onNextSubtitle,
}) => {
  const progressBarRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcuts: Space for Play/Pause (when not typing in an input)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (!isInput && e.code === 'Space') {
        e.preventDefault();
        onPlayPause();
      } else if (!isInput && e.code === 'ArrowLeft') {
        e.preventDefault();
        onSeek(Math.max(0, currentTime - 3));
      } else if (!isInput && e.code === 'ArrowRight') {
        e.preventDefault();
        onSeek(Math.min(duration, currentTime + 3));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration, onPlayPause, onSeek]);

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onSeek(val);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-[#11151A] rounded-xl border border-[#252A31] p-4 space-y-3 shadow-md">
      {/* Time & Scrub Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono-numbers">
          <span className="text-purple-300 font-semibold">{formatSRTTime(currentTime)}</span>
          <span className="text-slate-400">{formatSRTTime(duration)}</span>
        </div>

        {/* Custom Range Slider */}
        <div className="relative flex items-center group">
          <input
            type="range"
            ref={progressBarRef}
            min={0}
            max={duration || 100}
            step={0.01}
            value={currentTime}
            onChange={handleSeekChange}
            className="w-full h-2 bg-[#1A202C] rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 focus:outline-none"
            style={{
              background: `linear-gradient(to right, #9333EA ${progressPercent}%, #1A202C ${progressPercent}%)`,
            }}
          />
        </div>
      </div>

      {/* Main Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Playback Navigation Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Jump to Prev Subtitle */}
          <button
            type="button"
            onClick={onPrevSubtitle}
            className="p-2 rounded-lg bg-[#181D24] text-slate-300 hover:text-white border border-[#252A31] hover:border-slate-600 transition-colors"
            title="Previous Subtitle"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Jump -5 seconds */}
          <button
            type="button"
            onClick={() => onSeek(Math.max(0, currentTime - 5))}
            className="p-2 rounded-lg bg-[#181D24] text-slate-300 hover:text-white border border-[#252A31] hover:border-slate-600 transition-colors text-xs font-mono"
            title="Rewind 5s"
          >
            -5s
          </button>

          {/* Big Play / Pause Button */}
          <button
            type="button"
            onClick={onPlayPause}
            className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-purple-900/40 transition-transform active:scale-95"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Jump +5 seconds */}
          <button
            type="button"
            onClick={() => onSeek(Math.min(duration, currentTime + 5))}
            className="p-2 rounded-lg bg-[#181D24] text-slate-300 hover:text-white border border-[#252A31] hover:border-slate-600 transition-colors text-xs font-mono"
            title="Forward 5s"
          >
            +5s
          </button>

          {/* Jump to Next Subtitle */}
          <button
            type="button"
            onClick={onNextSubtitle}
            className="p-2 rounded-lg bg-[#181D24] text-slate-300 hover:text-white border border-[#252A31] hover:border-slate-600 transition-colors"
            title="Next Subtitle"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Controls (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x) */}
        <div className="flex items-center gap-1 bg-[#0B0D10] p-1 rounded-lg border border-[#252A31]">
          {SPEED_OPTIONS.map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => onPlaybackRateChange(speed)}
              className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
                playbackRate === speed
                  ? 'bg-purple-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Volume Slider & Mute */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMuteToggle}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-slate-300" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-16 sm:w-20 h-1.5 bg-[#1A202C] rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>
      </div>
    </div>
  );
};
