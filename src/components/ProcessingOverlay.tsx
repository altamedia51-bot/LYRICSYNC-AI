import React, { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2, Loader2, Music2 } from 'lucide-react';

interface ProcessingOverlayProps {
  isVisible: boolean;
  songTitle?: string;
  isAlignmentMode?: boolean;
}

const STEPS_TRANSCRIBE = [
  'Audio loaded and decoded',
  'Detecting vocal language & pitch',
  'Transcribing vocal singing phrases',
  'Detecting natural musical phrasing',
  'Synchronizing millisecond timestamps',
  'Validating sequential subtitle cues',
];

const STEPS_ALIGN = [
  'Audio loaded and decoded',
  'Parsing authoritative lyric lines',
  'Analyzing song vocals & rhythm',
  'Aligning lyric text to vocal phrases',
  'Calibrating start and end timestamps',
  'Finalizing synchronized SRT cues',
];

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  isVisible,
  songTitle,
  isAlignmentMode,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(15);

  const steps = isAlignmentMode ? STEPS_ALIGN : STEPS_TRANSCRIBE;

  useEffect(() => {
    if (!isVisible) {
      setCurrentStepIndex(0);
      setProgress(15);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
      setProgress((prev) => {
        if (prev < 92) {
          return prev + Math.floor(Math.random() * 12 + 6);
        }
        return prev;
      });
    }, 1800);

    return () => clearInterval(interval);
  }, [isVisible, steps.length]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0D10]/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#11151A] border border-[#252A31] rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 text-center">
        {/* Animated Icon */}
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-2xl bg-purple-600/20 animate-ping rounded-full" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-900/50">
            <Music2 className="w-8 h-8 text-white animate-pulse" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-white tracking-tight">
            {isAlignmentMode ? 'Aligning Lyrics to Audio...' : 'Analyzing Your Song...'}
          </h3>
          <p className="text-xs text-slate-400 truncate max-w-xs mx-auto">
            {songTitle || 'Processing music audio file'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono text-slate-400">
            <span>Synchronizing</span>
            <span className="text-purple-300 font-bold">{Math.min(98, progress)}%</span>
          </div>
          <div className="w-full h-2.5 bg-[#161B22] rounded-full overflow-hidden border border-[#252A31]">
            <div
              className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(98, progress)}%` }}
            />
          </div>
        </div>

        {/* Steps Checklist */}
        <div className="bg-[#0B0D10] border border-[#252A31] rounded-xl p-4 text-left space-y-2.5">
          {steps.map((step, idx) => {
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div
                key={step}
                className={`flex items-center gap-3 text-xs transition-colors duration-300 ${
                  isDone
                    ? 'text-emerald-400'
                    : isCurrent
                    ? 'text-purple-300 font-medium'
                    : 'text-slate-600'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                )}
                <span>{step}</span>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-slate-500">
          This may take 10–30 seconds depending on song duration and complexity.
        </p>
      </div>
    </div>
  );
};
