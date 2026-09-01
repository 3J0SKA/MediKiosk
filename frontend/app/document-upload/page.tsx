"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Link from "next/link";
import { LANGUAGES, type Lang } from "../translations";
import { useRequireAuth } from "../../lib/useRequireAuth";
import { authFetch, getToken } from "../../lib/auth";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const MAX_SIZE_BYTES = 16 * 1024 * 1024;
const ALLOWED_EXT = ["jpg", "jpeg", "png", "pdf"];

type DocType = "prescription" | "lab_report" | "discharge_summary" | "imaging" | "other";
type Document = {
  document_id: number;
  doc_type: DocType;
  file_path: string;
  document_date: string | null;
  uploaded_at: string;
};

const DU: Record<Lang, {
  title: string; subtitle: string; back: string;
  docTypeLabel: string; docTypes: Record<DocType, string>;
  dropText: string; dropHint: string; browse: string;
  errorType: string; errorSize: string; errorGeneric: string; uploading: string;
  yourDocs: string; noDocs: string; view: string; deleteBtn: string;
  confirmDeleteTitle: string; confirmDeleteBody: string; confirmYes: string; confirmNo: string;
  uploadedOn: string;
}> = {
  en: {
    title: "Upload documents", subtitle: "Add old prescriptions, lab reports, or discharge summaries.", back: "← Back",
    docTypeLabel: "What kind of document is this?",
    docTypes: { prescription: "Prescription", lab_report: "Lab report", discharge_summary: "Discharge summary", imaging: "Imaging", other: "Other" },
    dropText: "Drag a file here, or", dropHint: "JPG, PNG, or PDF · up to 16 MB", browse: "browse files",
    errorType: "Only JPG, PNG, or PDF files are allowed.", errorSize: "File is too large (max 16 MB).",
    errorGeneric: "Upload failed. Please try again.", uploading: "Uploading…",
    yourDocs: "Your uploaded documents", noDocs: "No documents uploaded yet.",
    view: "View", deleteBtn: "Delete",
    confirmDeleteTitle: "Delete this document?", confirmDeleteBody: "This can't be undone.",
    confirmYes: "Delete", confirmNo: "Cancel", uploadedOn: "Uploaded",
  },
  hi: {
    title: "दस्तावेज़ अपलोड करें", subtitle: "पुराने पर्चे, लैब रिपोर्ट, या डिस्चार्ज सारांश जोड़ें।", back: "← वापस",
    docTypeLabel: "यह किस प्रकार का दस्तावेज़ है?",
    docTypes: { prescription: "पर्चा", lab_report: "लैब रिपोर्ट", discharge_summary: "डिस्चार्ज सारांश", imaging: "इमेजिंग", other: "अन्य" },
    dropText: "फ़ाइल यहां खींचें, या", dropHint: "JPG, PNG, या PDF · अधिकतम 16 MB", browse: "फ़ाइलें ब्राउज़ करें",
    errorType: "केवल JPG, PNG, या PDF फ़ाइलें ही मान्य हैं।", errorSize: "फ़ाइल बहुत बड़ी है (अधिकतम 16 MB)।",
    errorGeneric: "अपलोड विफल रहा। कृपया फिर से प्रयास करें।", uploading: "अपलोड हो रहा है…",
    yourDocs: "आपके अपलोड किए दस्तावेज़", noDocs: "अभी तक कोई दस्तावेज़ अपलोड नहीं किया गया।",
    view: "देखें", deleteBtn: "हटाएं",
    confirmDeleteTitle: "यह दस्तावेज़ हटाएं?", confirmDeleteBody: "इसे वापस नहीं लिया जा सकता।",
    confirmYes: "हटाएं", confirmNo: "रद्द करें", uploadedOn: "अपलोड किया गया",
  },
  pa: {
    title: "ਦਸਤਾਵੇਜ਼ ਅੱਪਲੋਡ ਕਰੋ", subtitle: "ਪੁਰਾਣੇ ਨੁਸਖੇ, ਲੈਬ ਰਿਪੋਰਟਾਂ, ਜਾਂ ਡਿਸਚਾਰਜ ਸਾਰ ਜੋੜੋ।", back: "← ਵਾਪਸ",
    docTypeLabel: "ਇਹ ਕਿਸ ਕਿਸਮ ਦਾ ਦਸਤਾਵੇਜ਼ ਹੈ?",
    docTypes: { prescription: "ਨੁਸਖਾ", lab_report: "ਲੈਬ ਰਿਪੋਰਟ", discharge_summary: "ਡਿਸਚਾਰਜ ਸਾਰ", imaging: "ਇਮੇਜਿੰਗ", other: "ਹੋਰ" },
    dropText: "ਫ਼ਾਈਲ ਇੱਥੇ ਖਿੱਚੋ, ਜਾਂ", dropHint: "JPG, PNG, ਜਾਂ PDF · ਵੱਧ ਤੋਂ ਵੱਧ 16 MB", browse: "ਫ਼ਾਈਲਾਂ ਬ੍ਰਾਊਜ਼ ਕਰੋ",
    errorType: "ਸਿਰਫ਼ JPG, PNG, ਜਾਂ PDF ਫ਼ਾਈਲਾਂ ਹੀ ਮਨਜ਼ੂਰ ਹਨ।", errorSize: "ਫ਼ਾਈਲ ਬਹੁਤ ਵੱਡੀ ਹੈ (ਵੱਧ ਤੋਂ ਵੱਧ 16 MB)।",
    errorGeneric: "ਅੱਪਲੋਡ ਅਸਫਲ ਰਿਹਾ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।", uploading: "ਅੱਪਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…",
    yourDocs: "ਤੁਹਾਡੇ ਅੱਪਲੋਡ ਕੀਤੇ ਦਸਤਾਵੇਜ਼", noDocs: "ਹਾਲੇ ਕੋਈ ਦਸਤਾਵੇਜ਼ ਅੱਪਲੋਡ ਨਹੀਂ ਕੀਤਾ ਗਿਆ।",
    view: "ਦੇਖੋ", deleteBtn: "ਹਟਾਓ",
    confirmDeleteTitle: "ਇਹ ਦਸਤਾਵੇਜ਼ ਹਟਾਓ?", confirmDeleteBody: "ਇਹ ਵਾਪਸ ਨਹੀਂ ਲਿਆ ਜਾ ਸਕਦਾ।",
    confirmYes: "ਹਟਾਓ", confirmNo: "ਰੱਦ ਕਰੋ", uploadedOn: "ਅੱਪਲੋਡ ਕੀਤਾ",
  },
  ta: {
    title: "ஆவணங்களைப் பதிவேற்றவும்", subtitle: "பழைய மருந்துச் சீட்டுகள், லேப் அறிக்கைகள், அல்லது டிஸ்சார்ஜ் சுருக்கங்களைச் சேர்க்கவும்.", back: "← பின்",
    docTypeLabel: "இது எந்த வகை ஆவணம்?",
    docTypes: { prescription: "மருந்துச் சீட்டு", lab_report: "லேப் அறிக்கை", discharge_summary: "டிஸ்சார்ஜ் சுருக்கம்", imaging: "இமேஜிங்", other: "மற்றவை" },
    dropText: "கோப்பை இங்கே இழுக்கவும், அல்லது", dropHint: "JPG, PNG, அல்லது PDF · அதிகபட்சம் 16 MB", browse: "கோப்புகளை உலாவவும்",
    errorType: "JPG, PNG, அல்லது PDF கோப்புகள் மட்டுமே அனுமதிக்கப்படும்.", errorSize: "கோப்பு மிகப் பெரியது (அதிகபட்சம் 16 MB).",
    errorGeneric: "பதிவேற்றம் தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.", uploading: "பதிவேற்றுகிறது…",
    yourDocs: "உங்கள் பதிவேற்றிய ஆவணங்கள்", noDocs: "இதுவரை ஆவணங்கள் எதுவும் பதிவேற்றப்படவில்லை.",
    view: "பார்க்க", deleteBtn: "நீக்கு",
    confirmDeleteTitle: "இந்த ஆவணத்தை நீக்கவா?", confirmDeleteBody: "இதை மாற்ற முடியாது.",
    confirmYes: "நீக்கு", confirmNo: "ரத்து செய்", uploadedOn: "பதிவேற்றப்பட்டது",
  },
  bn: {
    title: "নথি আপলোড করুন", subtitle: "পুরনো প্রেসক্রিপশন, ল্যাব রিপোর্ট, বা ডিসচার্জ সারসংক্ষেপ যোগ করুন।", back: "← পিছনে",
    docTypeLabel: "এটি কোন ধরনের নথি?",
    docTypes: { prescription: "প্রেসক্রিপশন", lab_report: "ল্যাব রিপোর্ট", discharge_summary: "ডিসচার্জ সারসংক্ষেপ", imaging: "ইমেজিং", other: "অন্যান্য" },
    dropText: "ফাইল এখানে টেনে আনুন, অথবা", dropHint: "JPG, PNG, বা PDF · সর্বোচ্চ 16 MB", browse: "ফাইল ব্রাউজ করুন",
    errorType: "শুধুমাত্র JPG, PNG, বা PDF ফাইল অনুমোদিত।", errorSize: "ফাইলটি খুব বড় (সর্বোচ্চ 16 MB)।",
    errorGeneric: "আপলোড ব্যর্থ হয়েছে। আবার চেষ্টা করুন।", uploading: "আপলোড হচ্ছে…",
    yourDocs: "আপনার আপলোড করা নথি", noDocs: "এখনও কোনো নথি আপলোড করা হয়নি।",
    view: "দেখুন", deleteBtn: "মুছুন",
    confirmDeleteTitle: "এই নথিটি মুছবেন?", confirmDeleteBody: "এটি ফিরিয়ে আনা যাবে না।",
    confirmYes: "মুছুন", confirmNo: "বাতিল", uploadedOn: "আপলোড করা হয়েছে",
  },
};

const FONT: Record<Lang, string> = { en: "var(--font-body)", hi: "var(--font-hi)", pa: "var(--font-pa)", ta: "var(--font-ta)", bn: "var(--font-bn)" };
const DISPLAY_FONT: Record<Lang, string> = { en: "var(--font-display)", hi: "var(--font-hi)", pa: "var(--font-pa)", ta: "var(--font-ta)", bn: "var(--font-bn)" };

export default function DocumentUpload() {
  const { patient, ready } = useRequireAuth();
  const [lang, setLang] = useState<Lang>("en");
  const [docType, setDocType] = useState<DocType>("prescription");
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [docs, setDocs] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedLang = localStorage.getItem("medikiosk-lang") as Lang | null;
    if (savedLang) setLang(savedLang);
  }, []);

  useEffect(() => {
    if (ready && patient) loadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, patient]);

  async function loadDocs() {
    if (!patient) return;
    setLoadingDocs(true);
    try {
      const res = await authFetch(`/api/documents/patient/${patient.patient_id}`);
      if (res.ok) setDocs(await res.json());
    } catch {
      // silent — list just stays empty, upload area still works
    } finally {
      setLoadingDocs(false);
    }
  }

  function validateFile(file: File): string | null {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!["jpg", "jpeg", "png", "pdf"].includes(ext)) return t.errorType;
    if (file.size > MAX_SIZE_BYTES) return t.errorSize;
    return null;
  }

  async function uploadFile(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!patient) return;
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("patient_id", String(patient.patient_id));
      formData.append("doc_type", docType);

      const token = getToken();
      const res = await fetch(`${BACKEND_URL}/api/documents/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t.errorGeneric);
      }
      await loadDocs();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errorGeneric);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  async function viewDocument(documentId: number) {
    const token = getToken();
    const res = await fetch(`${BACKEND_URL}/api/documents/${documentId}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

  async function confirmDelete(documentId: number) {
    await authFetch(`/api/documents/${documentId}`, { method: "DELETE" });
    setPendingDelete(null);
    await loadDocs();
  }

  const t = DU[lang];
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
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/patient-home" className="text-sm text-[#2F6F63] hover:underline">
          {t.back}
        </Link>
        <h1 style={displayFont} className="mt-4 text-2xl font-medium">{t.title}</h1>
        <p className="mt-1 text-[#1C2420]/70">{t.subtitle}</p>

        {/* Doc type selector */}
        <div className="mt-6">
          <label className="block text-sm font-medium">{t.docTypeLabel}</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(t.docTypes) as DocType[]).map((key) => (
              <button
                key={key}
                onClick={() => setDocType(key)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  docType === key ? "border-[#2F6F63] bg-[#2F6F63]/10 text-[#2F6F63] font-medium" : "border-[#1C2420]/15 hover:border-[#1C2420]/30"
                }`}
              >
                {t.docTypes[key]}
              </button>
            ))}
          </div>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`mt-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition ${
            dragActive ? "border-[#E9A23F] bg-[#E9A23F]/5" : "border-[#1C2420]/20 bg-white/50"
          }`}
        >
          <span className="text-3xl">📄</span>
          <p className="mt-3 text-sm text-[#1C2420]/70">
            {t.dropText}{" "}
            <button onClick={() => fileInputRef.current?.click()} className="font-semibold text-[#2F6F63] hover:underline">
              {t.browse}
            </button>
          </p>
          <p className="mt-1 text-xs text-[#1C2420]/40">{t.dropHint}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            onChange={handleFileInput}
            className="hidden"
          />
          {uploading && <p className="mt-3 text-sm text-[#2F6F63]">{t.uploading}</p>}
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        {/* Previously uploaded documents */}
        <div className="mt-10">
          <h2 style={displayFont} className="text-lg font-medium">{t.yourDocs}</h2>
          {loadingDocs ? (
            <p className="mt-3 text-sm text-[#1C2420]/50">…</p>
          ) : docs.length === 0 ? (
            <p className="mt-3 text-sm text-[#1C2420]/50">{t.noDocs}</p>
          ) : (
            <div className="mt-3 space-y-2">
              {docs.map((doc) => (
                <div
                  key={doc.document_id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-[#1C2420]/10 bg-white/60 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.docTypes[doc.doc_type]}</p>
                    <p className="text-xs text-[#1C2420]/50">
                      {t.uploadedOn} {new Date(doc.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => viewDocument(doc.document_id)}
                      className="rounded-full border border-[#2F6F63]/40 px-3 py-1.5 text-xs font-medium text-[#2F6F63] hover:bg-[#2F6F63]/10"
                    >
                      {t.view}
                    </button>
                    <button
                      onClick={() => setPendingDelete(doc.document_id)}
                      className="rounded-full border border-red-400/40 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      {t.deleteBtn}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {pendingDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center">
            <h3 style={displayFont} className="text-lg font-medium">{t.confirmDeleteTitle}</h3>
            <p className="mt-2 text-sm text-[#1C2420]/70">{t.confirmDeleteBody}</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setPendingDelete(null)} className="flex-1 rounded-full border border-[#1C2420]/20 py-2.5 text-sm font-medium">
                {t.confirmNo}
              </button>
              <button onClick={() => confirmDelete(pendingDelete)} className="flex-1 rounded-full bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">
                {t.confirmYes}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}