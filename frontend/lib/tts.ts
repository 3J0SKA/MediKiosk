import type { Lang } from "../app/translations";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const BROWSER_TTS_LANG: Record<Lang, string> = {
  en: "en-IN", hi: "hi-IN", pa: "pa-IN", ta: "ta-IN", bn: "bn-IN",
};

let currentAudio: HTMLAudioElement | null = null;

function speakWithBrowser(text: string, lang: Lang) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = BROWSER_TTS_LANG[lang];
  const voices = window.speechSynthesis.getVoices();
  const chosen = voices.find((v) => v.lang === BROWSER_TTS_LANG[lang]) || voices.find((v) => v.lang.toLowerCase().startsWith(lang));
  if (chosen) utter.voice = chosen;
  window.speechSynthesis.speak(utter);
}

export async function speak(text: string, lang: Lang): Promise<void> {
  stopSpeaking();
  try {
    const res = await fetch(`${BACKEND_URL}/api/tts/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang }),
    });
    if (!res.ok) throw new Error("TTS request failed");
    const data = await res.json();
    if (data.fallback || !data.audio) {
      speakWithBrowser(text, lang);
      return;
    }
    const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
    currentAudio = audio;
    await audio.play();
  } catch {
    speakWithBrowser(text, lang);
  }
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}