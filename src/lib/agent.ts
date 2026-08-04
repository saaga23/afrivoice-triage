import { StateGraph, END } from "@langchain/langgraph";
import { createSaharaClient } from "./sahara";
import OpenAI from "openai";

export type AgentMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type AgentState = {
  messages: AgentMessage[];
  transcription?: string;
  intent?: string;
  toolCalls?: string[];
  response?: string;
  audioUrl?: string;
};

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
  private client: ReturnType<typeof createSaharaClient>;
  private graph: ReturnType<VoiceAgent["createGraph"]>;
  private llm: OpenAI | null;

  constructor(apiKey?: string) {
    this.client = createSaharaClient(apiKey);
    this.llm = createLLMClient();
    this.graph = this.createGraph();
  }

  private createGraph() {
    return new StateGraph<AgentState>({
      channels: {
        messages: { value: (a: unknown, b: unknown) => (Array.isArray(a) && Array.isArray(b) ? a.concat(b) : (a as AgentMessage[]).concat(b as AgentMessage[])), default: () => [] },
        transcription: { value: (a: unknown, b: unknown) => (a ?? b) as AgentState["transcription"], default: () => undefined },
        intent: { value: (a: unknown, b: unknown) => (a ?? b) as AgentState["intent"], default: () => undefined },
        toolCalls: {
          value: (a: unknown, b: unknown) =>
            Array.isArray(a) && Array.isArray(b) ? a.concat(b) : (a ?? b) as AgentState["toolCalls"],
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
        const lower = userText.toLowerCase();
        let intent = "general_support";
        if (lower.includes("pain") || lower.includes("sick") || lower.includes("maumivu") || lower.includes("joto") || lower.includes("symptom")) intent = "triage";
        else if (lower.includes("book") || lower.includes("appointment") || lower.includes("schedule")) intent = "booking";
        else if (lower.includes("refill") || lower.includes("prescription")) intent = "refill";
        return { ...state, intent };
      })
      .addNode("route_to_tool", async (state: AgentState) => {
        if (state.intent === "triage") {
          return {
            ...state,
            toolCalls: ["triage"],
            messages: [
              ...state.messages,
              { role: "assistant", content: "I'll help assess your symptoms." },
            ],
          };
        }
        if (state.intent === "booking") {
          return {
            ...state,
            toolCalls: ["booking"],
            messages: [
              ...state.messages,
              { role: "assistant", content: "I can help you book an appointment." },
            ],
          };
        }
        return {
          ...state,
          toolCalls: [],
          messages: [...state.messages],
        };
      })
      .addNode("generate_response", async (state: AgentState) => {
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
              ...state,
              response,
              messages: [...state.messages, { role: "assistant", content: response }],
            };
          } catch {
            // fall through to rule-based
          }
        }
        const lastUser = state.messages.filter(m => m.role === "user").pop()?.content || "";
        const response = ruleBasedResponse(lastUser, state.intent);
        return {
          ...state,
          response,
          messages: [...state.messages, { role: "assistant", content: response }],
        };
      })
      .addEdge("__start__", "classify_intent")
      .addEdge("classify_intent", "route_to_tool")
      .addEdge("route_to_tool", "generate_response")
      .addEdge("generate_response", END)
      .compile();
  }

  async processVoiceInput(audioBlob: Blob): Promise<AgentState> {
    const transcription = await this.client.transcribeStream(audioBlob, {
      model: "sahara-v2",
    });

    const state: AgentState = {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: transcription.text },
      ],
      transcription: transcription.text,
    };

    const result = (await this.graph.invoke(state)) as AgentState;
    if (result.response) {
      try {
        const tts = await this.client.synthesizeSpeech(result.response);
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
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
    };

    const result = (await this.graph.invoke(state)) as AgentState;
    if (result.response) {
      try {
        const tts = await this.client.synthesizeSpeech(result.response);
        result.audioUrl = tts.audio_url;
      } catch {
        // TTS failure should not block the response
      }
    }
    return result;
  }
}

function ruleBasedResponse(userText: string, intent?: string): string {
  const lower = userText.toLowerCase();
  if (intent === "triage" || lower.includes("pain") || lower.includes("maumivu") || lower.includes("sick") || lower.includes("joto")) {
    if (lower.includes("chest") || lower.includes("breath") || lower.includes("bleeding")) {
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
