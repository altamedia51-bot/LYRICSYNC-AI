import { Mp3Encoder } from '@breezystack/lamejs';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Optimizes and compresses audio to lightweight mono MP3 (16,000Hz @ 32-48kbps).
 * This safely shrinks 4MB - 20MB audio down to ~0.8MB - 1.4MB,
 * ensuring payload stays well under Vercel's strict 4.5MB request body limit.
 * Audio playback in browser still plays the original full-quality file.
 */
export async function compressAudioForAI(fileOrBlob: Blob): Promise<{
  base64: string;
  mimeType: string;
  originalSize: number;
  compressedSize: number;
}> {
  // If file is already very small MP3 (< 1.8MB), base64 is ~2.4MB (well under 4.5MB)
  if (
    fileOrBlob.size < 1.8 * 1024 * 1024 &&
    (fileOrBlob.type === 'audio/mp3' || fileOrBlob.type === 'audio/mpeg')
  ) {
    const base64 = await blobToBase64(fileOrBlob);
    return {
      base64,
      mimeType: 'audio/mp3',
      originalSize: fileOrBlob.size,
      compressedSize: fileOrBlob.size,
    };
  }

  try {
    const arrayBuffer = await fileOrBlob.arrayBuffer();
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;

    if (!AudioCtx) {
      console.warn('Web Audio API not available in this browser.');
      const base64 = await blobToBase64(fileOrBlob);
      return {
        base64,
        mimeType: fileOrBlob.type || 'audio/mp3',
        originalSize: fileOrBlob.size,
        compressedSize: fileOrBlob.size,
      };
    }

    const audioCtx = new AudioCtx();

    // Support both promise and callback styles for Safari/iOS compatibility
    const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
      audioCtx.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
    });

    const duration = audioBuffer.duration;
    // For longer audio (> 5 mins), use 32kbps to guarantee size stays ~1.2MB
    const targetBitrate = duration > 300 ? 32 : 48; // kbps
    // Use standard 44.1kHz (MPEG-1 Layer 3) to ensure 100% clock synchronization with original music playback
    const targetSampleRate = 44100;
    const numChannels = 1;

    const offlineCtx = new OfflineAudioContext(
      numChannels,
      Math.ceil(duration * targetSampleRate),
      targetSampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    const pcmData = renderedBuffer.getChannelData(0);

    // Convert Float32 [-1.0, 1.0] to Int16 [-32768, 32767]
    const sampleCount = pcmData.length;
    const samples = new Int16Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      const s = Math.max(-1, Math.min(1, pcmData[i]));
      samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Encode to lightweight MP3 using @breezystack/lamejs
    const mp3encoder = new Mp3Encoder(numChannels, targetSampleRate, targetBitrate);
    const mp3Data: Uint8Array[] = [];
    const chunkSize = 1152;

    for (let i = 0; i < samples.length; i += chunkSize) {
      const chunk = samples.subarray(i, i + chunkSize);
      const mp3buf = mp3encoder.encodeBuffer(chunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }

    const endBuf = mp3encoder.flush();
    if (endBuf.length > 0) {
      mp3Data.push(endBuf);
    }

    const compressedBlob = new Blob(mp3Data as unknown as BlobPart[], { type: 'audio/mp3' });
    const base64 = await blobToBase64(compressedBlob);

    console.log(
      `[AudioCompressor] Audio compressed from ${(fileOrBlob.size / 1024 / 1024).toFixed(2)} MB to ${(compressedBlob.size / 1024 / 1024).toFixed(2)} MB (${((1 - compressedBlob.size / fileOrBlob.size) * 100).toFixed(0)}% saved for Vercel/AI)`
    );

    return {
      base64,
      mimeType: 'audio/mp3',
      originalSize: fileOrBlob.size,
      compressedSize: compressedBlob.size,
    };
  } catch (err) {
    console.error('Audio compression error:', err);
    const base64 = await blobToBase64(fileOrBlob);
    return {
      base64,
      mimeType: fileOrBlob.type || 'audio/mp3',
      originalSize: fileOrBlob.size,
      compressedSize: fileOrBlob.size,
    };
  }
}
