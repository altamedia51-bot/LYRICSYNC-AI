import lamejs from 'lamejs';

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
 * Optimizes and compresses audio to lightweight mono MP3 (16,000Hz @ 48kbps).
 * This reduces typical 5MB-15MB audio files down to ~0.8MB - 1.5MB,
 * preventing Vercel's strict 4.5MB "413 Request Entity Too Large" limit.
 * Audio playback in browser still plays the original full-quality file.
 */
export async function compressAudioForAI(fileOrBlob: Blob): Promise<{
  base64: string;
  mimeType: string;
  originalSize: number;
  compressedSize: number;
}> {
  // If file is already small MP3 (< 2.2MB), base64 is ~2.9MB (well under 4.5MB)
  if (
    fileOrBlob.size < 2.2 * 1024 * 1024 &&
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
      const base64 = await blobToBase64(fileOrBlob);
      return {
        base64,
        mimeType: fileOrBlob.type || 'audio/mp3',
        originalSize: fileOrBlob.size,
        compressedSize: fileOrBlob.size,
      };
    }

    const audioCtx = new AudioCtx();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // 16,000 Hz Mono is the industry gold standard for speech/vocal AI transcription
    const targetSampleRate = 16000;
    const numChannels = 1;
    const targetBitrate = 48; // kbps

    const offlineCtx = new OfflineAudioContext(
      numChannels,
      Math.ceil(audioBuffer.duration * targetSampleRate),
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

    // Encode to lightweight MP3 using lamejs
    const mp3encoder = new (lamejs as any).Mp3Encoder(
      numChannels,
      targetSampleRate,
      targetBitrate
    );
    const mp3Data: Uint8Array[] = [];
    const chunkSize = 1152;

    for (let i = 0; i < samples.length; i += chunkSize) {
      const chunk = samples.subarray(i, i + chunkSize);
      const mp3buf = mp3encoder.encodeBuffer(chunk);
      if (mp3buf.length > 0) {
        mp3Data.push(new Uint8Array(mp3buf));
      }
    }

    const endBuf = mp3encoder.flush();
    if (endBuf.length > 0) {
      mp3Data.push(new Uint8Array(endBuf));
    }

    const compressedBlob = new Blob(mp3Data as unknown as BlobPart[], { type: 'audio/mp3' });
    const base64 = await blobToBase64(compressedBlob);

    return {
      base64,
      mimeType: 'audio/mp3',
      originalSize: fileOrBlob.size,
      compressedSize: compressedBlob.size,
    };
  } catch (err) {
    console.warn('Audio compression fallback to original file:', err);
    const base64 = await blobToBase64(fileOrBlob);
    return {
      base64,
      mimeType: fileOrBlob.type || 'audio/mp3',
      originalSize: fileOrBlob.size,
      compressedSize: fileOrBlob.size,
    };
  }
}
