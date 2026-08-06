import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSaharaClient } from "@/lib/sahara";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function computeWER(reference: string, hypothesis: string): number {
  const ref = reference.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean);
  const hyp = hypothesis.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean);
  if (ref.length === 0) return hyp.length === 0 ? 0 : 1;
  const m = ref.length;
  const n = hyp.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = ref[i - 1] === hyp[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n] / m;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audio, referenceText, language, audioType } = body as {
      audio?: string;
      referenceText?: string;
      language?: string;
      audioType?: string;
    };

    if (!audio) {
      return NextResponse.json({ error: "audio is required" }, { status: 400 });
    }

    const base64Data = audio.includes(",") ? audio.split(",")[1] : audio;
    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length > 8_000_000) {
      return NextResponse.json({ error: "Audio too large (max ~8MB)" }, { status: 413 });
    }
    // Real container type comes from the client (uploaded file or recorder)
    const blobType = typeof audioType === "string" && audioType.startsWith("audio/") ? audioType : "audio/webm";
    const blob = new Blob([buffer], { type: blobType });
    const ext = blobType.split("/")[1]?.split(";")[0] || "webm";
    // Sahara language hint — without it, non-English audio can return empty
    const saharaLang = typeof language === "string" && language ? language : undefined;

    const results: Array<{ model: string; wer: number | null; latency: number; costPerMinute: number | null; transcript?: string; error?: string }> = [];

    // Sahara v2 via Intron Voice API
    try {
      const saharaApiKey = process.env.SAHARA_API_KEY;
      if (saharaApiKey) {
        const start = performance.now();
        const client = createSaharaClient(saharaApiKey);
        const transcription = await client.transcribeStream(blob, saharaLang ? { language: saharaLang } : {});
        const latency = (performance.now() - start) / 1000;
        const transcript = transcription.text || "";
        const wer = referenceText ? computeWER(referenceText, transcript) : null;
        results.push({
          model: "Sahara v2",
          wer,
          latency,
          costPerMinute: null,
          transcript,
        });
      } else {
        results.push({
          model: "Sahara v2",
          wer: null,
          latency: 0,
          costPerMinute: null,
          error: "not_configured",
        });
      }
    } catch (e) {
      console.error("Sahara bench error", e);
      results.push({
        model: "Sahara v2",
        wer: null,
        latency: 0,
        costPerMinute: null,
        error: "upstream_error",
      });
    }

    // Whisper (whisper-1)
    try {
      const start = performance.now();
      const whisperForm = new FormData();
      whisperForm.append("file", blob, `audio.${ext}`);
      whisperForm.append("model", "whisper-1");
      const whisperKey = process.env.OPENAI_API_KEY;
      if (whisperKey) {
        const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${whisperKey}` },
          body: whisperForm,
        });
        const latency = (performance.now() - start) / 1000;
        if (whisperRes.ok) {
          const data = await whisperRes.json();
          const transcript = data.text || "";
          const wer = referenceText ? computeWER(referenceText, transcript) : null;
          results.push({
            model: "Whisper (whisper-1)",
            wer,
            latency,
            costPerMinute: 0.006,
            transcript,
          });
        } else {
          results.push({
            model: "Whisper (whisper-1)",
            wer: null,
            latency,
            costPerMinute: null,
            error: "not_configured",
          });
        }
      } else {
        results.push({
          model: "Whisper (whisper-1)",
          wer: null,
          latency: 0,
          costPerMinute: null,
          error: "not_configured",
        });
      }
    } catch (e) {
      console.error("Whisper bench error", e);
      results.push({
        model: "Whisper (whisper-1)",
        wer: null,
        latency: 0,
        costPerMinute: null,
        error: "upstream_error",
      });
    }

    // GPT-4o Audio
    try {
      if (process.env.OPENAI_API_KEY) {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const start = performance.now();
        const transcription = await openai.audio.transcriptions.create({
          file: new File([blob], `audio.${ext}`, { type: blobType }),
          model: "gpt-4o-transcribe",
        });
        const latency = (performance.now() - start) / 1000;
        const transcript = transcription.text || "";
        const wer = referenceText ? computeWER(referenceText, transcript) : null;
        results.push({
          model: "GPT-4o Audio",
          wer,
          latency,
          costPerMinute: 0.006,
          transcript,
        });
      } else {
        results.push({
          model: "GPT-4o Audio",
          wer: null,
          latency: 0,
          costPerMinute: null,
          error: "not_configured",
        });
      }
    } catch (e) {
      console.error("GPT-4o bench error", e);
      results.push({
        model: "GPT-4o Audio",
        wer: null,
        latency: 0,
        costPerMinute: null,
        error: "upstream_error",
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("/api/bench error", error);
    return NextResponse.json({ error: "Failed to run benchmark" }, { status: 500 });
  }
}
