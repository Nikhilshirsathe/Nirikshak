"use client";
import React, { useState, useRef, useEffect } from "react";
import { Brain, Send, Loader2, User, Bot, AlertCircle } from "lucide-react";
import { Transaction } from "@/utils/types";
import { chatWithAI } from "@/services/api";

interface ExplainableAIViewProps {
  selectedTransaction: Transaction | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const DEFAULT_SUGGESTIONS = [
  "How many accounts were flagged in this dataset?",
  "What is the average risk score?",
  "Which features are most important for detecting mule accounts?",
  "Explain what SHAP values mean in this context.",
  "What are the main risk categories found?",
  "How does the model determine if an account is a mule?",
];

export default function ExplainableAIView({ selectedTransaction }: ExplainableAIViewProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI AML analyst. I can answer questions about your uploaded dataset — risk scores, flagged accounts, model features, and more. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (question: string) => {
    if (!question.trim() || loading) return;
    const trimmed = question.trim();
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setLoading(true);
    try {
      const { answer } = await chatWithAI(trimmed);
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to get response. Make sure a dataset is uploaded.";
      setError(msg);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ ${msg}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-2xl font-bold text-slate-800">AI Analyst Chat</h2>
        <p className="text-sm text-slate-500 mt-1">
          Ask questions about your dataset, flagged accounts, risk scores, and model features.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Chat area */}
        <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[500px] min-h-[400px]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 bg-[#0052FF] text-white rounded-xl flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#0052FF] text-white rounded-tr-md"
                      : "bg-slate-50 border border-slate-200 text-slate-700 rounded-tl-md"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-[#0052FF] text-white rounded-xl flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-md p-4 text-sm text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  Analyzing...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 p-4 bg-slate-50">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="flex gap-3"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your data..."
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="bg-[#0052FF] hover:bg-blue-700 disabled:opacity-40 text-white px-5 py-2.5 rounded-xl transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Suggestions sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              Suggested Questions
            </h3>
            <div className="space-y-2">
              {DEFAULT_SUGGESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  disabled={loading}
                  className="w-full text-left p-3 rounded-xl border border-slate-100 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-xs text-slate-600 font-medium disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {selectedTransaction && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Selected Transaction
              </h3>
              <div className="space-y-1 text-xs text-slate-600">
                <p>
                  <span className="font-semibold text-slate-800">ID:</span>{" "}
                  {selectedTransaction.id}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Account:</span>{" "}
                  {selectedTransaction.accountSource}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Risk:</span>{" "}
                  {selectedTransaction.riskScore.toFixed(1)}%
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Category:</span>{" "}
                  {selectedTransaction.category}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}