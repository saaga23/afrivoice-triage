import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSaharaClient } from "@/lib/sahara";

export const dynamic = "force-dynamic";

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
    const { audio, referenceText } = body as { audio?: string; referenceText?: string };

    if (!audio) {
      return NextResponse.json({ error: "audio is required" }, { status: 400 });
    }

    const base64Data = audio.includes(",") ? audio.split(",")[1] : audio;
    const buffer = Buffer.from(base64Data, "base64");
    const blob = new Blob([buffer], { type: "audio/webm" });

    const results: Array<{ model: string; wer: number | null; latency: number; costPerMinute: number | null; transcript?: string; error?: string }> = [];

    // Sahara v2 via Intron Voice API
    try {
      const saharaApiKey = process.env.SAHARA_API_KEY;
      if (saharaApiKey) {
        const start = performance.now();
        const client = createSaharaClient(saharaApiKey);
        const transcription = await client.transcribeStream(blob, { language: "en" });
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
          wer: 1,
          latency: 0,
          costPerMinute: null,
          error: "No SAHARA_API_KEY configured",
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sahara failed";
      results.push({
        model: "Sahara v2",
        wer: 1,
        latency: 0,
        costPerMinute: null,
        error: message,
      });
    }

    // Whisper (whisper-1)
    try {
      const start = performance.now();
      const whisperForm = new FormData();
      whisperForm.append("file", blob, "audio.webm");
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
            wer: 1,
            latency,
            costPerMinute: 0.006,
            error: `HTTP ${whisperRes.status}`,
          });
        }
      } else {
        results.push({
          model: "Whisper (whisper-1)",
          wer: 1,
          latency: 0,
          costPerMinute: 0.006,
          error: "No OPENAI_API_KEY configured",
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Whisper failed";
      results.push({
        model: "Whisper (whisper-1)",
        wer: 1,
        latency: 0,
        costPerMinute: 0.006,
        error: message,
      });
    }

    // GPT-4o Audio
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const start = performance.now();
      const transcription = await openai.audio.transcriptions.create({
        file: new File([blob], "audio.webm", { type: "audio/webm" }),
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
    } catch (e) {
      const message = e instanceof Error ? e.message : "GPT-4o Audio failed";
      results.push({
        model: "GPT-4o Audio",
        wer: 1,
        latency: 0,
        costPerMinute: 0.006,
        error: message,
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("/api/bench error", error);
    return NextResponse.json({ error: "Failed to run benchmark" }, { status: 500 });
  }
}
