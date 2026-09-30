import { SubtitleSegment } from '../types/lyrics';

export interface DemoTrack {
  id: string;
  name: string;
  language: string;
  duration: number;
  subtitles: SubtitleSegment[];
}

export const DEMO_TRACKS: Record<string, DemoTrack> = {
  arabic: {
    id: 'arabic_nasheed',
    name: 'Noor Al Huda (نور الهدى)',
    language: 'ar',
    duration: 32,
    subtitles: [
      { id: 1, start: 2.15, end: 6.82, text: 'يَا مَنْ أَضَاءَ الْكَوْنَ بِالْأَنْوَارِ', section: 'Verse 1' },
      { id: 2, start: 7.20, end: 11.95, text: 'قَلْبٌ حَزِينٌ يَرْتَجِي الْأَخْبَارِ', section: 'Verse 1' },
      { id: 3, start: 12.30, end: 16.75, text: 'جِئْتَ إِلَيْنَا رَحْمَةً لِلنَّاسِ', section: 'Verse 1' },
      { id: 4, start: 17.10, end: 21.60, text: 'فَفَاضَتِ الْأَرْجَاءُ بِالْإِينَاسِ', section: 'Chorus' },
      { id: 5, start: 22.00, end: 26.40, text: 'يَا حَبِيبَ الرُّوحِ يَا بَدْرَ الدُّجَى', section: 'Chorus' },
      { id: 6, start: 26.90, end: 30.80, text: 'آهٍ... يَا حَبِيبِي', section: 'Outro' },
    ],
  },
  english: {
    id: 'english_acoustic',
    name: 'Midnight Serenade',
    language: 'en',
    duration: 30,
    subtitles: [
      { id: 1, start: 1.80, end: 5.90, text: 'Shadows fade when morning arrives', section: 'Verse 1' },
      { id: 2, start: 6.40, end: 10.75, text: 'Through the whisper of the quiet wind', section: 'Verse 1' },
      { id: 3, start: 11.20, end: 15.80, text: 'We hold on to every fleeting dream', section: 'Pre-Chorus' },
      { id: 4, start: 16.30, end: 21.20, text: 'Where melodies and memories begin', section: 'Chorus' },
      { id: 5, start: 21.80, end: 26.50, text: 'Oh, let the music carry on through the night', section: 'Chorus' },
      { id: 6, start: 26.90, end: 29.50, text: 'Yeah, forever in our hearts', section: 'Outro' },
    ],
  },
  indonesian: {
    id: 'indonesian_melodic',
    name: 'Senandung Senja',
    language: 'id',
    duration: 30,
    subtitles: [
      { id: 1, start: 2.00, end: 6.50, text: 'Lentera malam membimbing langkah kita', section: 'Bait 1' },
      { id: 2, start: 7.00, end: 11.80, text: 'Di balik tabir sepi yang melayang', section: 'Bait 1' },
      { id: 3, start: 12.20, end: 16.90, text: 'Denting dawai menyapa sukma perlahan', section: 'Refrain' },
      { id: 4, start: 17.40, end: 22.00, text: 'Semoga damai bersemi di dalam dada', section: 'Refrain' },
      { id: 5, start: 22.50, end: 27.20, text: 'La la la... abadi selamanya', section: 'Outro' },
    ],
  },
};

/**
 * Generate a high quality harmonious synthesizer audio track (WAV Blob) in-browser
 * using the Web Audio API offline rendering context so that the demo plays real musical
 * audio with genuine frequency peaks on the waveform!
 */
export async function generateDemoAudioWav(durationSeconds = 32): Promise<Blob> {
  const sampleRate = 44100;
  const numChannels = 2;
  const totalSamples = Math.floor(sampleRate * durationSeconds);

  // Use OfflineAudioContext to render music with chords and melodic bells
  const offlineCtx = new OfflineAudioContext(numChannels, totalSamples, sampleRate);

  // Musical chord progression: Dm - Bb - F - C
  const chordNotes = [
    [146.83, 220.00, 261.63, 293.66], // Dm (D3, A3, C4, D4)
    [116.54, 174.61, 233.08, 293.66], // Bb (Bb2, F3, Bb3, D4)
    [130.81, 174.61, 261.63, 329.63], // F (F2, C3, F3, A3)
    [130.81, 196.00, 246.94, 293.66], // C (C3, G3, B3, D4)
  ];

  const barDuration = 4.0; // 4 seconds per chord bar
  const totalBars = Math.ceil(durationSeconds / barDuration);

  // Master compressor and reverb-like filter
  const filter = offlineCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 3500;
  filter.connect(offlineCtx.destination);

  for (let bar = 0; bar < totalBars; bar++) {
    const chord = chordNotes[bar % chordNotes.length];
    const startTime = bar * barDuration;

    // Pad / chord synth
    chord.forEach((freq, noteIdx) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();

      osc.type = noteIdx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      // Soft envelope
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.08, startTime + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.04, startTime + barDuration * 0.8);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + barDuration);

      osc.connect(gain);
      gain.connect(filter);

      osc.start(startTime);
      osc.stop(startTime + barDuration);
    });

    // Arpeggio / melody bells
    for (let beat = 0; beat < 4; beat++) {
      const noteTime = startTime + beat * 0.95;
      if (noteTime + 1.2 > durationSeconds) break;

      const melOsc = offlineCtx.createOscillator();
      const melGain = offlineCtx.createGain();

      melOsc.type = 'sine';
      const melFreq = chord[(beat + bar) % chord.length] * 2; // an octave higher
      melOsc.frequency.setValueAtTime(melFreq, noteTime);

      melGain.gain.setValueAtTime(0.0001, noteTime);
      melGain.gain.linearRampToValueAtTime(0.12, noteTime + 0.05);
      melGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 1.2);

      melOsc.connect(melGain);
      melGain.connect(filter);

      melOsc.start(noteTime);
      melOsc.stop(noteTime + 1.3);
    }
  }

  // Render audio buffer
  const audioBuffer = await offlineCtx.startRendering();

  // Convert AudioBuffer to standard 16-bit PCM WAV Blob
  return audioBufferToWav(audioBuffer);
}

/**
 * Encode AudioBuffer into WAV binary
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);

  // Write WAV RIFF header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, length, true);

  // Interleave channels & write 16-bit PCM
  let offset = 44;
  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(buffer.getChannelData(c));
  }

  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channelData[c][i];
      // Clamp between -1.0 and 1.0
      sample = Math.max(-1, Math.min(1, sample));
      // Scale to 16-bit signed integer
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}
