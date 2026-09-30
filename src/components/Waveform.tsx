import React, { useRef, useEffect, useState, useMemo } from 'react';
import { SubtitleSegment } from '../types/lyrics';
import { formatSRTTime } from '../utils/srt';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface WaveformProps {
  audioBuffer: AudioBuffer | null;
  duration: number;
  currentTime: number;
  subtitles: SubtitleSegment[];
  activeSubtitleId: number | null;
  onSeek: (seconds: number) => void;
  onSelectSubtitle?: (id: number) => void;
}

export const Waveform: React.FC<WaveformProps> = ({
  audioBuffer,
  duration,
  currentTime,
  subtitles,
  activeSubtitleId,
  onSeek,
  onSelectSubtitle,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  // Compute peaks from AudioBuffer
  const peaks = useMemo(() => {
    const defaultPoints = 1200;
    if (!audioBuffer) {
      // Fallback synthetic wave shape if audioBuffer decoding is pending
      const fakePeaks = [];
      for (let i = 0; i < defaultPoints; i++) {
        const val =
          Math.sin(i * 0.05) * 0.3 +
          Math.sin(i * 0.12) * 0.25 +
          (Math.random() * 0.3 + 0.1);
        fakePeaks.push(Math.min(1, Math.max(0.08, val)));
      }
      return fakePeaks;
    }

    const channelData = audioBuffer.getChannelData(0);
    const totalSamples = channelData.length;
    const blockSize = Math.floor(totalSamples / defaultPoints);
    const computedPeaks: number[] = [];

    for (let i = 0; i < defaultPoints; i++) {
      const start = i * blockSize;
      let max = 0;
      for (let j = 0; j < blockSize; j += 4) {
        const absVal = Math.abs(channelData[start + j] || 0);
        if (absVal > max) max = absVal;
      }
      computedPeaks.push(Math.min(1, max));
    }

    return computedPeaks;
  }, [audioBuffer]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#0B0D10';
    ctx.fillRect(0, 0, width, height);

    // Draw grid & time divisions
    ctx.strokeStyle = '#1D222A';
    ctx.lineWidth = 1;
    const timeStep = duration > 120 ? 10 : duration > 60 ? 5 : 2;
    ctx.fillStyle = '#4B5563';
    ctx.font = '10px "JetBrains Mono", monospace';

    for (let t = 0; t <= duration; t += timeStep) {
      const x = (t / duration) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      const mins = Math.floor(t / 60);
      const secs = Math.floor(t % 60);
      const label = `${mins}:${String(secs).padStart(2, '0')}`;
      ctx.fillText(label, x + 3, 12);
    }

    // Draw Subtitle regions
    subtitles.forEach((sub) => {
      const startX = (sub.start / duration) * width;
      const endX = (sub.end / duration) * width;
      const subWidth = Math.max(2, endX - startX);
      const isActive = sub.id === activeSubtitleId;

      if (isActive) {
        // Active Subtitle Highlight
        ctx.fillStyle = 'rgba(147, 51, 234, 0.28)';
        ctx.fillRect(startX, 16, subWidth, height - 16);

        ctx.strokeStyle = '#A855F7';
        ctx.lineWidth = 2;
        ctx.strokeRect(startX, 16, subWidth, height - 16);

        // Top tag
        ctx.fillStyle = '#C084FC';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.fillText(`#${sub.id}`, startX + 4, 28);
      } else {
        // Inactive Subtitle Region
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(startX, 16, subWidth, height - 16);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.strokeRect(startX, 16, subWidth, height - 16);
      }
    });

    // Draw Waveform bars
    const centerY = (height + 16) / 2;
    const maxBarHeight = (height - 30) / 2;
    const numBars = peaks.length;
    const barWidth = width / numBars;

    for (let i = 0; i < numBars; i++) {
      const x = i * barWidth;
      const barTime = (i / numBars) * duration;
      const peakVal = peaks[i];
      const barH = Math.max(2, peakVal * maxBarHeight);

      const isPlayed = barTime <= currentTime;
      const isActiveSub = subtitles.some(
        (s) => s.id === activeSubtitleId && barTime >= s.start && barTime <= s.end
      );

      if (isActiveSub) {
        ctx.fillStyle = isPlayed ? '#D8B4FE' : '#9333EA';
      } else if (isPlayed) {
        ctx.fillStyle = '#818CF8';
      } else {
        ctx.fillStyle = '#2B323D';
      }

      // Draw top and bottom symmetrical bars
      ctx.fillRect(x, centerY - barH, Math.max(1, barWidth - 0.5), barH * 2);
    }

    // Draw Current Playhead Line
    const playheadX = (currentTime / duration) * width;
    ctx.strokeStyle = '#EC4899';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    // Playhead head indicator
    ctx.fillStyle = '#EC4899';
    ctx.beginPath();
    ctx.moveTo(playheadX - 5, 0);
    ctx.lineTo(playheadX + 5, 0);
    ctx.lineTo(playheadX, 8);
    ctx.closePath();
    ctx.fill();

  }, [peaks, duration, currentTime, subtitles, activeSubtitleId, zoomLevel]);

  // Handle click on waveform
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSeconds = ratio * duration;

    onSeek(targetSeconds);

    // If user clicked inside a subtitle, notify selection
    if (onSelectSubtitle) {
      const match = subtitles.find((s) => targetSeconds >= s.start && targetSeconds <= s.end);
      if (match) {
        onSelectSubtitle(match.id);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    setHoverTime(ratio * duration);
    setHoverX(x);
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
    setHoverX(null);
  };

  return (
    <div className="bg-[#11151A] rounded-xl border border-[#252A31] p-3 space-y-2 select-none shadow-md">
      {/* Waveform Controls Header */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">Interactive Waveform</span>
          <span className="text-[11px] font-mono-numbers text-slate-500">
            {formatSRTTime(currentTime)} / {formatSRTTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoomLevel((prev) => Math.max(1, prev - 0.5))}
            className="p-1 rounded hover:bg-[#1C222B] text-slate-400 hover:text-slate-200 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono px-1 text-slate-500">{zoomLevel}x</span>
          <button
            type="button"
            onClick={() => setZoomLevel((prev) => Math.min(4, prev + 0.5))}
            className="p-1 rounded hover:bg-[#1C222B] text-slate-400 hover:text-slate-200 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          {zoomLevel !== 1 && (
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="p-1 rounded hover:bg-[#1C222B] text-slate-400 hover:text-slate-200"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Canvas Container with responsive width */}
      <div
        ref={containerRef}
        className="relative w-full h-24 sm:h-28 overflow-hidden rounded-lg bg-[#0B0D10] border border-[#252A31] cursor-crosshair"
      >
        <canvas
          ref={canvasRef}
          width={1200}
          height={112}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full block"
        />

        {/* Hover Tooltip */}
        {hoverTime !== null && hoverX !== null && (
          <div
            className="absolute top-1 pointer-events-none -translate-x-1/2 bg-[#1A202C] border border-[#252A31] px-2 py-0.5 rounded shadow text-[10px] font-mono-numbers text-purple-200 z-20"
            style={{ left: `${hoverX}px` }}
          >
            {formatSRTTime(hoverTime)}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
          Highlighted segment denotes active singing phrase
        </span>
        <span>Click anywhere to scrub playback</span>
      </div>
    </div>
  );
};
