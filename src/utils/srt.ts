import { SubtitleSegment, ValidationResult } from '../types/lyrics';

/**
 * Format seconds into standard SRT timestamp: HH:MM:SS,mmm
 * Example: 3.25 -> 00:00:03,250
 */
export function formatSRTTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) {
    seconds = 0;
  }
  const totalMs = Math.round(seconds * 1000);
  const hrs = Math.floor(totalMs / 3600000);
  const mins = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;

  const pad = (n: number, size = 2) => String(n).padStart(size, '0');

  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
}

/**
 * Parse an SRT timestamp string (HH:MM:SS,mmm or HH:MM:SS.mmm) into seconds (float)
 */
export function parseSRTTime(timeStr: string): number {
  if (!timeStr) return 0;
  const cleaned = timeStr.trim().replace('.', ',');
  const parts = cleaned.split(':');
  if (parts.length < 3) return 0;

  const hrs = parseInt(parts[0], 10) || 0;
  const mins = parseInt(parts[1], 10) || 0;
  const secParts = parts[2].split(',');
  const secs = parseInt(secParts[0], 10) || 0;
  const ms = parseInt(secParts[1], 10) || 0;

  return hrs * 3600 + mins * 60 + secs + ms / 1000;
}

/**
 * Generate standard SRT formatted string from subtitle segments
 */
export function generateSRT(
  subtitles: SubtitleSegment[],
  options?: { includeSections?: boolean }
): string {
  const cleanSubs = [...subtitles].sort((a, b) => a.start - b.start);
  const blocks: string[] = [];

  cleanSubs.forEach((sub, idx) => {
    const srtNumber = idx + 1;
    const timeRange = `${formatSRTTime(sub.start)} --> ${formatSRTTime(sub.end)}`;
    
    let text = sub.text.trim();
    if (options?.includeSections && sub.section) {
      text = `[${sub.section}]\n${text}`;
    }

    blocks.push(`${srtNumber}\n${timeRange}\n${text}`);
  });

  return blocks.join('\n\n') + (blocks.length > 0 ? '\n' : '');
}

/**
 * Parse raw SRT text into SubtitleSegment array
 */
export function parseSRT(srtContent: string): SubtitleSegment[] {
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) return [];

  const rawBlocks = normalized.split(/\n\s*\n/);
  const segments: SubtitleSegment[] = [];

  for (const block of rawBlocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    // Check if first line is number or timestamp
    let timeLineIdx = 1;
    if (lines[0].includes('-->')) {
      timeLineIdx = 0;
    }

    const timeLine = lines[timeLineIdx];
    if (!timeLine || !timeLine.includes('-->')) continue;

    const [startStr, endStr] = timeLine.split('-->').map((s) => s.trim());
    const start = parseSRTTime(startStr);
    const end = parseSRTTime(endStr);

    const textLines = lines.slice(timeLineIdx + 1);
    const text = textLines.join('\n').trim();

    if (text.length > 0) {
      segments.push({
        id: segments.length + 1,
        start: parseFloat(start.toFixed(3)),
        end: parseFloat(end.toFixed(3)),
        text,
      });
    }
  }

  // Renumber properly
  return segments.map((seg, i) => ({ ...seg, id: i + 1 }));
}

/**
 * Comprehensive Quality Check before export
 */
export function validateSubtitles(
  subtitles: SubtitleSegment[],
  audioDuration?: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let hasOverlaps = false;
  let hasNegative = false;
  let hasEmpty = false;
  let hasOutOfBounds = false;

  if (subtitles.length === 0) {
    return {
      isValid: false,
      errors: ['No subtitles found.'],
      warnings: [],
      stats: {
        total: 0,
        hasOverlaps: false,
        hasNegative: false,
        hasEmpty: false,
        hasOutOfBounds: false,
      },
    };
  }

  for (let i = 0; i < subtitles.length; i++) {
    const sub = subtitles[i];
    const subNum = i + 1;

    // Check 1: Negative timestamps
    if (sub.start < 0 || sub.end < 0) {
      hasNegative = true;
      errors.push(`Subtitle #${subNum} has a negative timestamp.`);
    }

    // Check 2: End > Start
    if (sub.end <= sub.start) {
      errors.push(`Subtitle #${subNum}: End time must be greater than start time.`);
    }

    // Check 3: Beyond audio duration
    if (audioDuration && audioDuration > 0 && sub.end > audioDuration + 1.0) {
      hasOutOfBounds = true;
      warnings.push(`Subtitle #${subNum} ends after audio track ends (${formatSRTTime(sub.end)} > ${formatSRTTime(audioDuration)}).`);
    }

    // Check 4: Empty text
    if (!sub.text || sub.text.trim().length === 0) {
      hasEmpty = true;
      errors.push(`Subtitle #${subNum} has empty lyric text.`);
    }

    // Check 5: Overlaps with next segment
    if (i < subtitles.length - 1) {
      const nextSub = subtitles[i + 1];
      if (sub.end > nextSub.start + 0.05) {
        hasOverlaps = true;
        warnings.push(`Subtitle #${subNum} overlaps with #${subNum + 1} by ${(sub.end - nextSub.start).toFixed(2)}s.`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats: {
      total: subtitles.length,
      hasOverlaps,
      hasNegative,
      hasEmpty,
      hasOutOfBounds,
    },
  };
}

/**
 * Automatically resolve common subtitle timing conflicts and eliminate overlaps
 */
export function fixSubtitleIssues(
  subtitles: SubtitleSegment[],
  audioDuration?: number
): SubtitleSegment[] {
  if (subtitles.length === 0) return [];

  // Filter out empty text and sort chronologically by start time
  const cleaned = subtitles
    .filter((s) => s.text && s.text.trim().length > 0)
    .sort((a, b) => a.start - b.start);

  const fixed: SubtitleSegment[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const item = { ...cleaned[i] };
    let start = Math.max(0, Number(item.start) || 0);
    let end = Number(item.end) || (start + 2.5);

    // Ensure minimum duration of 0.6s and end > start
    if (end <= start) {
      end = start + 2.0;
    }

    // Fix overlap with previous item
    if (fixed.length > 0) {
      const prev = fixed[fixed.length - 1];
      if (prev.end > start) {
        // Option A: If previous line had enough duration, clamp its end before this line starts
        if (start >= prev.start + 0.8) {
          prev.end = parseFloat(Math.max(prev.start + 0.5, start - 0.05).toFixed(3));
        } else {
          // Option B: If previous line would become too short, shift current line start after previous end
          start = parseFloat((prev.end + 0.05).toFixed(3));
          end = Math.max(start + 1.5, end);
        }
      }
    }

    // Clamp to audio duration if provided
    if (audioDuration && audioDuration > 0) {
      if (start >= audioDuration) {
        start = Math.max(0, audioDuration - 2.0);
      }
      if (end > audioDuration) {
        end = audioDuration;
      }
    }

    fixed.push({
      id: i + 1,
      start: parseFloat(start.toFixed(3)),
      end: parseFloat(end.toFixed(3)),
      text: item.text.trim(),
      section: item.section,
    });
  }

  return fixed;
}

/**
 * Download text file as UTF-8 blob
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
