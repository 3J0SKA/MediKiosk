"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Link from "next/link";
import { LANGUAGES, type Lang } from "../translations";
import { useRequireAuth } from "../../lib/useRequireAuth";
import { authFetch, getToken } from "../../lib/auth";
import { speak, stopSpeaking } from "../../lib/tts";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const MAX_SIZE_BYTES = 16 * 1024 * 1024;
const TOUR_DISMISSED_KEY = "medikiosk-upload-tour-dismissed";

type DocType = "prescription" | "lab_report" | "discharge_summary" | "imaging" | "other";
type Document = {
  document_id: number;
  doc_type: DocType;
  file_path: string;
  document_date: string | null;
  uploaded_at: string;
};
type SummaryEntry = {
  document_id: number;
  doc_type: DocType;
  cached?: boolean;
  result?: Record<string, any>;
  needs_review?: boolean;
  error?: string;
};

type TourTarget = "intro" | "docType" | "dropzone" | "docsList" | "summariseAll";
const TOUR_TARGETS: TourTarget[] = ["intro", "docType", "dropzone", "docsList", "summariseAll"];

const DU: Record<Lang, {
  title: string; subtitle: string; back: string;
  docTypeLabel: string; docTypes: Record<DocType, string>;
  dropText: string; dropHint: string; browse: string;
  errorType: string; errorSize: string; errorGeneric: string; uploading: string;
  yourDocs: string; noDocs: string; view: string; deleteBtn: string;
  confirmDeleteTitle: string; confirmDeleteBody: string; confirmYes: string; confirmNo: string;
  uploadedOn: string; summariseAll: string; summarising: string; rerunAll: string; needsReview: string;
  summaryError: string; cachedNote: string; hideAll: string; noResultYet: string; viewCombined: string;
  audioTourBtn: string; tourPromptTitle: string; tourPromptBody: string; tourYes: string; tourNo: string;
  tourPrev: string; tourNext: string; tourEnd: string; tourSteps: string[];
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
    summariseAll: "Summarise all documents", summarising: "Reading documents…", rerunAll: "Re-run all (uses new tokens)",
    needsReview: "⚠ Needs review", summaryError: "Couldn't read this document.",
    cachedNote: "Saved result — no new tokens used.", hideAll: "Hide results", noResultYet: "Not summarised yet.",
    viewCombined: "View combined summary →",
    audioTourBtn: "🔊 Audio tour",
    tourPromptTitle: "Would you like an audio guide?", tourPromptBody: "We can walk you through this page with voice narration and highlights.",
    tourYes: "Yes, guide me", tourNo: "No, thanks", tourPrev: "◀ Back", tourNext: "Next ▶", tourEnd: "End tour",
    tourSteps: [
      "This is where you upload your old medical documents.",
      "First, choose what kind of document you're uploading — a prescription, lab report, or something else.",
      "Then drag a file here, or tap to browse and select a photo or PDF from your device.",
      "Every document you've uploaded appears here, along with the date it was added.",
      "Once you've uploaded everything, tap this button to have the documents read and summarised.",
    ],
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
    summariseAll: "सभी दस्तावेज़ों का सारांश निकालें", summarising: "दस्तावेज़ पढ़े जा रहे हैं…", rerunAll: "सभी दोबारा करें (नए टोकन उपयोग होंगे)",
    needsReview: "⚠ समीक्षा आवश्यक", summaryError: "यह दस्तावेज़ नहीं पढ़ा जा सका।",
    cachedNote: "सहेजा गया परिणाम — कोई नया टोकन उपयोग नहीं हुआ।", hideAll: "परिणाम छुपाएं", noResultYet: "अभी सारांशित नहीं किया गया।",
    viewCombined: "संयुक्त सारांश देखें →",
    audioTourBtn: "🔊 ऑडियो टूर",
    tourPromptTitle: "क्या आप ऑडियो गाइड चाहेंगे?", tourPromptBody: "हम आवाज़ और हाइलाइट के साथ इस पेज को समझा सकते हैं।",
    tourYes: "हां, गाइड करें", tourNo: "नहीं, धन्यवाद", tourPrev: "◀ पीछे", tourNext: "आगे ▶", tourEnd: "टूर समाप्त करें",
    tourSteps: [
      "यहां आप अपने पुराने चिकित्सा दस्तावेज़ अपलोड करते हैं।",
      "पहले चुनें कि आप किस प्रकार का दस्तावेज़ अपलोड कर रहे हैं — पर्चा, लैब रिपोर्ट, या कुछ और।",
      "फिर फ़ाइल यहां खींचें, या अपने डिवाइस से फोटो या PDF चुनने के लिए टैप करें।",
      "आपके अपलोड किए हर दस्तावेज़ यहां, अपलोड की तारीख़ के साथ दिखते हैं।",
      "सब कुछ अपलोड करने के बाद, दस्तावेज़ों को पढ़वाने और सारांशित करने के लिए यह बटन दबाएं।",
    ],
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
    summariseAll: "ਸਾਰੇ ਦਸਤਾਵੇਜ਼ਾਂ ਦਾ ਸਾਰ ਕੱਢੋ", summarising: "ਦਸਤਾਵੇਜ਼ ਪੜ੍ਹੇ ਜਾ ਰਹੇ ਹਨ…", rerunAll: "ਸਾਰੇ ਦੁਬਾਰਾ ਕਰੋ (ਨਵੇਂ ਟੋਕਨ ਵਰਤੇ ਜਾਣਗੇ)",
    needsReview: "⚠ ਸਮੀਖਿਆ ਲੋੜੀਂਦੀ", summaryError: "ਇਹ ਦਸਤਾਵੇਜ਼ ਪੜ੍ਹਿਆ ਨਹੀਂ ਜਾ ਸਕਿਆ।",
    cachedNote: "ਸੰਭਾਲਿਆ ਨਤੀਜਾ — ਕੋਈ ਨਵਾਂ ਟੋਕਨ ਨਹੀਂ ਵਰਤਿਆ ਗਿਆ।", hideAll: "ਨਤੀਜੇ ਲੁਕਾਓ", noResultYet: "ਹਾਲੇ ਸਾਰਾਂਸ਼ਿਤ ਨਹੀਂ ਕੀਤਾ ਗਿਆ।",
    viewCombined: "ਸੰਯੁਕਤ ਸਾਰ ਦੇਖੋ →",
    audioTourBtn: "🔊 ਆਡੀਓ ਟੂਰ",
    tourPromptTitle: "ਕੀ ਤੁਸੀਂ ਆਡੀਓ ਗਾਈਡ ਚਾਹੋਗੇ?", tourPromptBody: "ਅਸੀਂ ਆਵਾਜ਼ ਅਤੇ ਹਾਈਲਾਈਟ ਨਾਲ ਇਹ ਪੇਜ ਸਮਝਾ ਸਕਦੇ ਹਾਂ।",
    tourYes: "ਹਾਂ, ਗਾਈਡ ਕਰੋ", tourNo: "ਨਹੀਂ, ਧੰਨਵਾਦ", tourPrev: "◀ ਪਿੱਛੇ", tourNext: "ਅੱਗੇ ▶", tourEnd: "ਟੂਰ ਖਤਮ ਕਰੋ",
    tourSteps: [
      "ਇੱਥੇ ਤੁਸੀਂ ਆਪਣੇ ਪੁਰਾਣੇ ਮੈਡੀਕਲ ਦਸਤਾਵੇਜ਼ ਅੱਪਲੋਡ ਕਰਦੇ ਹੋ।",
      "ਪਹਿਲਾਂ ਚੁਣੋ ਕਿ ਤੁਸੀਂ ਕਿਸ ਕਿਸਮ ਦਾ ਦਸਤਾਵੇਜ਼ ਅੱਪਲੋਡ ਕਰ ਰਹੇ ਹੋ — ਨੁਸਖਾ, ਲੈਬ ਰਿਪੋਰਟ, ਜਾਂ ਕੁਝ ਹੋਰ।",
      "ਫਿਰ ਫ਼ਾਈਲ ਇੱਥੇ ਖਿੱਚੋ, ਜਾਂ ਆਪਣੇ ਡਿਵਾਈਸ ਤੋਂ ਫੋਟੋ ਜਾਂ PDF ਚੁਣਨ ਲਈ ਟੈਪ ਕਰੋ।",
      "ਤੁਹਾਡੇ ਅੱਪਲੋਡ ਕੀਤੇ ਹਰ ਦਸਤਾਵੇਜ਼ ਇੱਥੇ, ਅੱਪਲੋਡ ਦੀ ਮਿਤੀ ਨਾਲ ਦਿਖਦੇ ਹਨ।",
      "ਸਭ ਕੁਝ ਅੱਪਲੋਡ ਕਰਨ ਤੋਂ ਬਾਅਦ, ਦਸਤਾਵੇਜ਼ਾਂ ਨੂੰ ਪੜ੍ਹਵਾਉਣ ਅਤੇ ਸਾਰਾਂਸ਼ਿਤ ਕਰਨ ਲਈ ਇਹ ਬਟਨ ਦਬਾਓ।",
    ],
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
    summariseAll: "அனைத்து ஆவணங்களையும் சுருக்கவும்", summarising: "ஆவணங்கள் படிக்கப்படுகின்றன…", rerunAll: "அனைத்தையும் மீண்டும் இயக்கு",
    needsReview: "⚠ மறுஆய்வு தேவை", summaryError: "இந்த ஆவணத்தைப் படிக்க முடியவில்லை.",
    cachedNote: "சேமிக்கப்பட்ட முடிவு — புதிய டோக்கன்கள் இல்லை.", hideAll: "முடிவுகளை மறை", noResultYet: "இன்னும் சுருக்கப்படவில்லை.",
    viewCombined: "ஒருங்கிணைந்த சுருக்கத்தைக் காண்க →",
    audioTourBtn: "🔊 ஆடியோ சுற்றுலா",
    tourPromptTitle: "நீங்கள் ஆடியோ வழிகாட்டி விரும்புகிறீர்களா?", tourPromptBody: "குரல் விளக்கம் மற்றும் சிறப்பம்சத்துடன் இந்தப் பக்கத்தை நாங்கள் விளக்கலாம்.",
    tourYes: "ஆம், வழிகாட்டவும்", tourNo: "வேண்டாம், நன்றி", tourPrev: "◀ பின்", tourNext: "அடுத்து ▶", tourEnd: "சுற்றுலா முடிக்கவும்",
    tourSteps: [
      "இங்கே நீங்கள் உங்கள் பழைய மருத்துவ ஆவணங்களைப் பதிவேற்றுகிறீர்கள்.",
      "முதலில் நீங்கள் பதிவேற்றும் ஆவணத்தின் வகையைத் தேர்ந்தெடுக்கவும் — மருந்துச் சீட்டு, லேப் அறிக்கை, அல்லது வேறு ஏதேனும்.",
      "பின்னர் கோப்பை இங்கே இழுக்கவும், அல்லது உங்கள் சாதனத்திலிருந்து புகைப்படம் அல்லது PDF-ஐத் தேர்ந்தெடுக்க தட்டவும்.",
      "நீங்கள் பதிவேற்றிய ஒவ்வொரு ஆவணமும் பதிவேற்றிய தேதியுடன் இங்கே தோன்றும்.",
      "எல்லாவற்றையும் பதிவேற்றிய பிறகு, ஆவணங்களைப் படிக்கவும் சுருக்கவும் இந்தப் பொத்தானை அழுத்தவும்.",
    ],
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
    summariseAll: "সব নথির সারসংক্ষেপ করুন", summarising: "নথিগুলো পড়া হচ্ছে…", rerunAll: "সব আবার চালান",
    needsReview: "⚠ পর্যালোচনা প্রয়োজন", summaryError: "এই নথিটি পড়া যায়নি।",
    cachedNote: "সংরক্ষিত ফলাফল — নতুন টোকেন ব্যবহৃত হয়নি।", hideAll: "ফলাফল লুকান", noResultYet: "এখনও সারসংক্ষেপ করা হয়নি।",
    viewCombined: "সম্মিলিত সারসংক্ষেপ দেখুন →",
    audioTourBtn: "🔊 অডিও ট্যুর",
    tourPromptTitle: "আপনি কি অডিও গাইড চান?", tourPromptBody: "আমরা কণ্ঠস্বর ও হাইলাইট দিয়ে এই পাতাটি বুঝিয়ে দিতে পারি।",
    tourYes: "হ্যাঁ, গাইড করুন", tourNo: "না, ধন্যবাদ", tourPrev: "◀ পিছনে", tourNext: "পরবর্তী ▶", tourEnd: "ট্যুর শেষ করুন",
    tourSteps: [
      "এখানে আপনি আপনার পুরনো মেডিকেল নথি আপলোড করেন।",
      "প্রথমে বেছে নিন আপনি কোন ধরনের নথি আপলোড করছেন — প্রেসক্রিপশন, ল্যাব রিপোর্ট, বা অন্য কিছু।",
      "তারপর ফাইল এখানে টেনে আনুন, বা আপনার ডিভাইস থেকে ছবি বা PDF বেছে নিতে ট্যাপ করুন।",
      "আপনার আপলোড করা প্রতিটি নথি এখানে, আপলোডের তারিখসহ দেখা যায়।",
      "সব আপলোড করার পর, নথিগুলো পড়াতে এবং সারসংক্ষেপ করতে এই বোতাম চাপুন।",
    ],
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

  const [summaries, setSummaries] = useState<Record<number, SummaryEntry>>({});
  const [summarisingAll, setSummarisingAll] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [showResults, setShowResults] = useState(false);

  const [tourPromptOpen, setTourPromptOpen] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [spotlight, setSpotlight] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const docTypeRef = useRef<HTMLDivElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const docsListRef = useRef<HTMLDivElement>(null);
  const summariseAllRef = useRef<HTMLButtonElement>(null);

  function getTargetEl(step: number): HTMLElement | null {
    switch (TOUR_TARGETS[step]) {
      case "docType": return docTypeRef.current;
      case "dropzone": return dropzoneRef.current;
      case "docsList": return docsListRef.current;
      case "summariseAll": return summariseAllRef.current;
      default: return null;
    }
  }

  useEffect(() => {
    const savedLang = localStorage.getItem("medikiosk-lang") as Lang | null;
    if (savedLang) setLang(savedLang);
    const dismissed = localStorage.getItem(TOUR_DISMISSED_KEY);
    if (!dismissed) setTourPromptOpen(true);
  }, []);

  useEffect(() => () => stopSpeaking(), []);

  useEffect(() => {
    if (ready && patient) loadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, patient]);

  const t = DU[lang];

  useEffect(() => {
    if (!tourActive) return;
    const el = getTargetEl(tourStep);
    let cancelled = false;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = setTimeout(() => {
      if (cancelled) return;
      if (el) {
        const r = el.getBoundingClientRect();
        setSpotlight({ top: r.top - 10, left: r.left - 10, width: r.width + 20, height: r.height + 20 });
      } else {
        setSpotlight(null);
      }
      speak(t.tourSteps[tourStep], lang);
    }, el ? 450 : 50);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourStep, tourActive, lang]);

  useEffect(() => {
    if (!tourActive) return;
    function handleResize() {
      const el = getTargetEl(tourStep);
      if (el) {
        const r = el.getBoundingClientRect();
        setSpotlight({ top: r.top - 10, left: r.left - 10, width: r.width + 20, height: r.height + 20 });
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourActive, tourStep]);

  function startTour() {
    setTourPromptOpen(false);
    setTourActive(true);
    setTourStep(0);
  }
  function skipTourPrompt() {
    localStorage.setItem(TOUR_DISMISSED_KEY, "true");
    setTourPromptOpen(false);
  }
  function nextStep() {
    stopSpeaking();
    setTourStep((s) => Math.min(s + 1, TOUR_TARGETS.length - 1));
  }
  function prevStep() {
    stopSpeaking();
    setTourStep((s) => Math.max(s - 1, 0));
  }
  function endTour() {
    localStorage.setItem(TOUR_DISMISSED_KEY, "true");
    stopSpeaking();
    setTourActive(false);
    setSpotlight(null);
  }

  async function loadDocs() {
    if (!patient) return;
    setLoadingDocs(true);
    try {
      const res = await authFetch(`/api/documents/patient/${patient.patient_id}`);
      if (res.ok) setDocs(await res.json());
    } catch {
      // list just stays empty; upload area still works
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
    setSummaries((s) => {
      const next = { ...s };
      delete next[documentId];
      return next;
    });
    await loadDocs();
  }

  async function summariseAll(force = false) {
    if (!patient) return;
    setSummaryError("");
    setSummarisingAll(true);
    try {
      const res = await authFetch(
        `/api/documents/patient/${patient.patient_id}/summarize-all${force ? "?force=true" : ""}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.summaryError);
      const map: Record<number, SummaryEntry> = {};
      for (const entry of data.results as SummaryEntry[]) {
        map[entry.document_id] = entry;
      }
      setSummaries(map);
      setShowResults(true);
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : t.summaryError);
    } finally {
      setSummarisingAll(false);
    }
  }

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
        <div className="flex items-center justify-between">
          <Link href="/patient-home" className="text-sm text-[#2F6F63] hover:underline">
            {t.back}
          </Link>
          <button
            onClick={startTour}
            className="rounded-full border border-[#2F6F63]/40 px-3 py-1.5 text-xs font-medium text-[#2F6F63] hover:bg-[#2F6F63]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6F63]"
          >
            {t.audioTourBtn}
          </button>
        </div>
        <h1 style={displayFont} className="mt-4 text-2xl font-medium">{t.title}</h1>
        <p className="mt-1 text-[#1C2420]/70">{t.subtitle}</p>

        {/* Doc type selector */}
        <div ref={docTypeRef} className="mt-6">
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
          ref={dropzoneRef}
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
        <div ref={docsListRef} className="mt-10">
          <div className="flex items-center justify-between gap-3">
            <h2 style={displayFont} className="text-lg font-medium">{t.yourDocs}</h2>
            {docs.length > 0 && (
              <button
                ref={summariseAllRef}
                onClick={() => summariseAll(false)}
                disabled={summarisingAll}
                className="whitespace-nowrap rounded-full bg-[#E9A23F] px-4 py-2 text-xs font-semibold text-[#10241F] hover:bg-[#C97F28] disabled:opacity-60"
              >
                {summarisingAll ? t.summarising : t.summariseAll}
              </button>
            )}
          </div>
          {summaryError && <p className="mt-2 text-sm text-red-600">{summaryError}</p>}

          {loadingDocs ? (
            <p className="mt-3 text-sm text-[#1C2420]/50">…</p>
          ) : docs.length === 0 ? (
            <p className="mt-3 text-sm text-[#1C2420]/50">{t.noDocs}</p>
          ) : (
            <div className="mt-3 space-y-3">
              {docs.map((doc) => {
                const summary = summaries[doc.document_id];
                return (
                  <div key={doc.document_id} className="rounded-xl border border-[#1C2420]/10 bg-white/60 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
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

                    {showResults && (
                      <div className="mt-3 rounded-lg border border-[#1C2420]/10 bg-[#F3ECDA] p-3">
                        {!summary ? (
                          <p className="text-xs text-[#1C2420]/40">{t.noResultYet}</p>
                        ) : summary.error ? (
                          <p className="text-xs text-red-600">{summary.error}</p>
                        ) : (
                          <>
                            <div className="flex items-center justify-between gap-2">
                              {summary.cached && <p className="text-[11px] text-[#1C2420]/40">{t.cachedNote}</p>}
                            </div>
                            {summary.needs_review && (
                              <p className="mt-1 text-xs font-medium text-amber-700">{t.needsReview}</p>
                            )}
                            <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words font-[family-name:var(--font-mono)] text-xs text-[#1C2420]/80">
                              {JSON.stringify(summary.result, null, 2)}
                            </pre>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {showResults && docs.length > 0 && (
            <div className="mt-3 flex justify-end gap-3">
              <Link href="/document-summary" className="text-xs font-medium text-[#2F6F63] hover:underline">
                {t.viewCombined}
              </Link>
              <button onClick={() => summariseAll(true)} className="text-xs font-medium text-[#2F6F63] hover:underline">
                {t.rerunAll}
              </button>
              <button onClick={() => setShowResults(false)} className="text-xs font-medium text-[#1C2420]/50 hover:underline">
                {t.hideAll}
              </button>
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

      {/* Tour prompt modal */}
      {tourPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div style={bodyFont} className="w-full max-w-sm rounded-2xl bg-white p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E9A23F]/15 text-2xl text-[#E9A23F]">🔊</div>
            <h3 style={displayFont} className="mt-4 text-lg font-medium">{t.tourPromptTitle}</h3>
            <p className="mt-2 text-sm text-[#1C2420]/70">{t.tourPromptBody}</p>
            <div className="mt-5 flex gap-3">
              <button onClick={skipTourPrompt} className="flex-1 rounded-full border border-[#1C2420]/20 py-2.5 text-sm font-medium">
                {t.tourNo}
              </button>
              <button onClick={startTour} className="flex-1 rounded-full bg-[#E9A23F] py-2.5 text-sm font-semibold text-[#10241F] hover:bg-[#C97F28]">
                {t.tourYes}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spotlight overlay */}
      {tourActive &&
        (spotlight ? (
          <div
            className="fixed z-40 rounded-2xl transition-all duration-300"
            style={{
              top: spotlight.top,
              left: spotlight.left,
              width: spotlight.width,
              height: spotlight.height,
              boxShadow: "0 0 0 4px #E9A23F, 0 0 0 9999px rgba(0,0,0,0.65)",
              pointerEvents: "none",
            }}
          />
        ) : (
          <div className="fixed inset-0 z-40 bg-black/60" style={{ pointerEvents: "none" }} />
        ))}

      {/* Tour caption bar */}
      {tourActive && (
        <div style={bodyFont} className="fixed inset-x-0 bottom-0 z-50 border-t border-[#B9CFC4]/20 bg-[#10241F] px-6 py-4 text-[#F3ECDA]">
          <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E9A23F]/20 text-[#E9A23F]">🔊</span>
              <p className="text-sm">{t.tourSteps[tourStep]}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
              <button
                onClick={prevStep}
                disabled={tourStep === 0}
                className="rounded-full border border-[#B9CFC4]/30 px-3 py-1.5 text-xs disabled:opacity-30"
              >
                {t.tourPrev}
              </button>
              {tourStep < TOUR_TARGETS.length - 1 && (
                <button onClick={nextStep} className="rounded-full bg-[#E9A23F] px-4 py-1.5 text-xs font-semibold text-[#10241F]">
                  {t.tourNext}
                </button>
              )}
              <button onClick={endTour} className="rounded-full border border-[#B9CFC4]/30 px-3 py-1.5 text-xs">
                {t.tourEnd}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}