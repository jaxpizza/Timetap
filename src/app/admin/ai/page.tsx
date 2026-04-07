"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Send, Bot, User, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getWorkforceInsights, getOvertimeReport, getLaborCostSummary, getAttendanceReport } from "./actions";

interface Message { role: "user" | "ai"; content: string }

const suggestions = [
  "Give me a workforce summary",
  "What's our overtime this week?",
  "Show labor costs",
  "Any attendance issues?",
];

function matchQuery(text: string): () => Promise<string> {
  const t = text.toLowerCase();
  if (t.includes("overtime") || t.includes("ot ")) return getOvertimeReport;
  if (t.includes("cost") || t.includes("labor") || t.includes("spend")) return getLaborCostSummary;
  if (t.includes("late") || t.includes("attendance") || t.includes("off-site") || t.includes("offsite")) return getAttendanceReport;
  return getWorkforceInsights;
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const query = text.trim();
    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setInput("");
    setLoading(true);

    const action = matchQuery(query);
    const result = await action();

    setMessages((prev) => [...prev, { role: "ai", content: result }]);
    setLoading(false);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
      className="flex h-[calc(100vh-8rem)] flex-col md:h-[calc(100vh-5rem)]">
      <div className="shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-indigo-400" />
          <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--tt-text-primary)" }}>AI Assistant</h1>
        </div>
        <p className="mt-1 text-sm" style={{ color: "var(--tt-text-tertiary)" }}>Ask questions about your workforce — powered by your real data</p>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto rounded-xl p-4" style={{ backgroundColor: "var(--tt-card-bg)", border: "1px solid var(--tt-border-subtle)" }}>
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="flex size-16 items-center justify-center rounded-2xl" style={{ backgroundColor: "var(--tt-elevated-bg)" }}>
              <Sparkles size={28} className="text-indigo-400" />
            </div>
            <p className="mt-4 text-sm font-medium" style={{ color: "var(--tt-text-primary)" }}>How can I help?</p>
            <p className="mt-1 text-xs" style={{ color: "var(--tt-text-muted)" }}>Ask about your workforce or try a suggestion</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full px-3 py-1.5 text-xs transition-colors"
                  style={{ backgroundColor: "var(--tt-elevated-bg)", color: "var(--tt-text-tertiary)", border: "1px solid var(--tt-border-subtle)" }}>{s}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "ai" && (
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/20">
                    <Bot size={14} className="text-indigo-400" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "rounded-br-sm" : "rounded-bl-sm"}`}
                  style={m.role === "user" ? { backgroundColor: "#4F46E5", color: "#fff" } : { backgroundColor: "var(--tt-elevated-bg)", color: "var(--tt-text-primary)", border: "1px solid var(--tt-border-subtle)" }}>
                  <FormattedContent content={m.content} />
                </div>
                {m.role === "user" && (
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600">
                    <User size={12} className="text-white" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/20">
                  <Bot size={14} className="text-indigo-400" />
                </div>
                <div className="flex items-center gap-2 rounded-xl rounded-bl-sm px-4 py-3 text-sm"
                  style={{ backgroundColor: "var(--tt-elevated-bg)", border: "1px solid var(--tt-border-subtle)" }}>
                  <Loader2 size={14} className="animate-spin text-indigo-400" />
                  <span style={{ color: "var(--tt-text-muted)" }}>Analyzing data...</span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(input)} placeholder="Ask about your workforce..." className="flex-1" disabled={loading} />
        <button onClick={() => send(input)} disabled={loading}
          className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-indigo-500 text-white transition-colors hover:bg-indigo-600 disabled:opacity-50">
          <Send size={16} />
        </button>
      </div>
    </motion.div>
  );
}

function FormattedContent({ content }: { content: string }) {
  // Simple markdown-like formatting: **bold**, • bullets, line breaks
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        // Bold
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className={line.startsWith("•") ? "pl-2" : ""}>
            {parts.map((part, j) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>;
              }
              return <span key={j}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}
