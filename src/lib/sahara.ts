import OpenAI from "openai";

export type SaharaSTTOptions = {
  language?: string;
  model?: string;
  response_format?: "json" | "text";
  stream?: boolean;
};

export type SaharaTTSOptions = {
  voice?: string;
  model?: string;
  speed?: number;
};

export type TranscriptionResult = {
  text: string;
  language?: string;
  duration?: number;
};

export type SpeechSynthesisResult = {
  audio_url: string;
  duration?: number;
};

export class SaharaClient {
  private client: OpenAI;
  private sttEndpoint: string;
  private ttsEndpoint: string;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: "https://app.saharaai.com/developer/api/compute",
      defaultHeaders: {
        "x-api-key": apiKey,
      },
    });
    this.sttEndpoint = "/v1/audio/transcriptions";
    this.ttsEndpoint = "/v1/audio/speech";
  }

  async transcribeStream(
    audioBlob: Blob,
    options: SaharaSTTOptions = {}
  ): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", options.model || "sahara-v2");
    if (options.language) formData.append("language", options.language);
    formData.append("response_format", options.response_format || "json");

    const response = await fetch(
      `${this.client.baseURL}${this.sttEndpoint}`,
      {
        method: "POST",
      headers: {
        "x-api-key": (this.client.apiKey || "") as string,
      },
        body: formData,
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Sahara STT failed: ${response.status} ${text}`);
    }

    const result = await response.json();
    return {
      text: result.text || result.transcript || "",
      language: result.language || options.language,
      duration: result.duration,
    };
  }

  async transcribeFile(
    filePath: string,
    options: SaharaSTTOptions = {}
  ): Promise<TranscriptionResult> {
    const fs = await import("fs");
    const audioBuffer = fs.readFileSync(filePath);
    const blob = new Blob([audioBuffer], { type: "audio/webm" });
    return this.transcribeStream(blob, options);
  }

  // TODO: Wire this method into the agent pipeline so it can be called during response generation.
  async synthesizeSpeech(
    text: string,
    options: SaharaTTSOptions = {}
  ): Promise<SpeechSynthesisResult> {
    const response = await fetch(`${this.client.baseURL}${this.ttsEndpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": (this.client.apiKey || "") as string,
      },
      body: JSON.stringify({
        model: options.model || "sahara-v2-tts",
        input: text,
        voice: options.voice || "alloy",
        speed: options.speed ?? 1.0,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Sahara TTS failed: ${response.status} ${text}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const base64 = buffer.toString("base64");
    const dataUrl = `data:audio/mpeg;base64,${base64}`;

    return {
      audio_url: dataUrl,
    };
  }
}

export function createSaharaClient(apiKey?: string): SaharaClient {
  const key = apiKey || process.env.SAHARA_API_KEY || "";
  if (!key) {
    throw new Error("SAHARA_API_KEY is required");
  }
  return new SaharaClient(key);
}
