"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { LANGUAGES, type Lang } from "../translations";
import { saveSession } from "../../lib/auth";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

type Step = "identify" | "otp" | "register" | "success";

const AUTH: Record<Lang, {
  title: string; subtitle: string;
  idLabel: string; idPlaceholder: string; sendOtp: string;
  otpTitle: string; otpHint: string; verify: string; back: string;
  newPatientTitle: string; fullName: string; dob: string; gender: string;
  male: string; female: string; other: string; mobile: string; register: string;
  successTitle: string; welcomeBack: string; welcome: string; continueBtn: string;
  errorId: string; errorOtp: string; errorRequired: string;
}> = {
  en: {
    title: "Patient login", subtitle: "Verify your identity to begin your visit.",
    idLabel: "ABHA ID, Aadhaar number, or mobile number", idPlaceholder: "e.g. 14-1234-5678-9012",
    sendOtp: "Send OTP", otpTitle: "Enter the OTP sent to your mobile",
    otpHint: "Demo mode — use OTP 123456", verify: "Verify", back: "Back",
    newPatientTitle: "Let's get you registered", fullName: "Full name", dob: "Date of birth",
    gender: "Gender", male: "Male", female: "Female", other: "Other", mobile: "Mobile number",
    register: "Register & continue", successTitle: "You're verified",
    welcomeBack: "Welcome back", welcome: "Welcome", continueBtn: "Continue to intake",
    errorId: "Please enter a valid ID", errorOtp: "Enter the 6-digit OTP", errorRequired: "This field is required",
  },
  hi: {
    title: "मरीज़ लॉगिन", subtitle: "अपनी यात्रा शुरू करने के लिए पहचान सत्यापित करें।",
    idLabel: "ABHA ID, आधार नंबर, या मोबाइल नंबर", idPlaceholder: "जैसे 14-1234-5678-9012",
    sendOtp: "OTP भेजें", otpTitle: "अपने मोबाइल पर भेजा गया OTP डालें",
    otpHint: "डेमो मोड — OTP 123456 उपयोग करें", verify: "सत्यापित करें", back: "वापस",
    newPatientTitle: "आइए आपका पंजीकरण करें", fullName: "पूरा नाम", dob: "जन्म तिथि",
    gender: "लिंग", male: "पुरुष", female: "महिला", other: "अन्य", mobile: "मोबाइल नंबर",
    register: "पंजीकरण करें और जारी रखें", successTitle: "आप सत्यापित हैं",
    welcomeBack: "वापसी पर स्वागत है", welcome: "स्वागत है", continueBtn: "जानकारी जारी रखें",
    errorId: "कृपया एक मान्य ID डालें", errorOtp: "6 अंकों का OTP डालें", errorRequired: "यह फ़ील्ड आवश्यक है",
  },
  pa: {
    title: "ਮਰੀਜ਼ ਲਾਗਇਨ", subtitle: "ਆਪਣੀ ਫੇਰੀ ਸ਼ੁਰੂ ਕਰਨ ਲਈ ਪਛਾਣ ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ।",
    idLabel: "ABHA ID, ਆਧਾਰ ਨੰਬਰ, ਜਾਂ ਮੋਬਾਈਲ ਨੰਬਰ", idPlaceholder: "ਜਿਵੇਂ 14-1234-5678-9012",
    sendOtp: "OTP ਭੇਜੋ", otpTitle: "ਆਪਣੇ ਮੋਬਾਈਲ 'ਤੇ ਭੇਜਿਆ OTP ਦਰਜ ਕਰੋ",
    otpHint: "ਡੈਮੋ ਮੋਡ — OTP 123456 ਵਰਤੋ", verify: "ਪੁਸ਼ਟੀ ਕਰੋ", back: "ਵਾਪਸ",
    newPatientTitle: "ਆਓ ਤੁਹਾਨੂੰ ਰਜਿਸਟਰ ਕਰੀਏ", fullName: "ਪੂਰਾ ਨਾਮ", dob: "ਜਨਮ ਮਿਤੀ",
    gender: "ਲਿੰਗ", male: "ਮਰਦ", female: "ਔਰਤ", other: "ਹੋਰ", mobile: "ਮੋਬਾਈਲ ਨੰਬਰ",
    register: "ਰਜਿਸਟਰ ਕਰੋ ਅਤੇ ਜਾਰੀ ਰੱਖੋ", successTitle: "ਤੁਸੀਂ ਪੁਸ਼ਟੀ ਹੋ ਗਏ ਹੋ",
    welcomeBack: "ਵਾਪਸੀ 'ਤੇ ਸੁਆਗਤ ਹੈ", welcome: "ਸੁਆਗਤ ਹੈ", continueBtn: "ਜਾਣਕਾਰੀ ਜਾਰੀ ਰੱਖੋ",
    errorId: "ਕਿਰਪਾ ਕਰਕੇ ਇੱਕ ਵੈਧ ID ਦਰਜ ਕਰੋ", errorOtp: "6 ਅੰਕਾਂ ਦਾ OTP ਦਰਜ ਕਰੋ", errorRequired: "ਇਹ ਖੇਤਰ ਲਾਜ਼ਮੀ ਹੈ",
  },
  ta: {
    title: "நோயாளி உள்நுழைவு", subtitle: "உங்கள் வருகையைத் தொடங்க அடையாளத்தை சரிபார்க்கவும்.",
    idLabel: "ABHA ID, ஆதார் எண், அல்லது மொபைல் எண்", idPlaceholder: "எ.கா. 14-1234-5678-9012",
    sendOtp: "OTP அனுப்பவும்", otpTitle: "உங்கள் மொபைலுக்கு அனுப்பப்பட்ட OTP-ஐ உள்ளிடவும்",
    otpHint: "டெமோ முறை — OTP 123456 பயன்படுத்தவும்", verify: "சரிபார்க்கவும்", back: "பின்",
    newPatientTitle: "உங்களை பதிவு செய்வோம்", fullName: "முழு பெயர்", dob: "பிறந்த தேதி",
    gender: "பாலினம்", male: "ஆண்", female: "பெண்", other: "மற்றவை", mobile: "மொபைல் எண்",
    register: "பதிவு செய்து தொடரவும்", successTitle: "நீங்கள் சரிபார்க்கப்பட்டீர்கள்",
    welcomeBack: "மீண்டும் வருக", welcome: "வருக", continueBtn: "விவரங்களைத் தொடரவும்",
    errorId: "சரியான ID ஒன்றை உள்ளிடவும்", errorOtp: "6 இலக்க OTP-ஐ உள்ளிடவும்", errorRequired: "இந்த புலம் அவசியம்",
  },
  bn: {
    title: "রোগী লগইন", subtitle: "আপনার ভিজিট শুরু করতে পরিচয় যাচাই করুন।",
    idLabel: "ABHA ID, আধার নম্বর, বা মোবাইল নম্বর", idPlaceholder: "যেমন 14-1234-5678-9012",
    sendOtp: "OTP পাঠান", otpTitle: "আপনার মোবাইলে পাঠানো OTP লিখুন",
    otpHint: "ডেমো মোড — OTP 123456 ব্যবহার করুন", verify: "যাচাই করুন", back: "পিছনে",
    newPatientTitle: "চলুন আপনাকে নিবন্ধন করি", fullName: "পুরো নাম", dob: "জন্ম তারিখ",
    gender: "লিঙ্গ", male: "পুরুষ", female: "মহিলা", other: "অন্যান্য", mobile: "মোবাইল নম্বর",
    register: "নিবন্ধন করুন ও চালিয়ে যান", successTitle: "আপনি যাচাইকৃত",
    welcomeBack: "ফিরে আসার জন্য স্বাগতম", welcome: "স্বাগতম", continueBtn: "তথ্য চালিয়ে যান",
    errorId: "একটি বৈধ ID লিখুন", errorOtp: "6 সংখ্যার OTP লিখুন", errorRequired: "এই ঘরটি আবশ্যক",
  },
};

const FONT: Record<Lang, string> = {
  en: "var(--font-body)", hi: "var(--font-hi)", pa: "var(--font-pa)", ta: "var(--font-ta)", bn: "var(--font-bn)",
};
const DISPLAY_FONT: Record<Lang, string> = {
  en: "var(--font-display)", hi: "var(--font-hi)", pa: "var(--font-pa)", ta: "var(--font-ta)", bn: "var(--font-bn)",
};

export default function PatientLogin() {
  const [lang, setLang] = useState<Lang>("en");
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [step, setStep] = useState<Step>("identify");
  const [idValue, setIdValue] = useState("");
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [mobile, setMobile] = useState("");
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [patientName, setPatientName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("medikiosk-lang") as Lang | null;
    if (saved && LANGUAGES.some((l) => l.code === saved)) setLang(saved);
  }, []);

  function changeLang(code: Lang) {
    localStorage.setItem("medikiosk-lang", code);
    setLang(code);
    setLangMenuOpen(false);
  }

  const t = AUTH[lang];
  const bodyFont = { fontFamily: FONT[lang] };
  const displayFont = { fontFamily: DISPLAY_FONT[lang] };

  async function handleIdentify(e: FormEvent) {
    e.preventDefault();
    setError("");
    const digits = idValue.replace(/\D/g, "");
    if (digits.length < 6) {
      setError(t.errorId);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaar_id: idValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      setIsNewPatient(!data.exists);
      setStep("otp");
    } catch {
      setError(t.errorId);
    } finally {
      setLoading(false);
    }
  }

  async function handleOtp(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (otp.length !== 6) {
      setError(t.errorOtp);
      return;
    }
    if (isNewPatient) {
      // Full OTP + registration is verified together on submit of the register step
      setStep("register");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaar_id: idValue, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      saveSession(data.token, data.patient);
      setPatientName(data.patient.full_name);
      setStep("success");
    } catch {
      setError(t.errorOtp);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!fullName.trim() || !dob || !gender || mobile.replace(/\D/g, "").length < 10) {
      setError(t.errorRequired);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aadhaar_id: idValue,
          otp,
          full_name: fullName,
          dob,
          gender: gender === "male" ? "M" : gender === "female" ? "F" : "O",
          phone: mobile,
          preferred_lang: lang,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      saveSession(data.token, data.patient);
      setPatientName(data.patient.full_name);
      setStep("success");
    } catch {
      setError(t.errorOtp);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={bodyFont} className="flex min-h-screen items-center justify-center bg-[#10241F] px-6 py-12 text-[#F3ECDA]">
      {/* language switcher */}
      <div className="absolute right-6 top-6">
        <div className="relative">
          <button
            onClick={() => setLangMenuOpen((o) => !o)}
            aria-label="Change language"
            className="flex items-center gap-1.5 rounded-full border border-[#B9CFC4]/30 px-3 py-2 text-sm hover:border-[#B9CFC4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9A23F]"
          >
            🌐 {LANGUAGES.find((l) => l.code === lang)?.native}
          </button>
          {langMenuOpen && (
            <div className="absolute right-0 mt-2 w-40 overflow-hidden rounded-xl border border-[#B9CFC4]/20 bg-[#17332B] shadow-xl">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => changeLang(l.code)}
                  className={`block w-full px-4 py-2.5 text-left text-sm hover:bg-[#1D3E34] ${l.code === lang ? "font-semibold text-[#E9A23F]" : ""}`}
                >
                  {l.native}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-md">
        <Link href="/" style={displayFont} className="mb-8 block text-center text-xl font-semibold">
          Medi<span className="text-[#E9A23F]">Kiosk</span>
        </Link>

        <div className="rounded-2xl border border-[#B9CFC4]/15 bg-[#17332B] p-8 shadow-2xl">
          {step === "identify" && (
            <form onSubmit={handleIdentify} className="motion-safe:animate-[fadeIn_0.3s_ease]">
              <h1 style={displayFont} className="text-2xl font-medium">{t.title}</h1>
              <p className="mt-1 text-sm text-[#B9CFC4]">{t.subtitle}</p>
              <label className="mt-6 block text-sm font-medium">{t.idLabel}</label>
              <input
                autoFocus
                value={idValue}
                onChange={(e) => setIdValue(e.target.value)}
                placeholder={t.idPlaceholder}
                className="mt-2 w-full rounded-xl border border-[#B9CFC4]/25 bg-[#10241F] px-4 py-3 text-base text-[#F3ECDA] placeholder:text-[#B9CFC4]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9A23F]"
              />
              {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full rounded-full bg-[#E9A23F] py-3 text-sm font-semibold text-[#10241F] transition hover:bg-[#C97F28] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#17332B] focus-visible:ring-[#E9A23F]"
              >
                {loading ? "…" : t.sendOtp}
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleOtp} className="motion-safe:animate-[fadeIn_0.3s_ease]">
              <button type="button" onClick={() => setStep("identify")} className="mb-4 text-sm text-[#B9CFC4] hover:text-[#F3ECDA]">
                ← {t.back}
              </button>
              <h1 style={displayFont} className="text-2xl font-medium">{t.otpTitle}</h1>
              <p className="mt-2 rounded-lg bg-[#E9A23F]/10 px-3 py-2 text-xs text-[#E9A23F]">{t.otpHint}</p>
              <input
                autoFocus
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                className="mt-4 w-full rounded-xl border border-[#B9CFC4]/25 bg-[#10241F] px-4 py-3 text-center text-2xl tracking-[0.5em] text-[#F3ECDA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9A23F]"
              />
              {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full rounded-full bg-[#E9A23F] py-3 text-sm font-semibold text-[#10241F] transition hover:bg-[#C97F28] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#17332B] focus-visible:ring-[#E9A23F]"
              >
                {loading ? "…" : t.verify}
              </button>
            </form>
          )}

          {step === "register" && (
            <form onSubmit={handleRegister} className="motion-safe:animate-[fadeIn_0.3s_ease]">
              <button type="button" onClick={() => setStep("otp")} className="mb-4 text-sm text-[#B9CFC4] hover:text-[#F3ECDA]">
                ← {t.back}
              </button>
              <h1 style={displayFont} className="text-2xl font-medium">{t.newPatientTitle}</h1>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium">{t.fullName}</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#B9CFC4]/25 bg-[#10241F] px-4 py-3 text-[#F3ECDA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9A23F]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">{t.dob}</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#B9CFC4]/25 bg-[#10241F] px-4 py-3 text-[#F3ECDA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9A23F]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">{t.gender}</label>
                  <div className="mt-2 flex gap-2">
                    {[["male", t.male], ["female", t.female], ["other", t.other]].map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setGender(val)}
                        className={`flex-1 rounded-xl border px-3 py-2.5 text-sm transition ${
                          gender === val
                            ? "border-[#E9A23F] bg-[#E9A23F]/15 text-[#E9A23F]"
                            : "border-[#B9CFC4]/25 hover:border-[#B9CFC4]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium">{t.mobile}</label>
                  <input
                    inputMode="numeric"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                    maxLength={10}
                    className="mt-2 w-full rounded-xl border border-[#B9CFC4]/25 bg-[#10241F] px-4 py-3 text-[#F3ECDA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9A23F]"
                  />
                </div>
              </div>
              {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full rounded-full bg-[#E9A23F] py-3 text-sm font-semibold text-[#10241F] transition hover:bg-[#C97F28] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#17332B] focus-visible:ring-[#E9A23F]"
              >
                {loading ? "…" : t.register}
              </button>
            </form>
          )}

          {step === "success" && (
            <div className="motion-safe:animate-[fadeIn_0.3s_ease] text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E9A23F]/15 text-2xl text-[#E9A23F]">✓</div>
              <h1 style={displayFont} className="mt-4 text-2xl font-medium">{t.successTitle}</h1>
              <p className="mt-2 text-[#D8E3DC]">
                {isNewPatient ? t.welcome : t.welcomeBack}, {patientName}
              </p>
              <Link
                href="/patient-home"
                className="mt-6 inline-block w-full rounded-full bg-[#E9A23F] py-3 text-sm font-semibold text-[#10241F] transition hover:bg-[#C97F28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#17332B] focus-visible:ring-[#E9A23F]"
              >
                {t.continueBtn}
              </Link>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}