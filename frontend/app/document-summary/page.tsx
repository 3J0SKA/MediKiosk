"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LANGUAGES, type Lang } from "../translations";
import { useRequireAuth } from "../../lib/useRequireAuth";
import { authFetch } from "../../lib/auth";

type TimelineEntry = {
  document_id: number;
  doc_type: string;
  document_date: string | null;
  uploaded_at: string;
  summarised: boolean;
  needs_review: boolean;
  result: Record<string, any> | null;
};
type CombinedSummary = {
  timeline: TimelineEntry[];
  abnormal_tests: any[];
  all_medications: any[];
  interaction_note: string | null;
  any_needs_review: boolean;
  total_documents: number;
  summarised_count: number;
};

const DOC_TYPE_LABEL: Record<string, Record<Lang, string>> = {
  prescription: { en: "Prescription", hi: "पर्चा", pa: "ਨੁਸਖਾ", ta: "மருந்துச் சீட்டு", bn: "প্রেসক্রিপশন" },
  lab_report: { en: "Lab report", hi: "लैब रिपोर्ट", pa: "ਲੈਬ ਰਿਪੋਰਟ", ta: "லேப் அறிக்கை", bn: "ল্যাব রিপোর্ট" },
  discharge_summary: { en: "Discharge summary", hi: "डिस्चार्ज सारांश", pa: "ਡਿਸਚਾਰਜ ਸਾਰ", ta: "டிஸ்சார்ஜ் சுருக்கம்", bn: "ডিসচার্জ সারসংক্ষেপ" },
  imaging: { en: "Imaging", hi: "इमेजिंग", pa: "ਇਮੇਜਿੰਗ", ta: "இமேஜிங்", bn: "ইমেজিং" },
  other: { en: "Other", hi: "अन्य", pa: "ਹੋਰ", ta: "மற்றவை", bn: "অন্যান্য" },
};

const DS: Record<Lang, {
  title: string; subtitle: string; back: string; loading: string;
  timelineHeading: string; noDocs: string; notSummarised: string; needsReview: string;
  abnormalHeading: string; noAbnormal: string; medsHeading: string; noMeds: string;
  interactionHeading: string; clearData: string; clearDataConfirmTitle: string; clearDataConfirmBody: string;
  clearYes: string; clearNo: string; date: string; confidence: string;
}> = {
  en: {
    title: "Combined document summary", subtitle: "Preview of everything extracted from your uploaded documents so far.",
    back: "← Back to documents", loading: "Loading…",
    timelineHeading: "Timeline", noDocs: "No summarised documents yet.", notSummarised: "Not yet summarised.",
    needsReview: "⚠ Needs review", abnormalHeading: "Abnormal lab values", noAbnormal: "No abnormal values found.",
    medsHeading: "All medications found", noMeds: "No medications found.",
    interactionHeading: "⚠ Interaction note", clearData: "Clear all my uploaded data",
    clearDataConfirmTitle: "Clear all documents?", clearDataConfirmBody: "This permanently deletes every uploaded document and its extracted data. This can't be undone.",
    clearYes: "Yes, clear everything", clearNo: "Cancel", date: "Date", confidence: "confidence",
  },
  hi: {
    title: "संयुक्त दस्तावेज़ सारांश", subtitle: "अब तक आपके अपलोड किए दस्तावेज़ों से निकाली गई हर जानकारी का पूर्वावलोकन।",
    back: "← दस्तावेज़ों पर वापस", loading: "लोड हो रहा है…",
    timelineHeading: "समयरेखा", noDocs: "अभी तक कोई सारांशित दस्तावेज़ नहीं।", notSummarised: "अभी सारांशित नहीं किया गया।",
    needsReview: "⚠ समीक्षा आवश्यक", abnormalHeading: "असामान्य लैब मान", noAbnormal: "कोई असामान्य मान नहीं मिला।",
    medsHeading: "सभी पाई गई दवाएं", noMeds: "कोई दवा नहीं मिली।",
    interactionHeading: "⚠ इंटरैक्शन नोट", clearData: "मेरा सभी अपलोड डेटा साफ़ करें",
    clearDataConfirmTitle: "सभी दस्तावेज़ साफ़ करें?", clearDataConfirmBody: "यह हर अपलोड किए दस्तावेज़ और उसके निकाले डेटा को हमेशा के लिए हटा देगा। इसे वापस नहीं लिया जा सकता।",
    clearYes: "हां, सब साफ़ करें", clearNo: "रद्द करें", date: "तारीख़", confidence: "विश्वास स्तर",
  },
  pa: {
    title: "ਸੰਯੁਕਤ ਦਸਤਾਵੇਜ਼ ਸਾਰ", subtitle: "ਹੁਣ ਤੱਕ ਤੁਹਾਡੇ ਅੱਪਲੋਡ ਕੀਤੇ ਦਸਤਾਵੇਜ਼ਾਂ ਤੋਂ ਕੱਢੀ ਗਈ ਹਰ ਜਾਣਕਾਰੀ ਦੀ ਝਲਕ।",
    back: "← ਦਸਤਾਵੇਜ਼ਾਂ 'ਤੇ ਵਾਪਸ", loading: "ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…",
    timelineHeading: "ਸਮਾਂ-ਰੇਖਾ", noDocs: "ਹਾਲੇ ਕੋਈ ਸਾਰਾਂਸ਼ਿਤ ਦਸਤਾਵੇਜ਼ ਨਹੀਂ।", notSummarised: "ਹਾਲੇ ਸਾਰਾਂਸ਼ਿਤ ਨਹੀਂ ਕੀਤਾ ਗਿਆ।",
    needsReview: "⚠ ਸਮੀਖਿਆ ਲੋੜੀਂਦੀ", abnormalHeading: "ਅਸਾਧਾਰਨ ਲੈਬ ਮੁੱਲ", noAbnormal: "ਕੋਈ ਅਸਾਧਾਰਨ ਮੁੱਲ ਨਹੀਂ ਮਿਲਿਆ।",
    medsHeading: "ਸਾਰੀਆਂ ਮਿਲੀਆਂ ਦਵਾਈਆਂ", noMeds: "ਕੋਈ ਦਵਾਈ ਨਹੀਂ ਮਿਲੀ।",
    interactionHeading: "⚠ ਇੰਟਰੈਕਸ਼ਨ ਨੋਟ", clearData: "ਮੇਰਾ ਸਾਰਾ ਅੱਪਲੋਡ ਡਾਟਾ ਸਾਫ਼ ਕਰੋ",
    clearDataConfirmTitle: "ਸਾਰੇ ਦਸਤਾਵੇਜ਼ ਸਾਫ਼ ਕਰੀਏ?", clearDataConfirmBody: "ਇਹ ਹਰ ਅੱਪਲੋਡ ਕੀਤੇ ਦਸਤਾਵੇਜ਼ ਅਤੇ ਉਸ ਦੇ ਡਾਟੇ ਨੂੰ ਹਮੇਸ਼ਾ ਲਈ ਹਟਾ ਦੇਵੇਗਾ।",
    clearYes: "ਹਾਂ, ਸਭ ਸਾਫ਼ ਕਰੋ", clearNo: "ਰੱਦ ਕਰੋ", date: "ਮਿਤੀ", confidence: "ਭਰੋਸਾ ਪੱਧਰ",
  },
  ta: {
    title: "ஒருங்கிணைந்த ஆவண சுருக்கம்", subtitle: "இதுவரை பதிவேற்றிய ஆவணங்களிலிருந்து பிரித்தெடுக்கப்பட்ட அனைத்தின் முன்னோட்டம்.",
    back: "← ஆவணங்களுக்குத் திரும்பு", loading: "ஏற்றுகிறது…",
    timelineHeading: "காலவரிசை", noDocs: "இன்னும் சுருக்கப்பட்ட ஆவணங்கள் இல்லை.", notSummarised: "இன்னும் சுருக்கப்படவில்லை.",
    needsReview: "⚠ மறுஆய்வு தேவை", abnormalHeading: "அசாதாரண லேப் மதிப்புகள்", noAbnormal: "அசாதாரண மதிப்புகள் இல்லை.",
    medsHeading: "கண்டறியப்பட்ட அனைத்து மருந்துகள்", noMeds: "மருந்துகள் எதுவும் இல்லை.",
    interactionHeading: "⚠ இடையீட்டு குறிப்பு", clearData: "எனது பதிவேற்றப்பட்ட தரவை அழிக்கவும்",
    clearDataConfirmTitle: "அனைத்து ஆவணங்களையும் அழிக்கவா?", clearDataConfirmBody: "இது அனைத்து ஆவணங்களையும் நிரந்தரமாக அழிக்கும்.",
    clearYes: "ஆம், அனைத்தையும் அழி", clearNo: "ரத்து செய்", date: "தேதி", confidence: "நம்பகத்தன்மை",
  },
  bn: {
    title: "সম্মিলিত নথি সারসংক্ষেপ", subtitle: "এখন পর্যন্ত আপনার আপলোড করা নথি থেকে বের করা সবকিছুর পূর্বরূপ।",
    back: "← নথিতে ফিরুন", loading: "লোড হচ্ছে…",
    timelineHeading: "সময়রেখা", noDocs: "এখনও কোনো সারসংক্ষেপিত নথি নেই।", notSummarised: "এখনও সারসংক্ষেপ করা হয়নি।",
    needsReview: "⚠ পর্যালোচনা প্রয়োজন", abnormalHeading: "অস্বাভাবিক ল্যাব মান", noAbnormal: "কোনো অস্বাভাবিক মান পাওয়া যায়নি।",
    medsHeading: "সব পাওয়া ওষুধ", noMeds: "কোনো ওষুধ পাওয়া যায়নি।",
    interactionHeading: "⚠ ইন্টারঅ্যাকশন নোট", clearData: "আমার সব আপলোড করা তথ্য মুছুন",
    clearDataConfirmTitle: "সব নথি মুছবেন?", clearDataConfirmBody: "এটি প্রতিটি আপলোড করা নথি এবং তার তথ্য স্থায়ীভাবে মুছে দেবে।",
    clearYes: "হ্যাঁ, সব মুছুন", clearNo: "বাতিল", date: "তারিখ", confidence: "নির্ভরযোগ্যতা",
  },
};

const FONT: Record<Lang, string> = { en: "var(--font-body)", hi: "var(--font-hi)", pa: "var(--font-pa)", ta: "var(--font-ta)", bn: "var(--font-bn)" };
const DISPLAY_FONT: Record<Lang, string> = { en: "var(--font-display)", hi: "var(--font-hi)", pa: "var(--font-pa)", ta: "var(--font-ta)", bn: "var(--font-bn)" };

export default function DocumentSummary() {
  const { patient, ready } = useRequireAuth();
  const [lang, setLang] = useState<Lang>("en");
  const [data, setData] = useState<CombinedSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem("medikiosk-lang") as Lang | null;
    if (savedLang) setLang(savedLang);
  }, []);

  useEffect(() => {
    if (ready && patient) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, patient]);

  async function load() {
    if (!patient) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/documents/patient/${patient.patient_id}/combined-summary`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function clearAllData() {
    if (!patient) return;
    setClearing(true);
    try {
      await authFetch(`/api/documents/patient/${patient.patient_id}/clear-all`, { method: "DELETE" });
      setShowClearConfirm(false);
      await load();
    } finally {
      setClearing(false);
    }
  }

  const t = DS[lang];
  const bodyFont = { fontFamily: FONT[lang] };
  const displayFont = { fontFamily: DISPLAY_FONT[lang] };

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#10241F] text-[#F3ECDA]">
        <p className="text-sm text-[#B9CFC4]">Loading…</p>
      </main>
    );
  }

  return (
    <main style={bodyFont} className="min-h-screen bg-[#F3ECDA] text-[#1C2420]">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/document-upload" className="text-sm text-[#2F6F63] hover:underline">
          {t.back}
        </Link>
        <h1 style={displayFont} className="mt-4 text-2xl font-medium">{t.title}</h1>
        <p className="mt-1 text-[#1C2420]/70">{t.subtitle}</p>

        {loading ? (
          <p className="mt-8 text-sm text-[#1C2420]/50">{t.loading}</p>
        ) : !data ? (
          <p className="mt-8 text-sm text-[#1C2420]/50">{t.noDocs}</p>
        ) : (
          <>
            {data.any_needs_review && (
              <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                {t.needsReview} — {data.summarised_count}/{data.total_documents}
              </div>
            )}

            {/* Abnormal values */}
            <section className="mt-8">
              <h2 style={displayFont} className="text-lg font-medium text-red-700">{t.abnormalHeading}</h2>
              {data.abnormal_tests.length === 0 ? (
                <p className="mt-2 text-sm text-[#1C2420]/50">{t.noAbnormal}</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {data.abnormal_tests.map((test, i) => (
                    <div key={i} className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm">
                      <p className="font-medium text-red-800">
                        {test.test_name}: {test.value} {test.unit || ""}
                      </p>
                      {test.reference_range && (
                        <p className="text-xs text-red-700/70">Range: {test.reference_range}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Medications */}
            <section className="mt-8">
              <h2 style={displayFont} className="text-lg font-medium">{t.medsHeading}</h2>
              {data.all_medications.length === 0 ? (
                <p className="mt-2 text-sm text-[#1C2420]/50">{t.noMeds}</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {data.all_medications.map((med, i) => (
                    <div key={i} className="rounded-xl border border-[#1C2420]/10 bg-white/60 px-4 py-3 text-sm">
                      <p className="font-medium">{med.name}</p>
                      {(med.dosage || med.frequency) && (
                        <p className="text-xs text-[#1C2420]/60">
                          {med.dosage} {med.frequency ? `· ${med.frequency}` : ""}
                        </p>
                      )}
                      {med.confidence === "low" && (
                        <p className="mt-1 text-xs text-amber-700">
                          Low {t.confidence} — verify with physician
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {data.interaction_note && (
                <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-medium">{t.interactionHeading}</p>
                  <p className="mt-1 text-xs">{data.interaction_note}</p>
                </div>
              )}
            </section>

            {/* Timeline */}
            <section className="mt-8">
              <h2 style={displayFont} className="text-lg font-medium">{t.timelineHeading}</h2>
              <div className="mt-3 space-y-3">
                {data.timeline.map((entry) => (
                  <div key={entry.document_id} className="rounded-xl border border-[#1C2420]/10 bg-white/60 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">
                        {DOC_TYPE_LABEL[entry.doc_type]?.[lang] || entry.doc_type}
                      </p>
                      <p className="text-xs text-[#1C2420]/50">
                        {t.date}: {entry.document_date || new Date(entry.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                    {!entry.summarised ? (
                      <p className="mt-2 text-xs text-[#1C2420]/40">{t.notSummarised}</p>
                    ) : (
                      <>
                        {entry.needs_review && (
                          <p className="mt-2 text-xs font-medium text-amber-700">{t.needsReview}</p>
                        )}
                        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-[family-name:var(--font-mono)] text-xs text-[#1C2420]/70">
                          {JSON.stringify(entry.result, null, 2)}
                        </pre>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <button
              onClick={() => setShowClearConfirm(true)}
              className="mt-10 rounded-full border border-red-400/40 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              {t.clearData}
            </button>
          </>
        )}
      </div>

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center">
            <h3 style={displayFont} className="text-lg font-medium">{t.clearDataConfirmTitle}</h3>
            <p className="mt-2 text-sm text-[#1C2420]/70">{t.clearDataConfirmBody}</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowClearConfirm(false)} className="flex-1 rounded-full border border-[#1C2420]/20 py-2.5 text-sm font-medium">
                {t.clearNo}
              </button>
              <button
                onClick={clearAllData}
                disabled={clearing}
                className="flex-1 rounded-full bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {clearing ? "…" : t.clearYes}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}