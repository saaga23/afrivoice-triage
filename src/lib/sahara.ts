export type SaharaSTTOptions = {
  language?: string;
};

export type SaharaTTSOptions = {
  voice_accent?: string;
  voice_gender?: "male" | "female";
  voice_language?: string;
  /** Max time (ms) to wait for queued TTS audio before giving up. Default 60000. */
  timeoutMs?: number;
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

const INTRON_VOICE_BASE = "https://infer.voice.intron.io";

export class SaharaClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  async transcribeStream(
    audioBlob: Blob,
    options: SaharaSTTOptions = {}
  ): Promise<TranscriptionResult> {
    const formData = new FormData();
    const fileName = options.language ? `recording_${options.language}_${Date.now()}` : `recording_${Date.now()}`;
    formData.append("audio_file_name", fileName);
    formData.append("audio_file_blob", audioBlob, "audio.webm");
    if (options.language) {
      formData.append("use_language_asr_input", options.language);
    }

    const response = await fetch(`${INTRON_VOICE_BASE}/file/v1/upload`, {
      method: "POST",
      headers: this.authHeaders(),
      body: formData,
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Sahara STT upload failed: ${response.status} ${text}`);
    }

    const result = await response.json();
    const fileId = result.data?.file_id;
    if (!fileId) {
      throw new Error(`Sahara STT upload failed: missing file_id in ${JSON.stringify(result)}`);
    }

    return this.pollTranscription(fileId);
  }

  async transcribeFile(
    filePath: string,
    options: SaharaSTTOptions = {}
  ): Promise<TranscriptionResult> {
    const fs = await import("fs");
    const arrayBuffer = fs.readFileSync(filePath).buffer;
    const blob = new Blob([arrayBuffer], { type: "audio/webm" });
    return this.transcribeStream(blob, options);
  }

  private async pollTranscription(
    fileId: string,
    attempts = 20,
    intervalMs = 3000
  ): Promise<TranscriptionResult> {
    for (let i = 0; i < attempts; i++) {
      const response = await fetch(`${INTRON_VOICE_BASE}/file/v1/status/${encodeURIComponent(fileId)}`, {
        headers: this.authHeaders(),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Sahara STT status failed: ${response.status} ${text}`);
      }

      const result = await response.json();
      const status = result.data?.processing_status;
      if (status === "FILE_TRANSCRIBED") {
        return {
          text: result.data.audio_transcript || "",
          duration: result.data.processed_audio_duration_in_seconds,
        };
      }
      if (status === "FILE_TRANSCRIPTION_FAILED") {
        throw new Error(`Sahara STT failed: ${result.data?.error_message || "transcription failed"}`);
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error("Sahara STT timed out waiting for transcription");
  }

  private async fetchWithTimeout(url: string, timeoutMs = 30000): Promise<ArrayBuffer> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.arrayBuffer();
    } finally {
      clearTimeout(timer);
    }
  }

  async synthesizeSpeech(
    text: string,
    options: SaharaTTSOptions = {}
  ): Promise<SpeechSynthesisResult> {
    const response = await fetch(`${INTRON_VOICE_BASE}/tts/v1/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.authHeaders(),
      },
      body: JSON.stringify({
        text,
        voice_accent: options.voice_accent || "swahili",
        voice_gender: options.voice_gender || "female",
        voice_language: options.voice_language || "en",
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok && response.status !== 503) {
      const text = await response.text();
      throw new Error(`Sahara TTS failed: ${response.status} ${text}`);
    }

    const result = await response.json();
    const audioPath = result.data?.audio_path;
    if (!audioPath) {
      const textId = result.data?.text_id;
      if (textId) {
        return this.pollTTSAudio(textId, options.timeoutMs ?? 60000);
      }
      throw new Error(`Sahara TTS failed: missing audio_path in ${JSON.stringify(result)}`);
    }

    const audioBuffer = await this.fetchWithTimeout(audioPath);
    const base64 = Buffer.from(audioBuffer).toString("base64");
    const dataUrl = `data:audio/wav;base64,${base64}`;

    return {
      audio_url: dataUrl,
      duration: result.data.audio_duration_in_seconds,
    };
  }

  private async pollTTSAudio(textId: string, timeoutMs = 60000): Promise<SpeechSynthesisResult> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const response = await fetch(`${INTRON_VOICE_BASE}/tts/v1/status/${encodeURIComponent(textId)}`, {
        headers: this.authHeaders(),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Sahara TTS status failed: ${response.status} ${text}`);
      }

      const result = await response.json();
      const status = result.data?.processing_status;
      if (status === "TTS_TEXT_AUDIO_GENERATED") {
        const audioPath = result.data?.audio_path;
        if (!audioPath) {
          throw new Error(`Sahara TTS status missing audio_path: ${JSON.stringify(result)}`);
        }
        const audioBuffer = await this.fetchWithTimeout(audioPath);
        const base64 = Buffer.from(audioBuffer).toString("base64");
        const dataUrl = `data:audio/wav;base64,${base64}`;
        return {
          audio_url: dataUrl,
          duration: result.data.audio_duration_in_seconds,
        };
      }
      if (status === "TTS_TEXT_AUDIO_PROCESSING_FAILED") {
        throw new Error(`Sahara TTS failed: ${result.data?.error_message || "processing failed"}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    throw new Error("Sahara TTS timed out waiting for audio generation");
  }
}

export function createSaharaClient(apiKey?: string): SaharaClient {
  const key = apiKey || process.env.SAHARA_API_KEY || "";
  if (!key) {
    throw new Error("SAHARA_API_KEY is required");
  }
  return new SaharaClient(key);
}
