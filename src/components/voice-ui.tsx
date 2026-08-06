"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Loader2, Volume2, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

type TriageSummary = {
  symptoms: string;
  urgency: "low" | "moderate" | "high" | "emergency";
  recommended_action: string;
  not_a_diagnosis: boolean;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  transcription?: string;
  intent?: string;
  urgency?: string;
  toolCalls?: string[];
  audioUrl?: string;
  triageSummary?: TriageSummary;
  timestamp: Date;
};

export function VoiceRecorder({ onSendAudio, disabled }: { onSendAudio?: (audioBlob: Blob) => void; disabled?: boolean }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef<string>("audio/webm");

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      alert("Voice recording is not supported in this browser");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/aac",
      ].find((t) => MediaRecorder.isTypeSupported(t));
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mimeTypeRef.current = mimeType || "audio/webm";
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        if (onSendAudio) {
          setIsProcessing(true);
          await onSendAudio(blob);
          setIsProcessing(false);
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
    } catch (error) {
      console.error("Microphone access denied:", error);
      alert("Microphone access is required for voice input. Please allow microphone access.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      {!isRecording ? (
        <Button
          onClick={startRecording}
          disabled={isProcessing || disabled}
          title={disabled ? "Voice input declined — text-only mode" : "Record a voice message"}
          aria-label={disabled ? "Voice input declined — text-only mode" : "Record a voice message"}
          className="rounded-full w-12 h-12 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
          size="icon"
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </Button>
      ) : (
        <>
          <Button
            onClick={stopRecording}
            aria-label="Stop recording and send"
            className="rounded-full w-12 h-12 bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 animate-pulse"
            size="icon"
          >
            <Square className="w-5 h-5" />
          </Button>
          <span className="text-xs font-medium text-red-600 dark:text-red-400 whitespace-nowrap" role="status">
            ● Recording — tap to stop
          </span>
        </>
      )}
    </div>
  );
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [voiceDeclined, setVoiceDeclined] = useState(false);
  const [voiceLang, setVoiceLang] = useState("en");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputBarRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const processResponse = async (userContent: string, audioBase64?: string, userMessageId?: string) => {
    setIsLoading(true);
    try {
      // Send prior turns so the agent reasons over the whole conversation.
      // Server stores nothing — history is re-sent by the client each time.
      const history = messages
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(audioBase64 ? { audio: audioBase64, language: voiceLang, history } : { message: userContent, history }),
      });

      if (!res.ok) throw new Error("Failed to get response");
      const data = await res.json();

      if (userMessageId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMessageId
              ? {
                  ...m,
                  content: data.transcription
                    ? data.transcription
                    : "(couldn't transcribe — please try again or type)",
                  transcription: data.transcription || undefined,
                }
              : m
          )
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.response,
          transcription: data.transcription,
          intent: data.intent,
          urgency: data.urgency || classifyUrgency(data.intent, data.response),
          toolCalls: data.toolCalls,
          audioUrl: data.audioUrl,
          triageSummary: data.triageSummary,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const classifyUrgency = (intent?: string, response?: string): string | undefined => {
    const text = `${intent || ""} ${response || ""}`.toLowerCase();
    if (text.includes("emergency") || text.includes("urgent") || text.includes("high")) return "high";
    if (text.includes("moderate")) return "moderate";
    if (text.includes("low")) return "low";
    return undefined;
  };

  const handleSendAudio = async (blob: Blob) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: "Voice message...",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      await processResponse("", base64, userMessage.id);
    };
    reader.readAsDataURL(blob);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    await processResponse(currentInput);
  };

  useEffect(() => {
    scrollToBottom();
    // On mobile the chat card fills most of the screen; when the agent replies,
    // make sure the input bar is in view so the conversation can continue.
    if (!isLoading && messages.length > 0) {
      inputBarRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    // After the consent gate opens the chat, bring the input bar into view
    // (small phones would otherwise land with it just below the fold).
    if (consentGiven || voiceDeclined) {
      const t = setTimeout(() => {
        inputBarRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [consentGiven, voiceDeclined]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const lastAssistant = messages.filter((m) => m.role === "assistant").pop();
    if (lastAssistant?.audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      const audio = new Audio(lastAssistant.audioUrl);
      audioRef.current = audio;
      audio.play().catch(() => {});
    }
  }, [messages]);

  const urgencyColor = (urgency?: string) => {
    if (urgency === "emergency") return "bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700";
    if (urgency === "high") return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800";
    if (urgency === "moderate") return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800";
    if (urgency === "low") return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800";
    return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  };

  return (
    <div className="flex flex-col h-full">
      {!consentGiven && !voiceDeclined && (
        <div className="flex-1 flex items-center justify-center p-6">
          <Card role="dialog" aria-modal="true" aria-label="Voice consent" className="max-w-md p-6 space-y-4 border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Consent Required</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              This application records voice for medical triage purposes. Audio is processed temporarily and not stored.
              By continuing, you consent to voice processing.
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
              This is not a diagnosis. Consult a healthcare professional for medical advice.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setConsentGiven(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                I Agree
              </Button>
              <Button variant="outline" onClick={() => setVoiceDeclined(true)} className="border-amber-300 text-amber-700 hover:bg-amber-100">
                Decline (text only)
              </Button>
            </div>
          </Card>
        </div>
      )}

      {(consentGiven || voiceDeclined) && (
        <>
          <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center mb-4">
                <Volume2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-lg font-medium text-slate-900 dark:text-white mb-1">
                Start a consultation
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                {voiceDeclined && !consentGiven
                  ? "Type your symptoms below in any language. Our agent will triage your case."
                  : "Tap the microphone and describe your symptoms in any language. Our agent will triage your case."}
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <Card
                className={`max-w-[85%] p-4 rounded-2xl ${
                  message.role === "user"
                    ? "bg-emerald-600 text-white border-emerald-600 rounded-br-md"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-bl-md shadow-sm"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="space-y-2.5">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                      {message.content}
                    </p>
                    {(message.intent || message.urgency || message.toolCalls?.length) && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {message.intent && (
                          <Badge key={`intent-${message.intent}`} variant="secondary" className="text-xs">
                            {message.intent.replace(/_/g, " ")}
                          </Badge>
                        )}
                        {message.urgency && (
                          <Badge
                            key={`urgency-${message.urgency}`}
                            variant="outline"
                            className={`text-xs ${urgencyColor(message.urgency)}`}
                          >
                            {message.urgency} urgency
                          </Badge>
                        )}
                        {[...new Set(message.toolCalls ?? [])].map((tool) => (
                          <Badge key={`tool-${tool}`} variant="outline" className="text-xs">
                            {tool}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {message.triageSummary && (
                      <div className="mt-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 p-3 space-y-1">
                        <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                          Triage summary — handoff card
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          <span className="font-medium">Symptoms:</span> {message.triageSummary.symptoms}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          <span className="font-medium">Urgency:</span> {message.triageSummary.urgency}
                          {" · "}
                          <span className="font-medium">Action:</span>{" "}
                          {message.triageSummary.recommended_action.replace(/_/g, " ")}
                        </p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-300">
                          Not a diagnosis — share with a healthcare professional.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {message.role === "user" && message.transcription && (
                      <p className="text-xs opacity-75 italic mb-1.5 text-emerald-100">
                        Voice message
                      </p>
                    )}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                  </div>
                )}
                <p
                  className={`text-xs mt-2 ${
                    message.role === "user" ? "text-emerald-100" : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </Card>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <Card className="p-4 rounded-2xl rounded-bl-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span className="text-sm text-slate-600 dark:text-slate-300">Processing...</span>
                </div>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      <div ref={inputBarRef} className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <select
            value={voiceLang}
            onChange={(e) => setVoiceLang(e.target.value)}
            disabled={voiceDeclined && !consentGiven}
            aria-label="Voice input language"
            title="Language you'll speak in (Sahara ASR hint)"
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 sm:px-2 py-2.5 text-xs dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-40 max-w-[88px] sm:max-w-none"
          >
            <option value="en">English</option>
            <option value="sw">Swahili</option>
            <option value="yo">Yoruba</option>
            <option value="ha">Hausa</option>
            <option value="ig">Igbo</option>
            <option value="pcm">Pidgin</option>
            <option value="sn">Shona</option>
            <option value="rw">Kinyarwanda</option>
          </select>
          <VoiceRecorder onSendAudio={handleSendAudio} disabled={voiceDeclined && !consentGiven} />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your symptoms..."
            aria-label="Describe your symptoms"
            enterKeyHint="send"
            className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 sm:px-4 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-slate-100 dark:placeholder:text-slate-500"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="icon"
            aria-label="Send message"
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 text-center font-medium">
          Not a diagnosis. Consult a healthcare professional for medical advice.
        </p>
      </div>
        </>
      )}
    </div>
  );
}
