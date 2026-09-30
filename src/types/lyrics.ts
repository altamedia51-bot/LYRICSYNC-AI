export interface SubtitleSegment {
  id: number;
  start: number; // in seconds (e.g. 3.250)
  end: number;   // in seconds (e.g. 7.420)
  text: string;
  section?: string; // e.g. "Verse 1", "Chorus"
}

export type PreviewPosition = 'top' | 'center' | 'bottom';
export type PreviewFont = 'plus-jakarta' | 'amiri' | 'outfit' | 'mono';
export type PreviewAlign = 'left' | 'center' | 'right';

export interface LyricSettings {
  includeSections: boolean;
  font: PreviewFont;
  fontSize: number; // e.g. 24
  position: PreviewPosition;
  bold: boolean;
  italic: boolean;
  background: boolean;
  outline: boolean;
  shadow: boolean;
  alignment: PreviewAlign;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    total: number;
    hasOverlaps: boolean;
    hasNegative: boolean;
    hasEmpty: boolean;
    hasOutOfBounds: boolean;
  };
}

export interface ProjectState {
  audioFile: File | null;
  audioUrl: string | null;
  title: string;
  filename: string;
  format: string;
  duration: number;
  language: string;
  subtitles: SubtitleSegment[];
  selectedSubtitleId: number | null;
  activeSubtitleId: number | null;
  playbackTime: number;
  isPlaying: boolean;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  settings: LyricSettings;
  activeTab: 'editor' | 'srt_preview';
}
