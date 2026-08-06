"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Loader2, BarChart3 } from "lucide-react";

type BenchmarkResult = {
  model: string;
  wer: number | null;
  latency: number;
  costPerMinute: number | null;
  transcript?: string;
  error?: string;
};

export default function BenchmarkPage() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [referenceText, setReferenceText] = useState("");
  const [benchLang, setBenchLang] = useState("");

  const runBenchmark = async () => {
    if (!audioFile) return;
    setIsRunning(true);
    setResults([]);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const audioBase64 = reader.result as string;
        const res = await fetch("/api/bench", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audio: audioBase64,
            referenceText,
            language: benchLang || undefined,
            audioType: audioFile.type || undefined,
          }),
        });

        if (!res.ok) throw new Error("Benchmark failed");
        const data = await res.json();
        setResults(data.results || []);
      } catch (error) {
        console.error("Benchmark error:", error);
        setResults([{ model: "Error", wer: null, latency: 0, costPerMinute: null, error: "Failed to run benchmark" }]);
      } finally {
        setIsRunning(false);
      }
    };
    reader.readAsDataURL(audioFile);
  };

  const renderBar = (value: number, max: number = 1, inverse: boolean = false) => {
    const percentage = Math.min((value / max) * 100, 100);
    const isGood = inverse ? percentage < 30 : percentage > 70;
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${isGood ? "bg-green-500" : "bg-red-500"}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Model Benchmark
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Compare Sahara v2 against competing models on code-switched audio
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push("/")}>
            Back to Triage
          </Button>
        </div>

        <div className="max-w-5xl mx-auto grid gap-6">
          <Card className="p-6 border-emerald-200 dark:border-emerald-800">
            <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              Official results — N=120 real AfriSwitch code-switched utterances
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              All 3 models ran on the same 120 test-split samples (20 per language × 6 languages). Lower WER is better.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 font-medium">Model</th>
                    <th className="py-2 font-medium">Overall WER</th>
                    <th className="py-2 font-medium">Mean latency</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2.5 font-medium">Sahara v2 <span className="text-xs text-emerald-700 dark:text-emerald-400 font-normal">(Primary)</span></td>
                    <td className="py-2.5 font-mono font-semibold text-emerald-700 dark:text-emerald-400">0.603</td>
                    <td className="py-2.5">7.4s</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2.5 font-medium">Whisper large-v3</td>
                    <td className="py-2.5 font-mono">0.692</td>
                    <td className="py-2.5">79.6s</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2.5 font-medium">wav2vec2 XLS-R-53</td>
                    <td className="py-2.5 font-mono">0.853</td>
                    <td className="py-2.5">3.1s</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              Per-language Sahara/Whisper — Hausa 0.371/0.892 · Pidgin 0.390/0.338 · Swahili 0.400/0.525 · Yoruba 0.688/0.959 · Igbo 0.881/0.668 · Shona 0.885/0.773.{" "}
              Full report with pros/cons:{" "}
              <a href="https://github.com/saaga23/afrivoice-triage/blob/master/docs/BENCHMARK.md" target="_blank" rel="noopener noreferrer" className="underline text-emerald-700 dark:text-emerald-400 font-medium">
                docs/BENCHMARK.md
              </a>
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Play className="w-5 h-5" />
              Try it live — upload your own audio
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Audio Sample</label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
                {audioFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Selected: {audioFile.name}
                  </p>
                )}
                <label className="block text-sm font-medium mb-2 mt-3">Spoken language (Sahara ASR hint)</label>
                <select
                  value={benchLang}
                  onChange={(e) => setBenchLang(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Auto / not specified</option>
                  <option value="en">English</option>
                  <option value="sw">Swahili</option>
                  <option value="yo">Yoruba</option>
                  <option value="ha">Hausa</option>
                  <option value="ig">Igbo</option>
                  <option value="pcm">Pidgin</option>
                  <option value="sn">Shona</option>
                  <option value="rw">Kinyarwanda</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Reference Transcript (for WER)</label>
                <textarea
                  value={referenceText}
                  onChange={(e) => setReferenceText(e.target.value)}
                  placeholder="Paste the ground-truth transcript here to compute WER..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm h-24"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={runBenchmark} disabled={isRunning || !audioFile} className="flex items-center gap-2">
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Running Benchmark...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run Benchmark
                  </>
                )}
              </Button>
            </div>
          </Card>

          {results.length > 0 && (
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Results</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 font-medium">Model</th>
                      <th className="py-2 font-medium">Transcript</th>
                      <th className="py-2 font-medium">WER</th>
                      <th className="py-2 font-medium">Latency</th>
                      <th className="py-2 font-medium">Cost/min</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.model} className="border-b">
                        <td className="py-3 font-medium">{r.model}</td>
                        <td className="py-3 max-w-xs truncate text-xs text-gray-500" title={r.transcript}>
                          {r.transcript ? (
                            r.transcript.slice(0, 80) + (r.transcript.length > 80 ? "..." : "")
                          ) : r.error ? (
                            <span className="inline-block rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-2 py-0.5 text-xs">
                              Unavailable — API key not configured
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3">
                          {r.wer === null ? (
                            <span className="text-gray-400">—</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{(r.wer * 100).toFixed(1)}%</span>
                              {renderBar(r.wer, 1, true)}
                            </div>
                          )}
                        </td>
                        <td className="py-3">{r.error ? <span className="text-gray-400">—</span> : `${r.latency.toFixed(2)}s`}</td>
                        <td className="py-3">
                          {r.costPerMinute === null
                            ? (r.model === "Sahara v2" && !r.error ? "not published" : "—")
                            : `$${r.costPerMinute.toFixed(3)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> WER requires a reference transcript. Provide one above for accurate comparison. Results are computed from real API responses.
                </p>
              </div>
            </Card>
          )}

          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Benchmark Methodology</h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <p>Live runner models: Intron Sahara v2, OpenAI Whisper (whisper-1), OpenAI GPT-4o Audio (gpt-4o-transcribe). OpenAI rows show "Unavailable" unless an API key is configured — the official results above come from the offline Kaggle runs.</p>
              <p>Dataset: AfriSwitch (54.41 hours, 14 language pairs, 16,602 utterances)</p>
              <p>Metrics: WER, Latency, Cost per minute</p>
              <p>Conditions: In-the-wild conversational speech, multiple African accents</p>
              <p className="pt-2">
                Full 3-model offline report — Sahara v2 vs Whisper large-v3 vs wav2vec2 XLS-R on
                code-switched health audio:{" "}
                <a
                  href="https://github.com/saaga23/afrivoice-triage/blob/master/docs/BENCHMARK.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-700 dark:text-green-400 underline font-medium"
                >
                  docs/BENCHMARK.md
                </a>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
