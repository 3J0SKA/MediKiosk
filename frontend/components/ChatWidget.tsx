"use client";

import { useState, useRef, useEffect } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

type Msg = { role: "user" | "assistant"; text: string };

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const sessionId = useRef<string>(crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, session_id: sessionId.current }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "chat failed");
      setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 flex h-[28rem] w-80 flex-col overflow-hidden rounded-2xl border border-[#1C2420]/10 bg-[#F3ECDA] shadow-2xl">
          <div className="flex items-center justify-between bg-[#10241F] px-4 py-3 text-[#F3ECDA]">
            <span className="text-sm font-semibold">MediKiosk Assistant</span>
            <button onClick={() => setOpen(false)} aria-label="Close chat">✕</button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
            {messages.length === 0 && (
              <p className="text-[#1C2420]/50">
                Ask me general questions about using MediKiosk. For anything about your
                specific symptoms or results, please speak with the physician.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-xl px-3 py-2 leading-snug ${
                  m.role === "user"
                    ? "ml-auto bg-[#2F6F63] text-[#F3ECDA]"
                    : "bg-white text-[#1C2420]"
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && <div className="text-xs text-[#1C2420]/50">Thinking…</div>}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2 border-t border-[#1C2420]/10 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type a message…"
              className="flex-1 rounded-full border border-[#1C2420]/15 px-3 py-2 text-sm outline-none focus:border-[#2F6F63]"
            />
            <button
              onClick={send}
              disabled={loading}
              className="rounded-full bg-[#E9A23F] px-4 py-2 text-sm font-semibold text-[#10241F] disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle chat"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E9A23F] text-2xl shadow-xl transition hover:bg-[#C97F28]"
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}