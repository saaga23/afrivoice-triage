import { ChatInterface } from "@/components/voice-ui";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Activity, Mic, ShieldCheck, Globe2, Zap } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/40 to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <header className="sticky top-0 z-50 glass">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight">AfriVoice Triage</span>
          </div>
          <nav className="flex items-center gap-3">
            <a
              href="/bench"
              className="inline-flex items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] hover:bg-muted hover:text-foreground dark:hover:bg-muted/50"
            >
              Benchmark
            </a>
            <a
              href="#demo"
              className="inline-flex items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Try Demo
            </a>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-200/30 dark:bg-emerald-900/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-teal-200/20 dark:bg-teal-900/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 pt-16 pb-12">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              <Zap className="w-3 h-3 mr-1" />
              MLC Africa × Intron Challenge 2026
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
              Agentic Voice AI for{" "}
              <span className="text-emerald-600 dark:text-emerald-400">African Healthcare</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
              Voice-driven symptom triage that understands code-switched speech. Built on Intron Sahara,
              powered by LangGraph reasoning.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <Badge variant="outline" className="gap-1.5">
                <Mic className="w-3.5 h-3.5" />
                Voice-First
              </Badge>
              <Badge variant="outline" className="gap-1.5">
                <Globe2 className="w-3.5 h-3.5" />
                5+ Languages
              </Badge>
              <Badge variant="outline" className="gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                HIPAA-Ready
              </Badge>
              <Badge variant="outline" className="gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Agentic Pipeline
              </Badge>
            </div>
          </div>
        </div>
      </section>

      <section id="demo" className="container mx-auto px-4 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/60 dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Virtual Triage
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Speak or type symptoms in English, Swahili, Yoruba, Hausa, and more
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Online</span>
                  </div>
                </div>
                <div className="h-[520px]">
                  <ChatInterface />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Card className="p-5">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">How it works</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Patient speaks in any mix of languages. Sahara transcribes, LangGraph classifies
                      intent, and the agent triages urgency.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Voice Input</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Tap the mic and speak naturally. Supports code-switching between English and
                      African languages.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Agentic Reasoning</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Not just transcription. The agent classifies intent, assesses urgency, and
                      recommends next steps.
                    </p>
                  </div>
                </div>
              </Card>

              <Separator className="my-2" />

              <div className="px-1">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                  Benchmarking
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-300">Sahara v2</span>
                    <Badge variant="secondary" className="text-xs">Primary</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-300">Whisper (whisper-1)</span>
                    <Badge variant="outline" className="text-xs">Baseline</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-300">GPT-4o Audio</span>
                    <Badge variant="outline" className="text-xs">Baseline</Badge>
                  </div>
                </div>
                <a
                  href="/bench"
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] border-border bg-background hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 w-full mt-3"
                >
                  View Benchmark
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 backdrop-blur">
        <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
          <p>AfriVoice Triage — MLC Africa × Intron Agentic Voice AI Challenge 2026</p>
          <p>Built with Next.js, LangGraph, and Intron Sahara</p>
        </div>
      </footer>
    </main>
  );
}
