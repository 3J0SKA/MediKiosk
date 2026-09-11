"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { get, set } from 'idb-keyval';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type Lang = "en" | "hi" | "pa" | "ta" | "bn";

const LOCALE_MAP: Record<Lang, string> = {
  en: "en-IN",
  hi: "hi-IN",
  pa: "pa-IN",
  ta: "ta-IN",
  bn: "bn-IN",
};

interface Message {
  id: string;
  sender: "ai" | "user";
  text: string;
  audio?: string;
  isAudioLoading?: boolean;
}

export default function PatientIntakeChat() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "ai",
      text: "Hello! I'm your AI Intake Assistant. Please tell me what symptoms or health concerns brought you in today.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  // AUTH CHECK & PERSISTED CHAT RESTORATION
  useEffect(() => {
    const loggedInUser = localStorage.getItem("patient_id");

    if (!loggedInUser || loggedInUser === "undefined" || loggedInUser === "null") {
      console.warn("Unauthorized! Kicking back to login...");
      window.location.replace("/");
      return;
    }

    setPatientId(loggedInUser);

    const savedHistory = localStorage.getItem("chat_history");
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      } catch (e) {
        console.error("Failed to parse saved chat history:", e);
      }
    }

    setMounted(true);

    const saved = localStorage.getItem("medikiosk-lang") as Lang | null;
    if (saved && LOCALE_MAP[saved]) {
      setLang(saved);
    }

    const syncLang = () => {
      const current = localStorage.getItem("medikiosk-lang") as Lang | null;
      if (current && LOCALE_MAP[current]) setLang(current);
    };
    window.addEventListener("storage", syncLang);
    window.addEventListener("languageChange", syncLang);
    return () => {
      window.removeEventListener("storage", syncLang);
      window.removeEventListener("languageChange", syncLang);
    };
  }, []);

useEffect(() => {
    if (typeof window === "undefined" || !mounted) return;
    
    if (messages.length > 0) {
      // IndexedDB is async, so we just let it run in the background
      set("chat_history", messages).catch((err) => 
        console.error("IndexedDB save failed:", err)
      );
    }
  }, [messages, mounted]);

  useEffect(() => {
    if (typeof window === "undefined" || !mounted) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = LOCALE_MAP[lang];

    recognition.onresult = (event: any) => {
      let currentTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setInput(currentTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [lang, mounted]);

  function playAudio(base64Audio: string | undefined) {
    if (!base64Audio) return;
    const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
    audio.play().catch((err) => console.error("Audio playback failed:", err));
  }

  function toggleListening() {
    if (!speechSupported || !recognitionRef.current) {
      alert("Voice typing is not supported on this browser. Please use Google Chrome or MS Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang = LOCALE_MAP[lang];
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  }

  function clearChatHistory() {
    if (confirm("Are you sure you want to start a new intake session? This clears the current screen.")) {
      const initial: Message[] = [
        {
          id: Date.now().toString(),
          sender: "ai",
          text: "Hello! I'm your AI Intake Assistant. Please tell me what symptoms or health concerns brought you in today.",
        },
      ];
      setMessages(initial);
      localStorage.setItem("chat_history", JSON.stringify(initial));
    }
  }

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const currentInput = input;
    const userMsg: Message = { id: Date.now().toString(), sender: "user", text: currentInput };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // 1. FAST REQUEST: Get Text Only
      // NOTE: Your Flask backend MUST NOT generate audio during this request.
      const res = await fetch("http://127.0.0.1:5000/api/chat/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Passing a flag in case you want to handle the split conditionally in Python
        body: JSON.stringify({ message: currentInput, prompt: currentInput, lang, textOnly: true }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const aiMsgId = (Date.now() + 1).toString();
      
      const aiMsg: Message = {
        id: aiMsgId,
        sender: "ai",
        text: data.reply || "Thank you for sharing. Could you tell me more?",
        isAudioLoading: true, // Show the loading spinner for the speaker icon
      };

      // IMMEDIATELY render the text response and hide the main "thinking" state
      setMessages((prev) => [...prev, aiMsg]);
      setLoading(false);

      // 2. BACKGROUND REQUEST: Fetch TTS Audio separately
      fetch("http://127.0.0.1:5000/api/chat/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiMsg.text, lang }),
      })
        .then((res) => res.json())
        .then((audioData) => {
          // Update the specific message to remove the spinner and attach the audio
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMsgId
                ? { ...msg, audio: audioData.audio, isAudioLoading: false }
                : msg
            )
          );
          // Auto-play once it arrives
          if (audioData.audio) playAudio(audioData.audio);
        })
        .catch((err) => {
          console.error("TTS generation failed:", err);
          // Remove the loading spinner if audio fails so it doesn't spin forever
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMsgId ? { ...msg, isAudioLoading: false } : msg
            )
          );
        });

    } catch (err) {
      console.error("Intake chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: "Sorry, I had trouble processing that. Could you try rephrasing?",
        },
      ]);
      setLoading(false);
    }
  }

  async function handleFinishIntake() {
    if (messages.length <= 1) {
      alert("Please provide some symptoms before finishing.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:5000/api/intake/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patientId,
          chatHistory: messages,
          lang: lang,
        }),
      });

      const data = await res.json().catch(() => ({}));

      const summaryContent =
        data.summary ||
        data.report ||
        `PATIENT SYMPTOM SUMMARY\n-----------------------\n` +
          messages
            .filter((m) => m.sender === "user")
            .map((m, idx) => `${idx + 1}. ${m.text}`)
            .join("\n");

      localStorage.setItem("ai_summary", summaryContent);
      localStorage.setItem("medikiosk_summary", summaryContent);
      localStorage.setItem("patient_summary", summaryContent);

      alert("Intake saved successfully! Summary generated.");
      router.push("/patient-summary");
    } catch (err) {
      console.error("Error saving intake to DB:", err);
      
      const fallbackSummary =
        `PATIENT SYMPTOM SUMMARY (OFFLINE)\n---------------------------------\n` +
        messages
          .filter((m) => m.sender === "user")
          .map((m, idx) => `${idx + 1}. ${m.text}`)
          .join("\n");

      localStorage.setItem("ai_summary", fallbackSummary);
      alert("Intake saved locally! Redirecting to summary.");
      router.push("/patient-summary");
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#F3ECDA] text-[#1C2420]">
        <div className="text-sm font-medium text-[#1C2420]/60 animate-pulse">
          Securing session & loading chat history...
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#F3ECDA] text-[#1C2420]">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between border-b border-[#1C2420]/10 bg-white/40 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Link
            href="/patient-home"
            className="text-sm font-medium text-[#2F6F63] transition hover:text-[#10241F]"
          >
            ← Back to Home
          </Link>
          <span className="text-[#1C2420]/20">|</span>
          <h1 className="text-lg font-semibold text-[#10241F]">
            AI Patient Intake & Symptom Collection
          </h1>
        </div>

        {/* Language Indicator, Reset & Save Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={clearChatHistory}
            className="rounded-lg border border-[#1C2420]/20 bg-white px-3 py-1.5 text-xs font-semibold text-[#1C2420] transition hover:bg-red-50 hover:text-red-600"
          >
            New Session
          </button>

          <div className="flex items-center gap-2 text-xs font-medium text-[#1C2420]/70">
            <span>Language:</span>
            <select
              value={lang}
              onChange={(e) => {
                const l = e.target.value as Lang;
                setLang(l);
                localStorage.setItem("medikiosk-lang", l);
                window.dispatchEvent(new Event("languageChange"));
              }}
              className="rounded-lg border border-[#1C2420]/20 bg-white px-2 py-1 text-xs font-semibold text-[#10241F] focus:outline-none"
            >
              <option value="en">English (India)</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="bn">বাংলা (Bengali)</option>
            </select>
          </div>

          <button
            onClick={handleFinishIntake}
            disabled={loading || messages.length <= 1}
            className="rounded-lg bg-[#10241F] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1C2420] disabled:opacity-50"
          >
            Finish & Save Summary
          </button>
        </div>
      </header>

      {/* Messages Stream */}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 overflow-y-auto p-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`relative max-w-[80%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm ${
                msg.sender === "user"
                  ? "bg-[#10241F] text-[#F3ECDA] rounded-tr-none"
                  : "border border-[#1C2420]/10 bg-white text-[#1C2420] rounded-tl-none pr-14"
              }`}
            >
              {msg.text}

              {/* Dynamic Audio Indicator / Play Button */}
              {msg.sender === "ai" && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                  {msg.isAudioLoading ? (
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2F6F63]/5"
                      title="Generating Audio..."
                    >
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#2F6F63] border-t-transparent" />
                    </span>
                  ) : msg.audio ? (
                    <button
                      onClick={() => playAudio(msg.audio)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2F6F63]/10 text-sm text-[#2F6F63] transition hover:bg-[#2F6F63]/20"
                      title="Replay Audio"
                    >
                      🔊
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-none border border-[#1C2420]/10 bg-white/80 px-5 py-3.5 text-sm text-[#1C2420]/60">
              Assistant is thinking…
            </div>
          </div>
        )}
      </div>

      {/* Listening Status Banner */}
      {isListening && (
        <div className="bg-[#E9A23F]/20 py-2 text-center text-xs font-medium text-[#10241F] animate-pulse">
          🎙️ Listening in {LOCALE_MAP[lang]}... Speak now into your microphone.
        </div>
      )}

      {/* Input Bar */}
      <div className="border-t border-[#1C2420]/10 bg-white/60 p-4 backdrop-blur-sm">
        <form onSubmit={handleSend} className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            type="button"
            onClick={toggleListening}
            title={isListening ? "Stop listening" : "Start speaking"}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all ${
              isListening
                ? "bg-red-600 text-white ring-4 ring-red-300 animate-pulse"
                : "bg-[#2F6F63]/10 text-[#2F6F63] hover:bg-[#2F6F63]/20"
            }`}
          >
            <span className="text-lg">{isListening ? "🛑" : "🎙️"}</span>
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isListening
                ? "Listening... spoken text will appear here"
                : "Type or tap the mic to speak your symptoms..."
            }
            className="flex-1 rounded-full border border-[#1C2420]/20 bg-white px-5 py-3 text-sm text-[#1C2420] placeholder-[#1C2420]/40 focus:border-[#2F6F63] focus:outline-none focus:ring-2 focus:ring-[#2F6F63]/20"
          />

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-full bg-[#2F6F63] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#23554B] disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}