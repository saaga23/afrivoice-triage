"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Loader2, Volume2, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  transcription?: string;
  intent?: string;
  urgency?: string;
  toolCalls?: string[];
  audioUrl?: string;
  timestamp: Date;
};

export function VoiceRecorder({ onSendAudio }: { onSendAudio?: (audioBlob: Blob) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
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
          disabled={isProcessing}
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
        <Button
          onClick={stopRecording}
          className="rounded-full w-12 h-12 bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 animate-pulse"
          size="icon"
        >
          <Square className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  const scrollToBottom = () => {
    const container = document.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement | null;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  };

  const processResponse = async (userContent: string, audioBase64?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(audioBase64 ? { audio: audioBase64 } : { message: userContent }),
      });

      if (!res.ok) throw new Error("Failed to get response");
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.response,
          transcription: data.transcription,
          intent: data.intent,
          urgency: classifyUrgency(data.intent, data.response),
          toolCalls: data.toolCalls,
          audioUrl: data.audioUrl,
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
        transcription: base64,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      await processResponse("", base64);
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
  }, [messages]);

  useEffect(() => {
    const lastAssistant = messages.filter((m) => m.role === "assistant").pop();
    if (lastAssistant?.audioUrl) {
      const audio = new Audio(lastAssistant.audioUrl);
      audio.play().catch(() => {});
    }
  }, [messages]);

  const urgencyColor = (urgency?: string) => {
    if (urgency === "high") return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800";
    if (urgency === "moderate") return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800";
    if (urgency === "low") return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800";
    return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  };

  return (
    <div className="flex flex-col h-full">
      {!consentGiven && (
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md p-6 space-y-4 border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
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
              <Button variant="outline" onClick={() => setConsentGiven(false)} className="border-amber-300 text-amber-700 hover:bg-amber-100">
                Decline
              </Button>
            </div>
          </Card>
        </div>
      )}

      {consentGiven && (
        <>
          <ScrollArea className="flex-1 px-4 py-4">
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
                Tap the microphone and describe your symptoms in any language. Our agent will triage
                your case.
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
                            {message.intent}
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
                        {message.toolCalls?.map((tool) => (
                          <Badge key={`tool-${tool}`} variant="outline" className="text-xs">
                            {tool}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {message.role === "user" && message.transcription && (
                      <p className="text-xs opacity-75 italic mb-1.5 text-emerald-100">
                        Voice: {message.transcription}
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

      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <VoiceRecorder onSendAudio={handleSendAudio} />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your symptoms..."
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-slate-100 dark:placeholder:text-slate-500"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="icon"
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
