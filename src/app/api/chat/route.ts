import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, audio, language, history } = body as {
      message?: string;
      audio?: string;
      language?: string;
      history?: { role: string; content: string }[];
    };

    if (!message && !audio) {
      return NextResponse.json(
        { error: "message or audio is required" },
        { status: 400 }
      );
    }

    // Conversation context arrives from the client each turn — the server keeps
    // nothing, preserving the no-persistent-storage privacy guarantee.
    const sanitizedHistory = (Array.isArray(history) ? history : [])
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-20)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content.slice(0, 1000) }));

    const apiKey = process.env.SAHARA_API_KEY;
    if (audio && !apiKey) {
      return NextResponse.json(
        { error: "Server misconfigured: SAHARA_API_KEY missing (required for voice input)" },
        { status: 500 }
      );
    }

    // Dynamic import to avoid failing at build time if deps are missing
    const { createVoiceAgent } = await import("@/lib/agent");
    const agent = createVoiceAgent(apiKey);

    if (audio) {
      const base64Data = audio.includes(",") ? audio.split(",")[1] : audio;
      const buffer = Buffer.from(base64Data, "base64");
      const blob = new Blob([buffer], { type: "audio/webm" });
      const state = await agent.processVoiceInput(blob, language || "en", sanitizedHistory);
      return NextResponse.json({
        transcription: state.transcription,
        intent: state.intent,
        urgency: state.urgency,
        triageSummary: state.triageSummary,
        response: state.response,
        toolCalls: state.toolCalls,
        audioUrl: state.audioUrl,
      });
    }

    const state = await agent.textChat(message!, sanitizedHistory);
    return NextResponse.json({
      transcription: message,
      intent: state.intent,
      urgency: state.urgency,
      triageSummary: state.triageSummary,
      response: state.response,
      toolCalls: state.toolCalls,
      audioUrl: state.audioUrl,
    });
  } catch (error) {
    console.error("/api/chat error", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
