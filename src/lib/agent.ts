import { StateGraph, END } from "@langchain/langgraph";
import { createSaharaClient, SaharaClient } from "./sahara";
import OpenAI from "openai";

export type AgentMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type TriageSummary = {
  symptoms: string;
  urgency: "low" | "moderate" | "high" | "emergency";
  recommended_action: string;
  not_a_diagnosis: true;
};

export type AgentState = {
  messages: AgentMessage[];
  transcription?: string;
  intent?: string;
  urgency?: TriageSummary["urgency"];
  toolCalls?: string[];
  response?: string;
  audioUrl?: string;
  triageSummary?: TriageSummary;
};

// Multilingual emergency terms (ASCII-folded match) across the benchmarked languages.
// A patient who says "siwezi kupumua" (Swahili: I can't breathe) must escalate
// exactly like "I can't breathe" — monolingual emergency detection is a safety hole.
const EMERGENCY_TERMS = [
  // English
  "chest", "breath", "breathing", "bleed", "unconscious", "seizure", "choking",
  // Swahili
  "kupumua", "kifua", "damu nyingi", "kuzimia",
  // Hausa
  "jini", "numfashi", "zubar da jini", "kirin",
  // Yoruba
  "eje", "ẹjẹ", "imi", "ìmí",
  // Igbo
  "obara", "ọbara", "iku ume",
  // Kinyarwanda
  "guhumeka", "amaraso",
  // Shona
  "ropa", "kupfuma",
  // Pidgin
  "no fit breathe", "dey bleed",
];

const SYMPTOM_TERMS = [
  "pain", "sick", "symptom", "headache", "fever", "migraine", "stomach", "nausea",
  "vomit", "diarrhea", "dizzy", "cough", "ache",
  // Swahili: pain, fever, head
  "maumivu", "joto", "kichwa", "homa", "kizunguzungu",
  // Hausa: pain, fever
  "ciwo", "zazzabi", "azabtarwa",
  // Yoruba: pain/sick
  "iraanu", "aarun", "ori",
];

function fold(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function detectEmergency(text: string): boolean {
  const f = fold(text);
  return EMERGENCY_TERMS.some((t) => f.includes(fold(t)));
}

function computeUrgency(text: string, intent?: string): TriageSummary["urgency"] {
  if (detectEmergency(text)) return "emergency";
  if (intent === "triage") return "moderate";
  return "low";
}

const SYSTEM_PROMPT = `You are a medical triage assistant for a healthcare clinic in Africa.
You specialize in code-switched conversations (English, Swahili, Yoruba, Hausa, Amharic, Zulu, Kinyarwanda).
Your job is to triage patients by collecting symptoms, assessing urgency, and recommending next steps.
Always ask clarifying questions if symptoms are unclear.
Do not provide definitive diagnoses. If emergency symptoms (chest pain, difficulty breathing, severe bleeding) are reported, classify as HIGH urgency.
Respond in the same language the patient used, or mix languages naturally if they code-switch.`;

function createLLMClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "your_openai_api_key_here") {
    return null;
  }
  return new OpenAI({ apiKey });
}

export class VoiceAgent {
  private client: SaharaClient | null;
  private graph: ReturnType<VoiceAgent["createGraph"]>;
  private llm: OpenAI | null;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.SAHARA_API_KEY;
    this.client = key ? createSaharaClient(key) : null;
    this.llm = createLLMClient();
    this.graph = this.createGraph();
  }

  private createGraph() {
    return new StateGraph<AgentState>({
      channels: {
        messages: { value: (a: unknown, b: unknown) => (Array.isArray(a) && Array.isArray(b) ? a.concat(b) : (a as AgentMessage[]).concat(b as AgentMessage[])), default: () => [] },
        transcription: { value: (a: unknown, b: unknown) => (a ?? b) as AgentState["transcription"], default: () => undefined },
        intent: { value: (a: unknown, b: unknown) => (a ?? b) as AgentState["intent"], default: () => undefined },
        urgency: { value: (a: unknown, b: unknown) => (a ?? b) as AgentState["urgency"], default: () => undefined },
        triageSummary: { value: (a: unknown, b: unknown) => (a ?? b) as AgentState["triageSummary"], default: () => undefined },
        toolCalls: {
          value: (a: unknown, b: unknown) => {
            const merged = Array.isArray(a) && Array.isArray(b) ? a.concat(b) : (a ?? b) as string[];
            return [...new Set(merged)];
          },
          default: () => [],
        },
        response: { value: (a: unknown, b: unknown) => (a ?? b) as AgentState["response"], default: () => undefined },
      },
    })
      .addNode("classify_intent", async (state: AgentState) => {
        const userText = state.transcription || state.messages.filter(m => m.role === "user").pop()?.content || "";
        if (this.llm) {
          try {
            const completion = await this.llm.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: "Classify as: triage, booking, refill, general_support. Reply with only the intent." },
                { role: "user", content: userText },
              ],
              max_tokens: 20,
            });
            return {
              ...state,
              intent: completion.choices[0]?.message?.content?.trim() || "general_support",
            };
          } catch {
            // fall through to rule-based
          }
        }
        const lower = fold(userText);
        let intent = "general_support";
        if (SYMPTOM_TERMS.some((t) => lower.includes(fold(t)))) intent = "triage";
        else if (lower.includes("book") || lower.includes("appointment") || lower.includes("schedule")) intent = "booking";
        else if (lower.includes("refill") || lower.includes("prescription")) intent = "refill";
        return { ...state, intent };
      })
      .addNode("route_to_tool", async (state: AgentState) => {
        // Return only channel updates (partial) — full-state spreads double-apply reducers.
        if (state.intent === "triage") {
          return {
            toolCalls: ["triage"],
            messages: [{ role: "assistant" as const, content: "I'll help assess your symptoms." }],
          };
        }
        if (state.intent === "booking") {
          return {
            toolCalls: ["booking"],
            messages: [{ role: "assistant" as const, content: "I can help you book an appointment." }],
          };
        }
        return { toolCalls: [] };
      })
      .addNode("generate_response", async (state: AgentState) => {
        const lastUser = state.messages.filter(m => m.role === "user").pop()?.content || state.transcription || "";
        const urgency = computeUrgency(lastUser, state.intent);
        const triageSummary: TriageSummary | undefined = state.intent === "triage" ? {
          symptoms: lastUser.slice(0, 300),
          urgency,
          recommended_action: urgency === "emergency"
            ? "seek_immediate_care"
            : "collect_more_symptoms_then_advise",
          not_a_diagnosis: true,
        } : undefined;
        if (this.llm) {
          try {
            const completion = await this.llm.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...state.messages,
              ],
            });
            const response = completion.choices[0]?.message?.content?.trim() || "I'm sorry, I didn't catch that.";
            return {
              response,
              urgency,
              triageSummary,
              messages: [{ role: "assistant" as const, content: response }],
            };
          } catch {
            // fall through to rule-based
          }
        }
        const response = ruleBasedResponse(lastUser, state.intent);
        return {
          response,
          urgency,
          triageSummary,
          messages: [{ role: "assistant" as const, content: response }],
        };
      })
      .addEdge("__start__", "classify_intent")
      .addEdge("classify_intent", "route_to_tool")
      .addEdge("route_to_tool", "generate_response")
      .addEdge("generate_response", END)
      .compile();
  }

  async processVoiceInput(audioBlob: Blob): Promise<AgentState> {
    const client = this.client;
    if (!client) {
      throw new Error("SAHARA_API_KEY is required for voice input");
    }
    const transcription = await client.transcribeStream(audioBlob, {
      language: "en",
    });

    const state: AgentState = {
      messages: [
        { role: "user", content: transcription.text },
      ],
      transcription: transcription.text,
    };

    const result = (await this.graph.invoke(state)) as AgentState;
    if (result.response) {
      try {
        // Short TTS budget: a stalled TTS queue must not hold the triage response hostage.
        const tts = await client.synthesizeSpeech(result.response, { timeoutMs: 12000 });
        result.audioUrl = tts.audio_url;
      } catch {
        // TTS failure should not block the response
      }
    }
    return result;
  }

  async textChat(message: string): Promise<AgentState> {
    const state: AgentState = {
      messages: [
        { role: "user", content: message },
      ],
    };

    const result = (await this.graph.invoke(state)) as AgentState;
    if (result.response && this.client) {
      try {
        const tts = await this.client.synthesizeSpeech(result.response, { timeoutMs: 12000 });
        result.audioUrl = tts.audio_url;
      } catch {
        // TTS failure should not block the response
      }
    }
    return result;
  }
}

function ruleBasedResponse(userText: string, intent?: string): string {
  const lower = fold(userText);
  const hasSymptom = SYMPTOM_TERMS.some((t) => lower.includes(fold(t)));
  if (intent === "triage" || hasSymptom) {
    if (detectEmergency(userText)) {
      return "This sounds like a medical emergency. Please seek immediate care at the nearest hospital or call emergency services.";
    }
    return "I understand you're not feeling well. Can you tell me more about your symptoms? How long have you been feeling this way?";
  }
  if (intent === "booking") return "I can help you book an appointment. What date and time works best for you?";
  if (intent === "refill") return "I can help with your prescription refill. Please provide your prescription ID.";
  return "Thank you for reaching out. Could you please describe your symptoms or let me know how I can assist you?";
}

export function createVoiceAgent(apiKey?: string): VoiceAgent {
  return new VoiceAgent(apiKey);
}
