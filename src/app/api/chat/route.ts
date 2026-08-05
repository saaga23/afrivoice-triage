import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, audio } = body as { message?: string; audio?: string };

    if (!message && !audio) {
      return NextResponse.json(
        { error: "message or audio is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.SAHARA_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server misconfigured: SAHARA_API_KEY missing" },
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
      const state = await agent.processVoiceInput(blob);
      return NextResponse.json({
        transcription: state.transcription,
        intent: state.intent,
        response: state.response,
        toolCalls: state.toolCalls,
        audioUrl: state.audioUrl,
      });
    }

    const state = await agent.textChat(message!);
    return NextResponse.json({
      transcription: message,
      intent: state.intent,
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
