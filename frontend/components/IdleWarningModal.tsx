"use client";

import type { Lang } from "../app/translations";

const COPY: Record<Lang, { title: string; body: string; stay: string; logout: string }> = {
  en: { title: "Still there?", body: "You'll be logged out in {s}s for your privacy.", stay: "I'm still here", logout: "Log out now" },
  hi: { title: "क्या आप अभी भी हैं?", body: "आपकी गोपनीयता के लिए {s} सेकंड में लॉग आउट हो जाएगा।", stay: "मैं यहीं हूं", logout: "अभी लॉग आउट करें" },
  pa: { title: "ਕੀ ਤੁਸੀਂ ਹਾਲੇ ਵੀ ਹੋ?", body: "ਤੁਹਾਡੀ ਗੋਪਨੀਯਤਾ ਲਈ {s} ਸਕਿੰਟਾਂ ਵਿੱਚ ਲਾਗਆਉਟ ਹੋ ਜਾਵੇਗਾ।", stay: "ਮੈਂ ਇੱਥੇ ਹਾਂ", logout: "ਹੁਣੇ ਲਾਗਆਉਟ ਕਰੋ" },
  ta: { title: "இன்னும் இருக்கிறீர்களா?", body: "உங்கள் தனியுரிமைக்காக {s} வினாடிகளில் வெளியேற்றப்படுவீர்கள்.", stay: "நான் இருக்கிறேன்", logout: "இப்போது வெளியேறு" },
  bn: { title: "আপনি কি এখনও আছেন?", body: "আপনার গোপনীয়তার জন্য {s} সেকেন্ডে লগআউট হবে।", stay: "আমি এখানে আছি", logout: "এখনই লগআউট" },
};

export default function IdleWarningModal({
  lang, secondsLeft, onStay, onLogout,
}: { lang: Lang; secondsLeft: number; onStay: () => void; onLogout: () => void }) {
  const t = COPY[lang];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl text-amber-700">⏱</div>
        <h3 className="mt-4 text-lg font-medium text-[#1C2420]">{t.title}</h3>
        <p className="mt-2 text-sm text-[#1C2420]/70">{t.body.replace("{s}", String(secondsLeft))}</p>
        <div className="mt-5 flex gap-3">
          <button onClick={onLogout} className="flex-1 rounded-full border border-[#1C2420]/20 py-2.5 text-sm font-medium">
            {t.logout}
          </button>
          <button onClick={onStay} className="flex-1 rounded-full bg-[#E9A23F] py-2.5 text-sm font-semibold text-[#10241F] hover:bg-[#C97F28]">
            {t.stay}
          </button>
        </div>
      </div>
    </div>
  );
}