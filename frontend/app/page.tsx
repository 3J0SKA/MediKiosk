"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CONVERSATION = [
  {
    speaker: "patient",
    lang: "Hindi",
    text: "Mujhe teen din se seene mein dard hai.",
    translation: "Chest pain for three days.",
  },
  {
    speaker: "extract",
    label: "Chief complaint",
    value: "Chest pain · Onset: 3 days",
    flag: undefined,
  },
  {
    speaker: "ai",
    text: "Does the pain spread to your arm or jaw?",
  },
  {
    speaker: "patient",
    lang: "Hindi",
    text: "Haan, left arm mein.",
    translation: "Yes, into the left arm.",
  },
  {
    speaker: "extract",
    label: "Radiation",
    value: "Left arm",
    flag: "Priority triage flagged",
  },
  {
    speaker: "ai",
    text: "Noted. A staff member has been alerted — please remain seated.",
  },
] as const;

const JOURNEY = [
  {
    n: "01",
    title: "Identify",
    body: "Patient scans ABHA ID or Aadhaar, picks a language, and grants audio-guided consent.",
  },
  {
    n: "02",
    title: "Converse",
    body: "AI conducts an adaptive voice + touch interview, capturing chief complaint, HPI, and full history. Red flags trigger priority triage.",
  },
  {
    n: "03",
    title: "Scan",
    body: "Patient uploads old prescriptions, lab reports, and discharge summaries. AI digitizes, structures, and timelines them.",
  },
  {
    n: "04",
    title: "Summarize & route",
    body: "A structured history is generated, linked to ABHA, and pushed to the hospital's system.",
  },
  {
    n: "05",
    title: "Consult",
    body: "The physician reviews the complete history in seconds and spends the visit on examination, not transcription.",
  },
] as const;

const FEATURES = [
  {
    title: "Speaks your language",
    body: "Voice or touch, in Hindi, English, or a regional language. Adaptive follow-up questions mirror how a physician actually probes a complaint — and an extended AYUSH mode captures Prakriti, Vikriti, and the full Dashavidha Pariksha.",
  },
  {
    title: "Reads your old prescriptions",
    body: "OCR on handwritten and printed reports, in multiple languages, automatically dated and ordered into a single timeline — with abnormal values and drug interactions flagged.",
  },
  {
    title: "Hands doctors a finished draft",
    body: "Chief complaint through review of systems, in standard clinical format. The physician edits or confirms — it's never an autonomous diagnosis.",
  },
  {
    title: "Secure by design",
    body: "ABHA-linked via FHIR, consent-first with audio explanation for low-literacy patients, and session data cleared immediately after submission.",
  },
] as const;

const STATS = [
  { value: "2–5 min", label: "average OPD consultation time" },
  { value: "4,000–10,000", label: "patients registered per day at tertiary hospitals" },
  { value: "70–80%", label: "of diagnoses a thorough history alone can reveal" },
] as const;

export default function Home() {
  const [step, setStep] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    if (mq.matches) {
      setStep(CONVERSATION.length - 1);
      return;
    }
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % (CONVERSATION.length + 2));
    }, 1600);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-[#F3ECDA] text-[#1C2420]">
      {/* NAV */}
      <header className="sticky top-0 z-30 border-b border-[#1C2420]/10 bg-[#F3ECDA]/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
            Medi<span className="text-[#E9A23F]">Kiosk</span>
          </span>
          <div className="hidden items-center gap-8 font-[family-name:var(--font-mono)] text-sm md:flex">
            <a href="#how-it-works" className="hover:text-[#2F6F63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9A23F] rounded-sm">
              How it works
            </a>
            <a href="#platform" className="hover:text-[#2F6F63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9A23F] rounded-sm">
              Platform
            </a>
            <Link
              href="/physician-login"
              className="hover:text-[#2F6F63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9A23F] rounded-sm"
            >
              For physicians
            </Link>
          </div>
          <Link
            href="/patient-intake"
            className="rounded-full bg-[#E9A23F] px-5 py-2 text-sm font-semibold text-[#10241F] transition hover:bg-[#C97F28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#10241F]"
          >
            Start intake
          </Link>
        </nav>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-[#10241F] text-[#F3ECDA]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-[#E9A23F]/10 blur-3xl"
        />
        <div className="mx-auto grid max-w-6xl gap-16 px-6 py-20 md:grid-cols-2 md:py-28">
          <div>
            <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.2em] text-[#B9CFC4]">
              AI clinical intake, before the consultation begins
            </p>
            <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl leading-[1.1] font-medium md:text-5xl">
              Two minutes with the doctor deserves{" "}
              <em className="italic text-[#E9A23F]">ten minutes</em> of
              listening first.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[#D8E3DC]">
              MediKiosk listens to patients in their own language, reads
              their old prescriptions, and hands physicians a complete,
              structured history before they walk into the room.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/patient-intake"
                className="rounded-full bg-[#E9A23F] px-6 py-3 text-sm font-semibold text-[#10241F] transition hover:bg-[#C97F28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#10241F] focus-visible:ring-[#E9A23F]"
              >
                Start patient intake
              </Link>
              <Link
                href="/physician-login"
                className="rounded-full border border-[#B9CFC4]/40 px-6 py-3 text-sm font-semibold text-[#F3ECDA] transition hover:border-[#B9CFC4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#10241F] focus-visible:ring-[#E9A23F]"
              >
                Physician login
              </Link>
            </div>
            <p className="mt-8 font-[family-name:var(--font-mono)] text-xs text-[#B9CFC4]">
              Built for ABDM · Hindi, English &amp; regional languages · DPDP Act 2023 compliant
            </p>
          </div>

          {/* SIGNATURE: live intake demo panel */}
          <div className="rounded-2xl border border-[#B9CFC4]/15 bg-[#17332B] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between font-[family-name:var(--font-mono)] text-xs text-[#B9CFC4]">
              <span>LIVE INTAKE — DEMO</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#E9A23F] motion-safe:animate-pulse" />
                listening
              </span>
            </div>
            <div className="space-y-3 min-h-[19rem]">
              {CONVERSATION.slice(0, Math.min(step + 1, CONVERSATION.length)).map(
                (turn, i) => {
                  if (turn.speaker === "extract") {
                    return (
                      <div
                        key={i}
                        className="ml-6 flex flex-wrap items-center gap-2 font-[family-name:var(--font-mono)] text-xs motion-safe:animate-[fadeIn_0.4s_ease]"
                      >
                        <span className="rounded-full bg-[#E9A23F]/15 px-3 py-1 text-[#E9A23F]">
                          {turn.label}: {turn.value}
                        </span>
                        {turn.flag && (
                          <span className="rounded-full bg-red-500/15 px-3 py-1 text-red-300">
                            ⚠ {turn.flag}
                          </span>
                        )}
                      </div>
                    );
                  }
                  const isPatient = turn.speaker === "patient";
                  return (
                    <div
                      key={i}
                      className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-snug motion-safe:animate-[fadeIn_0.4s_ease] ${
                        isPatient
                          ? "bg-[#F3ECDA] text-[#1C2420]"
                          : "ml-auto bg-[#2F6F63] text-[#F3ECDA]"
                      }`}
                    >
                      {isPatient && (
                        <p className="mb-1 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide opacity-60">
                          Patient · {turn.lang}
                        </p>
                      )}
                      <p>{turn.text}</p>
                      {isPatient && (
                        <p className="mt-1 text-xs italic opacity-60">
                          {turn.translation}
                        </p>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM / STATS */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.2em] text-[#2F6F63]">
          Why this matters
        </p>
        <h2 className="mt-3 max-w-2xl font-[family-name:var(--font-display)] text-3xl font-medium leading-tight">
          India's OPDs don't lack skilled doctors. They lack time to listen.
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {STATS.map((s) => (
            <div key={s.label} className="border-t border-[#1C2420]/15 pt-4">
              <p className="font-[family-name:var(--font-display)] text-3xl font-medium text-[#2F6F63]">
                {s.value}
              </p>
              <p className="mt-2 text-sm text-[#1C2420]/70">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="bg-[#EFE8D8] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.2em] text-[#2F6F63]">
            The patient journey
          </p>
          <h2 className="mt-3 max-w-xl font-[family-name:var(--font-display)] text-3xl font-medium leading-tight">
            Five steps, completed before the patient sees a doctor.
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-5">
            {JOURNEY.map((step) => (
              <div key={step.n}>
                <p className="font-[family-name:var(--font-mono)] text-sm text-[#E9A23F]">
                  {step.n}
                </p>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-lg font-medium">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#1C2420]/70">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="platform" className="mx-auto max-w-6xl px-6 py-20">
        <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.2em] text-[#2F6F63]">
          The platform
        </p>
        <h2 className="mt-3 max-w-xl font-[family-name:var(--font-display)] text-3xl font-medium leading-tight">
          Everything a physician needs, already on screen.
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-[#1C2420]/10 bg-[#F3ECDA] p-6"
            >
              <h3 className="font-[family-name:var(--font-display)] text-lg font-medium">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#1C2420]/70">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* PHYSICIAN STRIP */}
      <section className="bg-[#10241F] py-16 text-[#F3ECDA]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium">
              Already a physician here?
            </h2>
            <p className="mt-2 max-w-md text-sm text-[#D8E3DC]">
              Review structured histories the moment your patient enters the
              room — edit and confirm in seconds.
            </p>
          </div>
          <Link
            href="/physician-login"
            className="whitespace-nowrap rounded-full border border-[#B9CFC4]/40 px-6 py-3 text-sm font-semibold transition hover:border-[#B9CFC4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#10241F] focus-visible:ring-[#E9A23F]"
          >
            Physician login →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#1C2420]/10 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 text-sm text-[#1C2420]/60 md:flex-row md:items-center">
          <span className="font-[family-name:var(--font-display)] text-base font-medium text-[#1C2420]">
            Medi<span className="text-[#E9A23F]">Kiosk</span>
          </span>
          <p>Smart India Hackathon 2026 · AI Clinical History Platform</p>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}