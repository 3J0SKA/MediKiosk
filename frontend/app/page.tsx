"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LANGUAGES, translations, type Lang } from "./translations";

const CONVERSATION = [
  { speaker: "patient", lang: "Hindi", text: "Mujhe teen din se seene mein dard hai.", translation: "Chest pain for three days." },
  { speaker: "extract", label: "Chief complaint", value: "Chest pain · Onset: 3 days", flag: undefined },
  { speaker: "ai", text: "Does the pain spread to your arm or jaw?" },
  { speaker: "patient", lang: "Hindi", text: "Haan, left arm mein.", translation: "Yes, into the left arm." },
  { speaker: "extract", label: "Radiation", value: "Left arm", flag: "Priority triage flagged" },
  { speaker: "ai", text: "Noted. A staff member has been alerted — please remain seated." },
] as const;

const FONT: Record<Lang, string> = {
  en: "var(--font-body)",
  hi: "var(--font-hi)",
  pa: "var(--font-pa)",
  ta: "var(--font-ta)",
  bn: "var(--font-bn)",
};
const DISPLAY_FONT: Record<Lang, string> = {
  en: "var(--font-display)",
  hi: "var(--font-hi)",
  pa: "var(--font-pa)",
  ta: "var(--font-ta)",
  bn: "var(--font-bn)",
};

export default function Home() {
  const [lang, setLang] = useState<Lang | null>(null);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("medikiosk-lang") as Lang | null;
    if (saved && LANGUAGES.some((l) => l.code === saved)) setLang(saved);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setStep(CONVERSATION.length - 1);
      return;
    }
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % (CONVERSATION.length + 2));
    }, 1600);
    return () => clearInterval(interval);
  }, []);

  function chooseLang(code: Lang) {
    localStorage.setItem("medikiosk-lang", code);
    setLang(code);
    setLangMenuOpen(false);
  }

  // ---- LANGUAGE GATE (first visit) ----
  if (lang === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#10241F] px-6 text-[#F3ECDA]">
        <div className="w-full max-w-lg text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl font-medium">
            Medi<span className="text-[#E9A23F]">Kiosk</span>
          </p>
          <h1 className="mt-8 text-2xl font-medium">Choose your language</h1>
          <p className="mt-2 text-sm text-[#B9CFC4]">
            आप किस भाषा में बात करना चाहेंगे? · ਤੁਸੀਂ ਕਿਹੜੀ ਭਾਸ਼ਾ ਚਾਹੋਗੇ? · நீங்கள் எந்த மொழி விரும்புகிறீர்கள்?
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => chooseLang(l.code)}
                className="rounded-2xl border border-[#B9CFC4]/25 bg-[#17332B] px-4 py-6 text-lg font-medium transition hover:border-[#E9A23F] hover:bg-[#1D3E34] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9A23F]"
              >
                {l.native}
                <span className="mt-1 block text-xs font-normal text-[#B9CFC4]">{l.label}</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  const t = translations[lang];
  const bodyFont = { fontFamily: FONT[lang] };
  const displayFont = { fontFamily: DISPLAY_FONT[lang] };

  return (
    <main style={bodyFont} className="min-h-screen bg-[#F3ECDA] text-[#1C2420]">
      {/* NAV */}
      <header className="sticky top-0 z-30 border-b border-[#1C2420]/10 bg-[#F3ECDA]/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span style={displayFont} className="text-xl font-semibold tracking-tight">
            Medi<span className="text-[#E9A23F]">Kiosk</span>
          </span>
          <div className="hidden items-center gap-8 text-sm md:flex">
            <a href="#how-it-works" className="hover:text-[#2F6F63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9A23F] rounded-sm">
              {t.nav.howItWorks}
            </a>
            <a href="#platform" className="hover:text-[#2F6F63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9A23F] rounded-sm">
              {t.nav.platform}
            </a>
            <Link href="/physician-login" className="hover:text-[#2F6F63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9A23F] rounded-sm">
              {t.nav.forPhysicians}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen((o) => !o)}
                aria-label="Change language"
                className="flex items-center gap-1.5 rounded-full border border-[#1C2420]/15 px-3 py-2 text-sm hover:border-[#2F6F63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9A23F]"
              >
                🌐 {LANGUAGES.find((l) => l.code === lang)?.native}
              </button>
              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-40 overflow-hidden rounded-xl border border-[#1C2420]/10 bg-[#F3ECDA] shadow-xl">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => chooseLang(l.code)}
                      className={`block w-full px-4 py-2.5 text-left text-sm hover:bg-[#EFE8D8] ${l.code === lang ? "font-semibold text-[#2F6F63]" : ""}`}
                    >
                      {l.native}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Link
              href="/patient-login"
              className="rounded-full bg-[#E9A23F] px-5 py-2 text-sm font-semibold text-[#10241F] transition hover:bg-[#C97F28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#10241F]"
            >
              {t.nav.startIntake}
            </Link>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-[#10241F] text-[#F3ECDA]">
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-[#E9A23F]/10 blur-3xl" />
        <div className="mx-auto grid max-w-6xl gap-16 px-6 py-20 md:grid-cols-2 md:py-28">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#B9CFC4]">{t.hero.eyebrow}</p>
            <h1 style={displayFont} className="mt-5 text-4xl leading-[1.15] font-medium md:text-5xl">
              {t.hero.headline1} <em className="italic text-[#E9A23F]">{t.hero.headlineEm}</em> {t.hero.headline2}
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[#D8E3DC]">{t.hero.sub}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/patient-login"
                className="rounded-full bg-[#E9A23F] px-6 py-3 text-sm font-semibold text-[#10241F] transition hover:bg-[#C97F28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#10241F] focus-visible:ring-[#E9A23F]"
              >
                {t.hero.ctaStart}
              </Link>
              <Link
                href="/physician-login"
                className="rounded-full border border-[#B9CFC4]/40 px-6 py-3 text-sm font-semibold text-[#F3ECDA] transition hover:border-[#B9CFC4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#10241F] focus-visible:ring-[#E9A23F]"
              >
                {t.hero.ctaPhysician}
              </Link>
            </div>
            <p className="mt-8 text-xs text-[#B9CFC4]">{t.hero.trust}</p>
          </div>

          <div className="rounded-2xl border border-[#B9CFC4]/15 bg-[#17332B] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between text-xs text-[#B9CFC4]">
              <span>LIVE INTAKE — DEMO</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#E9A23F] motion-safe:animate-pulse" />
                listening
              </span>
            </div>
            <div className="min-h-[19rem] space-y-3">
              {CONVERSATION.slice(0, Math.min(step + 1, CONVERSATION.length)).map((turn, i) => {
                if (turn.speaker === "extract") {
                  return (
                    <div key={i} className="ml-6 flex flex-wrap items-center gap-2 text-xs motion-safe:animate-[fadeIn_0.4s_ease]">
                      <span className="rounded-full bg-[#E9A23F]/15 px-3 py-1 text-[#E9A23F]">
                        {turn.label}: {turn.value}
                      </span>
                      {turn.flag && <span className="rounded-full bg-red-500/15 px-3 py-1 text-red-300">⚠ {turn.flag}</span>}
                    </div>
                  );
                }
                const isPatient = turn.speaker === "patient";
                return (
                  <div
                    key={i}
                    className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-snug motion-safe:animate-[fadeIn_0.4s_ease] ${
                      isPatient ? "bg-[#F3ECDA] text-[#1C2420]" : "ml-auto bg-[#2F6F63] text-[#F3ECDA]"
                    }`}
                  >
                    {isPatient && <p className="mb-1 text-[10px] uppercase tracking-wide opacity-60">Patient · {turn.lang}</p>}
                    <p>{turn.text}</p>
                    {isPatient && <p className="mt-1 text-xs italic opacity-60">{turn.translation}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="text-xs uppercase tracking-[0.2em] text-[#2F6F63]">{t.stats.kicker}</p>
        <h2 style={displayFont} className="mt-3 max-w-2xl text-3xl font-medium leading-tight">{t.stats.heading}</h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {t.stats.items.map((s) => (
            <div key={s.label} className="border-t border-[#1C2420]/15 pt-4">
              <p style={displayFont} className="text-3xl font-medium text-[#2F6F63]">{s.value}</p>
              <p className="mt-2 text-sm text-[#1C2420]/70">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* JOURNEY */}
      <section id="how-it-works" className="bg-[#EFE8D8] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs uppercase tracking-[0.2em] text-[#2F6F63]">{t.journey.kicker}</p>
          <h2 style={displayFont} className="mt-3 max-w-xl text-3xl font-medium leading-tight">{t.journey.heading}</h2>
          <div className="mt-12 grid gap-10 md:grid-cols-5">
            {t.journey.steps.map((step) => (
              <div key={step.n}>
                <p className="text-sm text-[#E9A23F]">{step.n}</p>
                <h3 style={displayFont} className="mt-2 text-lg font-medium">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#1C2420]/70">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="platform" className="mx-auto max-w-6xl px-6 py-20">
        <p className="text-xs uppercase tracking-[0.2em] text-[#2F6F63]">{t.features.kicker}</p>
        <h2 style={displayFont} className="mt-3 max-w-xl text-3xl font-medium leading-tight">{t.features.heading}</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {t.features.items.map((f) => (
            <div key={f.title} className="rounded-2xl border border-[#1C2420]/10 bg-[#F3ECDA] p-6">
              <h3 style={displayFont} className="text-lg font-medium">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#1C2420]/70">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PHYSICIAN STRIP */}
      <section className="bg-[#10241F] py-16 text-[#F3ECDA]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 md:flex-row md:items-center">
          <div>
            <h2 style={displayFont} className="text-2xl font-medium">{t.physician.heading}</h2>
            <p className="mt-2 max-w-md text-sm text-[#D8E3DC]">{t.physician.sub}</p>
          </div>
          <Link
            href="/physician-login"
            className="whitespace-nowrap rounded-full border border-[#B9CFC4]/40 px-6 py-3 text-sm font-semibold transition hover:border-[#B9CFC4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#10241F] focus-visible:ring-[#E9A23F]"
          >
            {t.physician.cta}
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#1C2420]/10 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 text-sm text-[#1C2420]/60 md:flex-row md:items-center">
          <span style={displayFont} className="text-base font-medium text-[#1C2420]">
            Medi<span className="text-[#E9A23F]">Kiosk</span>
          </span>
          <p>{t.footer.tagline}</p>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}