import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// High payload limit for audio files (up to 60MB base64)
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Helper to sanitize base64 audio
function cleanBase64(dataUrlOrBase64: string): { data: string; mimeType: string } {
  const match = dataUrlOrBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return { mimeType: 'audio/mp3', data: dataUrlOrBase64 };
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  const clientKey = (req.headers['x-gemini-api-key'] as string)?.trim();
  res.json({
    status: 'ok',
    hasApiKey: Boolean(clientKey || process.env.GEMINI_API_KEY),
    usingClientKey: Boolean(clientKey),
    hasServerKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString()
  });
});

// Transcription endpoint
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioData, mimeType, filename, songTitle, duration, language, customLyrics, includeSections } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: 'Missing audio data' });
    }

    const clientKey = (req.headers['x-gemini-api-key'] as string)?.trim();
    const activeApiKey = clientKey || process.env.GEMINI_API_KEY;

    if (!activeApiKey) {
      return res.status(401).json({
        error: 'GEMINI_API_KEY tidak ditemukan. Silakan atur GEMINI_API_KEY di Vercel atau masukkan API Key Anda sendiri di menu Kunci API.',
        code: 'MISSING_API_KEY'
      });
    }

    const { data: base64Data, mimeType: extractedMime } = cleanBase64(audioData);
    const audioMime = mimeType || extractedMime || 'audio/mp3';

    const ai = new GoogleGenAI({
      apiKey: activeApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    let systemInstruction = '';
    let userPrompt = '';

    if (customLyrics && customLyrics.trim().length > 0) {
      // Alignment Mode: Supplied lyrics are authoritative
      systemInstruction = `You are an expert song lyric alignment and subtitle synchronization engine.
The supplied lyrics are strictly authoritative.
Rules:
1. DO NOT rewrite the lyrics.
2. DO NOT translate the lyrics.
3. DO NOT correct the spelling or grammar of the lyrics.
4. DO NOT paraphrase the lyrics.
5. DO NOT remove repeated lines.
6. Preserve the exact supplied text for each line.
7. Your primary task is to align each supplied lyric line to the sung audio vocals.
8. For every lyric line, determine the exact start timestamp and end timestamp in seconds (float with millisecond precision, e.g. 14.320).
9. Ensure start >= 0, end > start, and timestamps are in chronological order.
10. IMPORTANT FOR INSTRUMENTAL SECTIONS / BRIDGES: If there is an instrumental pause or solo between lyrics (e.g. at 01:22 for 15-40 seconds), do NOT assign lyrics during the instrumental gap. The next lyric line must start exactly when vocals resume in the audio.
11. If a supplied line is sung across multiple vocal phrases, time it to encompass the vocal performance naturally.
12. Return clean structured JSON conforming to the schema.`;

      userPrompt = `Audio file: ${filename || 'song.mp3'}
Estimated total duration: ${duration ? duration.toFixed(1) : 'unknown'} seconds.
Target language hint: ${language || 'Auto Detect'}.
Include section labels: ${includeSections ? 'YES' : 'NO'}.

AUTHORITATIVE SUPPLIED LYRICS TO ALIGN:
---
${customLyrics.trim()}
---

Please analyze the audio track, align each lyric line to the singing, and return structured JSON with timestamps for every line.`;
    } else {
      // Transcription Mode: Detect & segment lyrics from audio
      systemInstruction = `You are an expert music lyric transcription and subtitle synchronization engine.
Analyze the provided song audio.
Your task is to identify sung lyrics and synchronize each meaningful lyric phrase with the audio.
Rules:
1. Transcribe the sung lyrics accurately.
2. Detect the language accurately.
3. Preserve the original language. Do not translate.
4. Do not invent or hallucinate lyrics.
5. Do not include instrumental sections as lyrics.
${includeSections ? '6. You may include section labels (e.g. [Intro], [Verse 1], [Chorus]) where appropriate.' : '6. Do NOT include instrumental or section labels (e.g. "[Instrumental Intro]", "[Guitar Solo]") in the subtitle text. Only transcribe sung lyrics.'}
7. Separate lyrics according to natural vocal phrasing, breathing pauses, and musical rhythm.
8. Subtitle lines should ideally be between 1 and 7 seconds long. Avoid splitting continuous vocal phrases awkwardly.
9. Support short vocal phrases, ad-libs, and repeated chorus lines (e.g. "Oh", "Yeah", "Ah", "La la la", "يا حبيبي", "آه").
10. CRITICAL FOR SONGS WITH INSTRUMENTAL INTERLUDES, SOLOS, OR BRIDGES:
    - Many songs have long musical interludes between verses or chorus (e.g. 15 to 45 seconds of instruments with no singing).
    - NEVER compress or guess timestamps during instrumental pauses.
    - If singing stops at a certain minute (e.g. around 01:22) and an instrumental solo plays until vocals resume, the subsequent lyric segment MUST start exactly when singing resumes in the audio.
    - Accurately track clock time so verses after instrumental breaks do not drift or begin prematurely.
11. If the song is in Arabic:
    - Preserve Arabic script strictly.
    - Preserve punctuation and diacritics/harakat if clearly audible or standard.
    - Never transliterate Arabic into Latin characters.
12. Return start and end timestamps in seconds (float with 2-3 decimal precision, e.g. 4.520).
13. Ensure start >= 0, end > start, segments are strictly chronological, and end <= audio duration.
14. Return structured JSON conforming to the schema.`;

      userPrompt = `Audio filename: ${filename || 'song.mp3'}
Detected duration: ${duration ? duration.toFixed(1) : 'unknown'} seconds.
Language preference: ${language || 'Auto Detect'}.
Include section labels: ${includeSections ? 'YES' : 'NO'}.

Please transcribe all sung lyrics from this audio with precise musical phrase timestamps.`;
    }

    // Audio part for Gemini
    const audioPart = {
      inlineData: {
        mimeType: audioMime,
        data: base64Data,
      },
    };

    const textPart = {
      text: userPrompt,
    };

    // Candidate models with fallback in case of 503 (high demand) or 429
    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.5-transcribe'];
    let lastError: any = null;
    let response: any = null;

    // Retry loop with model fallback
    for (const modelName of candidateModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`Calling Gemini with model ${modelName} (attempt ${attempt})...`);
          const isTranscribeOnly = modelName.includes('transcribe');

          if (isTranscribeOnly) {
            // gemini-3.5-transcribe does not support systemInstruction ("Developer instruction")
            const combinedPrompt = `${systemInstruction}\n\n${userPrompt}\n\nRespond ONLY with valid JSON conforming to: {"language": "...", "duration": 0, "segments": [{"id": 1, "start": 0.0, "end": 0.0, "text": "..."}]}`;
            response = await ai.models.generateContent({
              model: modelName,
              contents: {
                parts: [audioPart, { text: combinedPrompt }],
              },
              config: {
                temperature: 0.2,
                responseMimeType: 'application/json',
              },
            });
          } else {
            // gemini-3.8-flash and gemini-flash-latest support systemInstruction and responseSchema
            response = await ai.models.generateContent({
              model: modelName,
              contents: {
                parts: [audioPart, textPart],
              },
              config: {
                systemInstruction,
                temperature: 0.2,
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: 'Song title or detected title' },
                    language: { type: Type.STRING, description: 'Detected language code or name' },
                    duration: { type: Type.NUMBER, description: 'Estimated audio duration in seconds' },
                    segments: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.INTEGER },
                          start: { type: Type.NUMBER, description: 'Start time in seconds' },
                          end: { type: Type.NUMBER, description: 'End time in seconds' },
                          text: { type: Type.STRING, description: 'Exact lyric text for this segment' },
                          section: { type: Type.STRING, description: 'Optional section label like Verse 1 or Chorus' },
                        },
                        required: ['id', 'start', 'end', 'text'],
                      },
                    },
                  },
                  required: ['language', 'segments'],
                },
              },
            });
          }

          if (response && response.text) {
            break; // Success!
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`Model ${modelName} attempt ${attempt} failed:`, err?.message || err);
          const isOverloaded =
            err?.message?.includes('503') ||
            err?.message?.includes('high demand') ||
            err?.message?.includes('UNAVAILABLE') ||
            err?.status === 503;
          if (isOverloaded && attempt < 2) {
            // Wait 1.5 seconds before retrying
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          // If 503, 400, or model error, try next candidate model
          break;
        }
      }
      if (response && response.text) {
        break;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('All model candidates failed to transcribe.');
    }

    const rawText = response.text?.trim() || '';
    if (!rawText) {
      throw new Error('Received empty response from transcription engine.');
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(rawText);
    } catch (parseErr) {
      // Fallback: search for JSON block
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response into structured JSON.');
      }
    }

    // Post-process and sanitize segments
    let segments = Array.isArray(parsedResult.segments) ? parsedResult.segments : [];
    
    // Sort chronologically
    segments.sort((a: any, b: any) => (Number(a.start) || 0) - (Number(b.start) || 0));

    // Sanitize timestamps and sequential numbering
    const audioMaxDuration = typeof duration === 'number' && duration > 0 ? duration : 3600;
    const sanitizedSegments = segments.map((seg: any, idx: number) => {
      let start = Math.max(0, Number(seg.start) || 0);
      let end = Number(seg.end) || (start + 3.0);
      if (end <= start) {
        end = start + 2.5;
      }
      if (end > audioMaxDuration + 5) {
        end = audioMaxDuration;
      }

      let text = String(seg.text || '').trim();
      // If includeSections is false, strip bracketed sections like [Verse] or [Instrumental]
      if (!includeSections) {
        text = text.replace(/^\[.*?\]\s*/g, '').replace(/\s*\[.*?\]$/g, '').trim();
      }

      return {
        id: idx + 1,
        start: parseFloat(start.toFixed(3)),
        end: parseFloat(end.toFixed(3)),
        text,
        section: seg.section || undefined
      };
    }).filter((seg: any) => seg.text.length > 0);

    // Re-index cleanly
    sanitizedSegments.forEach((seg: any, idx: number) => {
      seg.id = idx + 1;
    });

    return res.json({
      title: parsedResult.title || songTitle || filename?.replace(/\.[^/.]+$/, '') || 'Untitled Track',
      language: parsedResult.language || language || 'auto',
      duration: duration || parsedResult.duration || 0,
      segments: sanitizedSegments
    });

  } catch (err: any) {
    console.error('Error in /api/transcribe:', err);
    let userMsg = err.message || 'Something went wrong while analyzing the audio.';
    
    // Check if error message is a JSON string from Google API
    try {
      if (userMsg.startsWith('{') && userMsg.endsWith('}')) {
        const parsed = JSON.parse(userMsg);
        if (parsed?.error?.message) {
          userMsg = parsed.error.message;
        }
      }
    } catch (_) {}

    if (userMsg.includes('503') || userMsg.includes('high demand') || userMsg.includes('UNAVAILABLE')) {
      userMsg = 'Server Gemini sedang mengalami lonjakan trafik sementara (503 High Demand). Silakan klik "Coba Lagi".';
    }

    return res.status(500).json({
      error: userMsg,
      code: err?.code || (userMsg.includes('503') ? 503 : undefined),
      details: err.stack ? err.stack.split('\n')[0] : undefined
    });
  }
});

// Re-sync endpoint: re-align specific or all segments while keeping existing text
app.post('/api/resync', async (req, res) => {
  try {
    const { audioData, mimeType, segments, mode, targetIndex, duration } = req.body;

    if (!audioData || !Array.isArray(segments) || segments.length === 0) {
      return res.status(400).json({ error: 'Missing audio or segments for re-synchronization.' });
    }

    const clientKey = (req.headers['x-gemini-api-key'] as string)?.trim();
    const activeApiKey = clientKey || process.env.GEMINI_API_KEY;

    if (!activeApiKey) {
      return res.status(401).json({
        error: 'GEMINI_API_KEY tidak ditemukan. Silakan atur GEMINI_API_KEY di Vercel atau masukkan API Key Anda sendiri di menu Kunci API.',
        code: 'MISSING_API_KEY'
      });
    }

    const { data: base64Data, mimeType: extractedMime } = cleanBase64(audioData);
    const audioMime = mimeType || extractedMime || 'audio/mp3';

    const ai = new GoogleGenAI({
      apiKey: activeApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const segmentsTextList = segments.map((s, idx) => `${idx + 1}. [approx ${s.start}s - ${s.end}s]: ${s.text}`).join('\n');

    const prompt = `You are an audio timing re-synchronization specialist.
We have an existing set of lyrics that the user has verified.
DO NOT change, add, or delete any words in the lyric text.
Your ONLY job is to listen closely to the singing in the audio track and adjust start and end timestamps for the requested segment(s) to match the vocals with millisecond precision.

Re-sync mode: ${mode || 'all'}.
${mode === 'selected' && typeof targetIndex === 'number' ? `Focus specifically on refining timestamp for item #${targetIndex + 1}: "${segments[targetIndex]?.text}".` : ''}
${mode === 'from_index' && typeof targetIndex === 'number' ? `Refine timestamps starting from item #${targetIndex + 1} onwards.` : ''}

Original Segments:
${segmentsTextList}

Return structured JSON with the exact same segments and text, but with refreshed, perfectly synchronized "start" and "end" timestamps in seconds.`;

    const audioPart = {
      inlineData: {
        mimeType: audioMime,
        data: base64Data,
      },
    };

    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest'];
    let response: any = null;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [audioPart, { text: prompt }],
          },
          config: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                segments: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.INTEGER },
                      start: { type: Type.NUMBER },
                      end: { type: Type.NUMBER },
                      text: { type: Type.STRING },
                    },
                    required: ['id', 'start', 'end', 'text'],
                  },
                },
              },
              required: ['segments'],
            },
          },
        });
        if (response && response.text) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('Failed to re-sync timestamps.');
    }

    const rawText = response.text?.trim() || '';
    const parsed = JSON.parse(rawText);

    // Merge new timestamps back into original segments to guarantee user text is 100% preserved
    const updatedSegments = segments.map((orig, idx) => {
      const matched = parsed.segments?.find((s: any) => s.id === orig.id) || parsed.segments?.[idx];
      if (matched && typeof matched.start === 'number' && typeof matched.end === 'number') {
        return {
          ...orig,
          start: parseFloat(Math.max(0, matched.start).toFixed(3)),
          end: parseFloat(Math.max(matched.start + 0.5, matched.end).toFixed(3)),
        };
      }
      return orig;
    });

    return res.json({ segments: updatedSegments });
  } catch (err: any) {
    console.error('Error in /api/resync:', err);
    return res.status(500).json({ error: err.message || 'Failed to re-sync timestamps.' });
  }
});

// Configure Vite integration for development or serve static build in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' || !fs.existsSync(path.resolve(__dirname, 'src'));

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LyricSync AI server listening on http://0.0.0.0:${PORT}`);
  });
}

// Only start standalone listener when not running in Vercel Serverless environment
if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export default app;
