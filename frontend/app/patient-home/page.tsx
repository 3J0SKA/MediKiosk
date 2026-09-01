"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LANGUAGES, type Lang } from "../translations";
import { speak, stopSpeaking } from "../../lib/tts";
import { useRequireAuth } from "../../lib/useRequireAuth";

// ---------- Tour targets ----------
type TourTarget = "intro" | "emergency" | "consent" | "department" | "interview" | "upload";
const TOUR_TARGETS: TourTarget[] = ["intro", "emergency", "consent", "department", "interview", "upload"];
const TOUR_DISMISSED_KEY = "medikiosk-tour-dismissed";

// ---------- Translations ----------
const PT: Record<Lang, {
  emergency: string; emergencyBtn: string; emergencyModalTitle: string; emergencyModalBody: string;
  emergencyConfirm: string; emergencyCancel: string; emergencySent: string;
  greeting: string; subtitle: string;
  consentTitle: string; consentBody: string; listen: string; agree: string; consentRequired: string;
  deptTitle: string; deptGeneral: string; deptGeneralDesc: string; deptAyush: string; deptAyushDesc: string;
  interviewTitle: string; interviewDesc: string; interviewCta: string;
  uploadTitle: string; uploadDesc: string; uploadCta: string;
  footer: string; audioTourBtn: string;
  tourPromptTitle: string; tourPromptBody: string; tourYes: string; tourNo: string;
  tourPrev: string; tourNext: string; tourEnd: string;
  tourSteps: string[];
}> = {
  en: {
    emergency: "Having a medical emergency right now?", emergencyBtn: "Get help now",
    emergencyModalTitle: "Alert hospital staff", emergencyModalBody: "This will immediately notify nearby staff that you need urgent attention. A staff member will come to you.",
    emergencyConfirm: "Yes, alert staff", emergencyCancel: "Cancel", emergencySent: "Staff have been alerted. Please remain seated — someone is on their way.",
    greeting: "Welcome", subtitle: "Let's get a few things ready before your consultation.",
    consentTitle: "Your consent", consentBody: "We'll record your voice, ask about your health, and read documents you upload. This is only used to prepare your history for your doctor, and is cleared from this device right after your visit.",
    listen: "🔊 Listen", agree: "I understand and agree to continue", consentRequired: "Please agree to continue.",
    deptTitle: "What kind of consultation is this?", deptGeneral: "General Medicine", deptGeneralDesc: "Standard clinical history",
    deptAyush: "Ayurveda (AYUSH)", deptAyushDesc: "Includes Prakriti, Vikriti & lifestyle assessment",
    interviewTitle: "Start health interview", interviewDesc: "Speak or tap to answer questions about your symptoms.",
    interviewCta: "Begin →",
    uploadTitle: "Upload old documents", uploadDesc: "Prescriptions, lab reports, or discharge summaries.",
    uploadCta: "Upload →",
    footer: "Your data is linked to your ABHA record and cleared from this kiosk after your visit.",
    audioTourBtn: "🔊 Audio tour",
    tourPromptTitle: "Would you like an audio guide?", tourPromptBody: "We can walk you through this page with voice narration and highlights.",
    tourYes: "Yes, guide me", tourNo: "No, thanks", tourPrev: "◀ Back", tourNext: "Next ▶", tourEnd: "End tour",
    tourSteps: [
      "Welcome to MediKiosk. Let me show you around this page.",
      "If you're having a medical emergency right now, tap this red button to alert hospital staff immediately.",
      "Before we begin, please read this consent, and check the box to agree.",
      "Next, choose whether this is a General Medicine visit or an Ayurveda, AYUSH, visit.",
      "Tap here to start your health interview by speaking or tapping your answers.",
      "Or tap here first if you'd like to upload old prescriptions or reports.",
    ],
  },
  hi: {
    emergency: "क्या आपको अभी चिकित्सा आपातकाल है?", emergencyBtn: "अभी मदद पाएं",
    emergencyModalTitle: "अस्पताल स्टाफ़ को सूचित करें", emergencyModalBody: "इससे तुरंत आस-पास के स्टाफ़ को सूचित किया जाएगा कि आपको तत्काल ध्यान चाहिए। एक स्टाफ़ सदस्य आपके पास आएगा।",
    emergencyConfirm: "हाँ, स्टाफ़ को सूचित करें", emergencyCancel: "रद्द करें", emergencySent: "स्टाफ़ को सूचित कर दिया गया है। कृपया बैठे रहें — कोई आ रहा है।",
    greeting: "स्वागत है", subtitle: "परामर्श से पहले कुछ चीज़ें तैयार कर लेते हैं।",
    consentTitle: "आपकी सहमति", consentBody: "हम आपकी आवाज़ रिकॉर्ड करेंगे, आपके स्वास्थ्य के बारे में पूछेंगे, और आपके अपलोड किए दस्तावेज़ पढ़ेंगे। यह केवल आपके डॉक्टर के लिए इतिहास तैयार करने हेतु उपयोग होता है, और आपकी यात्रा के बाद इस डिवाइस से हटा दिया जाता है।",
    listen: "🔊 सुनें", agree: "मैं समझता/समझती हूं और आगे बढ़ने के लिए सहमत हूं", consentRequired: "कृपया आगे बढ़ने के लिए सहमति दें।",
    deptTitle: "यह किस प्रकार का परामर्श है?", deptGeneral: "सामान्य चिकित्सा", deptGeneralDesc: "मानक क्लिनिकल इतिहास",
    deptAyush: "आयुर्वेद (AYUSH)", deptAyushDesc: "प्रकृति, विकृति और जीवनशैली मूल्यांकन शामिल",
    interviewTitle: "स्वास्थ्य साक्षात्कार शुरू करें", interviewDesc: "अपने लक्षणों के बारे में बोलकर या छूकर जवाब दें।",
    interviewCta: "शुरू करें →",
    uploadTitle: "पुराने दस्तावेज़ अपलोड करें", uploadDesc: "पर्चे, लैब रिपोर्ट, या डिस्चार्ज सारांश।",
    uploadCta: "अपलोड करें →",
    footer: "आपका डेटा आपके ABHA रिकॉर्ड से जुड़ा है और यात्रा के बाद इस कियोस्क से हटा दिया जाता है।",
    audioTourBtn: "🔊 ऑडियो टूर",
    tourPromptTitle: "क्या आप ऑडियो गाइड चाहेंगे?", tourPromptBody: "हम आवाज़ और हाइलाइट के साथ इस पेज को समझा सकते हैं।",
    tourYes: "हां, गाइड करें", tourNo: "नहीं, धन्यवाद", tourPrev: "◀ पीछे", tourNext: "आगे ▶", tourEnd: "टूर समाप्त करें",
    tourSteps: [
      "मेडीकियोस्क में आपका स्वागत है। चलिए इस पेज को समझते हैं।",
      "अगर आपको अभी चिकित्सा आपातकाल है, तो स्टाफ़ को तुरंत सूचित करने के लिए यह लाल बटन दबाएं।",
      "शुरू करने से पहले, यह सहमति पढ़ें, और सहमत होने के लिए बॉक्स पर टिक करें। आपको अपनी सहमति देनी है।",
      "इसके बाद चुनें कि यह सामान्य चिकित्सा है या आयुर्वेद।",
      "बोलकर या छूकर अपने स्वास्थ्य के बारे में बताने के लिए यहां टैप करें।",
      "या पुराने पर्चे या रिपोर्ट अपलोड करने के लिए पहले यहां टैप करें।",
    ],
  },
  pa: {
    emergency: "ਕੀ ਤੁਹਾਨੂੰ ਹੁਣੇ ਮੈਡੀਕਲ ਐਮਰਜੈਂਸੀ ਹੈ?", emergencyBtn: "ਹੁਣੇ ਮਦਦ ਲਓ",
    emergencyModalTitle: "ਹਸਪਤਾਲ ਸਟਾਫ਼ ਨੂੰ ਸੂਚਿਤ ਕਰੋ", emergencyModalBody: "ਇਹ ਤੁਰੰਤ ਨੇੜਲੇ ਸਟਾਫ਼ ਨੂੰ ਸੂਚਿਤ ਕਰੇਗਾ ਕਿ ਤੁਹਾਨੂੰ ਤੁਰੰਤ ਧਿਆਨ ਦੀ ਲੋੜ ਹੈ। ਇੱਕ ਸਟਾਫ਼ ਮੈਂਬਰ ਤੁਹਾਡੇ ਕੋਲ ਆਵੇਗਾ।",
    emergencyConfirm: "ਹਾਂ, ਸਟਾਫ਼ ਨੂੰ ਸੂਚਿਤ ਕਰੋ", emergencyCancel: "ਰੱਦ ਕਰੋ", emergencySent: "ਸਟਾਫ਼ ਨੂੰ ਸੂਚਿਤ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਬੈਠੇ ਰਹੋ — ਕੋਈ ਆ ਰਿਹਾ ਹੈ।",
    greeting: "ਸੁਆਗਤ ਹੈ", subtitle: "ਸਲਾਹ ਤੋਂ ਪਹਿਲਾਂ ਕੁਝ ਚੀਜ਼ਾਂ ਤਿਆਰ ਕਰ ਲਈਏ।",
    consentTitle: "ਤੁਹਾਡੀ ਸਹਿਮਤੀ", consentBody: "ਅਸੀਂ ਤੁਹਾਡੀ ਆਵਾਜ਼ ਰਿਕਾਰਡ ਕਰਾਂਗੇ, ਤੁਹਾਡੀ ਸਿਹਤ ਬਾਰੇ ਪੁੱਛਾਂਗੇ, ਅਤੇ ਤੁਹਾਡੇ ਅੱਪਲੋਡ ਕੀਤੇ ਦਸਤਾਵੇਜ਼ ਪੜ੍ਹਾਂਗੇ। ਇਹ ਸਿਰਫ਼ ਤੁਹਾਡੇ ਡਾਕਟਰ ਲਈ ਇਤਿਹਾਸ ਤਿਆਰ ਕਰਨ ਲਈ ਵਰਤਿਆ ਜਾਂਦਾ ਹੈ।",
    listen: "🔊 ਸੁਣੋ", agree: "ਮੈਂ ਸਮਝਦਾ/ਸਮਝਦੀ ਹਾਂ ਅਤੇ ਅੱਗੇ ਵਧਣ ਲਈ ਸਹਿਮਤ ਹਾਂ", consentRequired: "ਕਿਰਪਾ ਕਰਕੇ ਅੱਗੇ ਵਧਣ ਲਈ ਸਹਿਮਤ ਹੋਵੋ।",
    deptTitle: "ਇਹ ਕਿਸ ਕਿਸਮ ਦੀ ਸਲਾਹ ਹੈ?", deptGeneral: "ਸਧਾਰਨ ਦਵਾਈ", deptGeneralDesc: "ਮਿਆਰੀ ਕਲੀਨਿਕਲ ਇਤਿਹਾਸ",
    deptAyush: "ਆਯੁਰਵੇਦ (AYUSH)", deptAyushDesc: "ਪ੍ਰਕ੍ਰਿਤੀ, ਵਿਕ੍ਰਿਤੀ ਅਤੇ ਜੀਵਨਸ਼ੈਲੀ ਮੁਲਾਂਕਣ ਸ਼ਾਮਲ",
    interviewTitle: "ਸਿਹਤ ਇੰਟਰਵਿਊ ਸ਼ੁਰੂ ਕਰੋ", interviewDesc: "ਆਪਣੇ ਲੱਛਣਾਂ ਬਾਰੇ ਬੋਲ ਕੇ ਜਾਂ ਛੂਹ ਕੇ ਜਵਾਬ ਦਿਓ।",
    interviewCta: "ਸ਼ੁਰੂ ਕਰੋ →",
    uploadTitle: "ਪੁਰਾਣੇ ਦਸਤਾਵੇਜ਼ ਅੱਪਲੋਡ ਕਰੋ", uploadDesc: "ਨੁਸਖੇ, ਲੈਬ ਰਿਪੋਰਟਾਂ, ਜਾਂ ਡਿਸਚਾਰਜ ਸਾਰ।",
    uploadCta: "ਅੱਪਲੋਡ ਕਰੋ →",
    footer: "ਤੁਹਾਡਾ ਡਾਟਾ ਤੁਹਾਡੇ ABHA ਰਿਕਾਰਡ ਨਾਲ ਜੁੜਿਆ ਹੈ ਅਤੇ ਫੇਰੀ ਤੋਂ ਬਾਅਦ ਇਸ ਕਿਓਸਕ ਤੋਂ ਹਟਾ ਦਿੱਤਾ ਜਾਂਦਾ ਹੈ।",
    audioTourBtn: "🔊 ਆਡੀਓ ਟੂਰ",
    tourPromptTitle: "ਕੀ ਤੁਸੀਂ ਆਡੀਓ ਗਾਈਡ ਚਾਹੋਗੇ?", tourPromptBody: "ਅਸੀਂ ਆਵਾਜ਼ ਅਤੇ ਹਾਈਲਾਈਟ ਨਾਲ ਇਹ ਪੇਜ ਸਮਝਾ ਸਕਦੇ ਹਾਂ।",
    tourYes: "ਹਾਂ, ਗਾਈਡ ਕਰੋ", tourNo: "ਨਹੀਂ, ਧੰਨਵਾਦ", tourPrev: "◀ ਪਿੱਛੇ", tourNext: "ਅੱਗੇ ▶", tourEnd: "ਟੂਰ ਖਤਮ ਕਰੋ",
    tourSteps: [
      "ਮੇਡੀਕਿਓਸਕ ਵਿੱਚ ਤੁਹਾਡਾ ਸੁਆਗਤ ਹੈ। ਆਓ ਇਸ ਪੇਜ ਨੂੰ ਸਮਝੀਏ।",
      "ਜੇ ਤੁਹਾਨੂੰ ਹੁਣੇ ਮੈਡੀਕਲ ਐਮਰਜੈਂਸੀ ਹੈ, ਤਾਂ ਸਟਾਫ਼ ਨੂੰ ਤੁਰੰਤ ਸੂਚਿਤ ਕਰਨ ਲਈ ਇਹ ਲਾਲ ਬਟਨ ਦਬਾਓ।",
      "ਸ਼ੁਰੂ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ, ਇਹ ਸਹਿਮਤੀ ਪੜ੍ਹੋ, ਅਤੇ ਸਹਿਮਤ ਹੋਣ ਲਈ ਬਾਕਸ 'ਤੇ ਟਿੱਕ ਕਰੋ।",
      "ਇਸ ਤੋਂ ਬਾਅਦ ਚੁਣੋ ਕਿ ਇਹ ਸਧਾਰਨ ਦਵਾਈ ਹੈ ਜਾਂ ਆਯੁਰਵੇਦ।",
      "ਬੋਲ ਕੇ ਜਾਂ ਛੂਹ ਕੇ ਆਪਣੀ ਸਿਹਤ ਬਾਰੇ ਦੱਸਣ ਲਈ ਇੱਥੇ ਟੈਪ ਕਰੋ।",
      "ਜਾਂ ਪੁਰਾਣੇ ਨੁਸਖੇ ਜਾਂ ਰਿਪੋਰਟਾਂ ਅੱਪਲੋਡ ਕਰਨ ਲਈ ਪਹਿਲਾਂ ਇੱਥੇ ਟੈਪ ਕਰੋ।",
    ],
  },
  ta: {
    emergency: "இப்போது மருத்துவ அவசரநிலையா?", emergencyBtn: "இப்போது உதவி பெறவும்",
    emergencyModalTitle: "மருத்துவமனை ஊழியர்களுக்கு அறிவிக்கவும்", emergencyModalBody: "இது உங்களுக்கு அவசர கவனிப்பு தேவை என்பதை அருகிலுள்ள ஊழியர்களுக்கு உடனடியாக அறிவிக்கும்.",
    emergencyConfirm: "ஆம், ஊழியர்களுக்கு அறிவிக்கவும்", emergencyCancel: "ரத்து செய்", emergencySent: "ஊழியர்களுக்கு அறிவிக்கப்பட்டது. அமர்ந்திருங்கள் — ஒருவர் வருகிறார்.",
    greeting: "வருக", subtitle: "ஆலோசனைக்கு முன் சில விஷயங்களை தயார் செய்வோம்.",
    consentTitle: "உங்கள் ஒப்புதல்", consentBody: "நாங்கள் உங்கள் குரலைப் பதிவு செய்வோம், உங்கள் ஆரோக்கியத்தைப் பற்றி கேட்போம், நீங்கள் பதிவேற்றும் ஆவணங்களைப் படிப்போம். இது உங்கள் மருத்துவருக்கான வரலாற்றைத் தயாரிக்கவே பயன்படுத்தப்படும்.",
    listen: "🔊 கேளுங்கள்", agree: "நான் புரிந்துகொண்டு தொடர ஒப்புக்கொள்கிறேன்", consentRequired: "தொடர ஒப்புதல் அளிக்கவும்.",
    deptTitle: "இது எந்த வகை ஆலோசனை?", deptGeneral: "பொது மருத்துவம்", deptGeneralDesc: "நிலையான மருத்துவ வரலாறு",
    deptAyush: "ஆயுர்வேதம் (AYUSH)", deptAyushDesc: "பிரகிருதி, விக்ருதி மற்றும் வாழ்க்கை முறை மதிப்பீடு அடங்கும்",
    interviewTitle: "சுகாதார நேர்காணலைத் தொடங்கவும்", interviewDesc: "உங்கள் அறிகுறிகள் பற்றி பேசி அல்லது தொட்டு பதிலளிக்கவும்.",
    interviewCta: "தொடங்கு →",
    uploadTitle: "பழைய ஆவணங்களைப் பதிவேற்றவும்", uploadDesc: "மருந்துச் சீட்டுகள், லேப் அறிக்கைகள், அல்லது டிஸ்சார்ஜ் சுருக்கங்கள்.",
    uploadCta: "பதிவேற்று →",
    footer: "உங்கள் தரவு உங்கள் ABHA பதிவுடன் இணைக்கப்பட்டுள்ளது, வருகைக்குப் பிறகு இந்த கியோஸ்கிலிருந்து அழிக்கப்படும்.",
    audioTourBtn: "🔊 ஆடியோ சுற்றுலா",
    tourPromptTitle: "நீங்கள் ஆடியோ வழிகாட்டி விரும்புகிறீர்களா?", tourPromptBody: "குரல் விளக்கம் மற்றும் சிறப்பம்சத்துடன் இந்தப் பக்கத்தை நாங்கள் விளக்கலாம்.",
    tourYes: "ஆம், வழிகாட்டவும்", tourNo: "வேண்டாம், நன்றி", tourPrev: "◀ பின்", tourNext: "அடுத்து ▶", tourEnd: "சுற்றுலா முடிக்கவும்",
    tourSteps: [
      "மெடிகியோஸ்க்-க்கு வரவேற்கிறோம். இந்தப் பக்கத்தைப் பார்வையிடலாம்.",
      "இப்போது மருத்துவ அவசரநிலை இருந்தால், ஊழியர்களுக்கு உடனடியாக அறிவிக்க இந்த சிவப்பு பொத்தானை அழுத்தவும்.",
      "தொடங்குவதற்கு முன், இந்த ஒப்புதலைப் படித்து, ஒப்புக்கொள்ள பெட்டியை தேர்ந்தெடுக்கவும்.",
      "அடுத்து, இது பொது மருத்துவமா அல்லது ஆயுர்வேதமா என்பதைத் தேர்ந்தெடுக்கவும்.",
      "பேசி அல்லது தொட்டு உங்கள் ஆரோக்கியத்தைப் பற்றி கூற இங்கே தட்டவும்.",
      "அல்லது பழைய மருந்துச் சீட்டுகளை பதிவேற்ற முதலில் இங்கே தட்டவும்.",
    ],
  },
  bn: {
    emergency: "এখন কি চিকিৎসা জরুরি অবস্থা?", emergencyBtn: "এখনই সাহায্য নিন",
    emergencyModalTitle: "হাসপাতালের স্টাফদের জানান", emergencyModalBody: "এটি আশেপাশের স্টাফদের অবিলম্বে জানাবে যে আপনার জরুরি মনোযোগ প্রয়োজন। একজন স্টাফ সদস্য আপনার কাছে আসবেন।",
    emergencyConfirm: "হ্যাঁ, স্টাফদের জানান", emergencyCancel: "বাতিল", emergencySent: "স্টাফদের জানানো হয়েছে। অনুগ্রহ করে বসে থাকুন — কেউ আসছেন।",
    greeting: "স্বাগতম", subtitle: "পরামর্শের আগে কিছু জিনিস প্রস্তুত করে নিই।",
    consentTitle: "আপনার সম্মতি", consentBody: "আমরা আপনার কণ্ঠ রেকর্ড করব, আপনার স্বাস্থ্য সম্পর্কে জিজ্ঞাসা করব, এবং আপনার আপলোড করা নথি পড়ব। এটি শুধুমাত্র আপনার ডাক্তারের জন্য ইতিহাস প্রস্তুত করতে ব্যবহৃত হয়।",
    listen: "🔊 শুনুন", agree: "আমি বুঝেছি এবং চালিয়ে যেতে সম্মত", consentRequired: "চালিয়ে যেতে অনুগ্রহ করে সম্মত হন।",
    deptTitle: "এটি কোন ধরনের পরামর্শ?", deptGeneral: "সাধারণ চিকিৎসা", deptGeneralDesc: "মানক ক্লিনিক্যাল ইতিহাস",
    deptAyush: "আয়ুর্বেদ (AYUSH)", deptAyushDesc: "প্রকৃতি, বিকৃতি ও জীবনযাত্রা মূল্যায়ন অন্তর্ভুক্ত",
    interviewTitle: "স্বাস্থ্য সাক্ষাৎকার শুরু করুন", interviewDesc: "আপনার লক্ষণ সম্পর্কে বলে বা স্পর্শ করে উত্তর দিন।",
    interviewCta: "শুরু করুন →",
    uploadTitle: "পুরনো নথি আপলোড করুন", uploadDesc: "প্রেসক্রিপশন, ল্যাব রিপোর্ট, বা ডিসচার্জ সারসংক্ষেপ।",
    uploadCta: "আপলোড করুন →",
    footer: "আপনার তথ্য আপনার ABHA রেকর্ডের সাথে যুক্ত এবং ভিজিটের পরে এই কিয়স্ক থেকে মুছে ফেলা হয়।",
    audioTourBtn: "🔊 অডিও ট্যুর",
    tourPromptTitle: "আপনি কি অডিও গাইড চান?", tourPromptBody: "আমরা কণ্ঠস্বর ও হাইলাইট দিয়ে এই পাতাটি বুঝিয়ে দিতে পারি।",
    tourYes: "হ্যাঁ, গাইড করুন", tourNo: "না, ধন্যবাদ", tourPrev: "◀ পিছনে", tourNext: "পরবর্তী ▶", tourEnd: "ট্যুর শেষ করুন",
    tourSteps: [
      "মেডিকিয়স্কে আপনাকে স্বাগতম। চলুন এই পাতাটি দেখি।",
      "যদি এখন চিকিৎসা জরুরি অবস্থা হয়, স্টাফদের তাৎক্ষণিক জানাতে এই লাল বোতাম চাপুন।",
      "শুরু করার আগে, এই সম্মতি পড়ুন এবং সম্মত হতে বাক্সে টিক দিন।",
      "এরপর বেছে নিন এটি সাধারণ চিকিৎসা নাকি আয়ুর্বেদ।",
      "বলে বা স্পর্শ করে আপনার স্বাস্থ্য সম্পর্কে বলতে এখানে ট্যাপ করুন।",
      "অথবা পুরনো প্রেসক্রিপশন আপলোড করতে প্রথমে এখানে ট্যাপ করুন।",
    ],
  },
};

const FONT: Record<Lang, string> = { en: "var(--font-body)", hi: "var(--font-hi)", pa: "var(--font-pa)", ta: "var(--font-ta)", bn: "var(--font-bn)" };
const DISPLAY_FONT: Record<Lang, string> = { en: "var(--font-display)", hi: "var(--font-hi)", pa: "var(--font-pa)", ta: "var(--font-ta)", bn: "var(--font-bn)" };

export default function PatientHome() {
  const { patient, ready } = useRequireAuth();

  const [lang, setLang] = useState<Lang>("en");
  const [consented, setConsented] = useState(false);
  const [consentError, setConsentError] = useState("");
  const [dept, setDept] = useState<"general" | "ayush">("general");
  const [showEmergency, setShowEmergency] = useState(false);
  const [emergencySent, setEmergencySent] = useState(false);

  const [tourPromptOpen, setTourPromptOpen] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [spotlight, setSpotlight] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const emergencyRef = useRef<HTMLDivElement>(null);
  const consentRef = useRef<HTMLDivElement>(null);
  const departmentRef = useRef<HTMLDivElement>(null);
  const interviewRef = useRef<HTMLAnchorElement>(null);
  const uploadRef = useRef<HTMLAnchorElement>(null);

  function getTargetEl(step: number): HTMLElement | null {
    switch (TOUR_TARGETS[step]) {
      case "emergency": return emergencyRef.current;
      case "consent": return consentRef.current;
      case "department": return departmentRef.current;
      case "interview": return interviewRef.current;
      case "upload": return uploadRef.current;
      default: return null;
    }
  }

  useEffect(() => {
    const savedLang = localStorage.getItem("medikiosk-lang") as Lang | null;
    if (savedLang) setLang(savedLang);
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.getVoices();

    // Only auto-prompt once per login session
    const dismissed = localStorage.getItem(TOUR_DISMISSED_KEY);
    if (!dismissed) setTourPromptOpen(true);
  }, []);

  useEffect(() => () => stopSpeaking(), []);

  const t = PT[lang];

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

  const bodyFont = { fontFamily: FONT[lang] };
  const displayFont = { fontFamily: DISPLAY_FONT[lang] };

  function guardedNav(e: React.MouseEvent) {
    if (!consented) {
      e.preventDefault();
      setConsentError(t.consentRequired);
    } else {
      localStorage.setItem("medikiosk-department", dept);
    }
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#10241F] text-[#F3ECDA]">
        <p className="text-sm text-[#B9CFC4]">Loading…</p>
      </main>
    );
  }

  return (
    <main style={bodyFont} className="min-h-screen bg-[#F3ECDA] text-[#1C2420]">
      {/* Emergency strip */}
      <div ref={emergencyRef} className="flex items-center justify-between gap-4 bg-red-700 px-6 py-3 text-white">
        <p className="text-sm font-medium">⚠ {t.emergency}</p>
        <button
          onClick={() => setShowEmergency(true)}
          className="whitespace-nowrap rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {t.emergencyBtn}
        </button>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center justify-between">
          <p style={displayFont} className="text-xl font-semibold">
            Medi<span className="text-[#E9A23F]">Kiosk</span>
          </p>
          <button
            onClick={startTour}
            className="rounded-full border border-[#2F6F63]/40 px-3 py-1.5 text-xs font-medium text-[#2F6F63] hover:bg-[#2F6F63]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6F63]"
          >
            {t.audioTourBtn}
          </button>
        </div>
        <h1 style={displayFont} className="mt-6 text-3xl font-medium">
          {t.greeting}, {patient?.full_name}
        </h1>
        <p className="mt-1 text-[#1C2420]/70">{t.subtitle}</p>

        {/* Consent card */}
        <div ref={consentRef} className="mt-8 rounded-2xl border border-[#1C2420]/10 bg-white/60 p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 style={displayFont} className="text-lg font-medium">{t.consentTitle}</h2>
            <button
              onClick={() => speak(t.consentBody, lang)}
              className="whitespace-nowrap rounded-full border border-[#2F6F63]/40 px-3 py-1.5 text-xs font-medium text-[#2F6F63] hover:bg-[#2F6F63]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6F63]"
            >
              {t.listen}
            </button>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[#1C2420]/70">{t.consentBody}</p>
          <label className="mt-4 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={consented}
              onChange={(e) => {
                setConsented(e.target.checked);
                if (e.target.checked) setConsentError("");
              }}
              className="mt-0.5 h-5 w-5 rounded border-[#1C2420]/30 accent-[#2F6F63]"
            />
            <span className="text-sm font-medium">{t.agree}</span>
          </label>
          {consentError && <p className="mt-2 text-sm text-red-600">{consentError}</p>}
        </div>

        {/* Department selector */}
        <div ref={departmentRef} className="mt-6">
          <h2 style={displayFont} className="text-lg font-medium">{t.deptTitle}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setDept("general")}
              className={`rounded-2xl border p-4 text-left transition ${
                dept === "general" ? "border-[#2F6F63] bg-[#2F6F63]/10" : "border-[#1C2420]/10 bg-white/60 hover:border-[#1C2420]/25"
              }`}
            >
              <p className="font-medium">{t.deptGeneral}</p>
              <p className="mt-1 text-sm text-[#1C2420]/60">{t.deptGeneralDesc}</p>
            </button>
            <button
              onClick={() => setDept("ayush")}
              className={`rounded-2xl border p-4 text-left transition ${
                dept === "ayush" ? "border-[#2F6F63] bg-[#2F6F63]/10" : "border-[#1C2420]/10 bg-white/60 hover:border-[#1C2420]/25"
              }`}
            >
              <p className="font-medium">{t.deptAyush}</p>
              <p className="mt-1 text-sm text-[#1C2420]/60">{t.deptAyushDesc}</p>
            </button>
          </div>
        </div>

        {/* Action tiles */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            ref={interviewRef}
            href="/patient-intake"
            onClick={guardedNav}
            className={`rounded-2xl border p-6 transition ${
              consented ? "border-[#1C2420]/10 bg-[#10241F] text-[#F3ECDA] hover:opacity-90" : "border-[#1C2420]/10 bg-[#10241F]/40 text-[#F3ECDA]/60"
            }`}
          >
            <span className="text-2xl">🎙️</span>
            <h3 style={displayFont} className="mt-3 text-lg font-medium">{t.interviewTitle}</h3>
            <p className="mt-1 text-sm opacity-80">{t.interviewDesc}</p>
            <p className="mt-4 text-sm font-semibold text-[#E9A23F]">{t.interviewCta}</p>
          </Link>
          <Link
            ref={uploadRef}
            href="/document-upload"
            onClick={guardedNav}
            className={`rounded-2xl border p-6 transition ${
              consented ? "border-[#1C2420]/10 bg-white hover:border-[#2F6F63]" : "border-[#1C2420]/10 bg-white/40"
            }`}
          >
            <span className="text-2xl">📄</span>
            <h3 style={displayFont} className="mt-3 text-lg font-medium">{t.uploadTitle}</h3>
            <p className="mt-1 text-sm text-[#1C2420]/60">{t.uploadDesc}</p>
            <p className="mt-4 text-sm font-semibold text-[#2F6F63]">{t.uploadCta}</p>
          </Link>
        </div>

        <p className="mt-8 text-center text-xs text-[#1C2420]/50">{t.footer}</p>
      </div>

      {/* Emergency modal */}
      {showEmergency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center">
            {emergencySent ? (
              <>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl text-red-700">✓</div>
                <p className="mt-4 text-sm">{t.emergencySent}</p>
                <button
                  onClick={() => { setShowEmergency(false); setEmergencySent(false); }}
                  className="mt-5 w-full rounded-full bg-[#1C2420] py-2.5 text-sm font-semibold text-white"
                >
                  OK
                </button>
              </>
            ) : (
              <>
                <h3 style={displayFont} className="text-lg font-medium">{t.emergencyModalTitle}</h3>
                <p className="mt-2 text-sm text-[#1C2420]/70">{t.emergencyModalBody}</p>
                <div className="mt-5 flex gap-3">
                  <button onClick={() => setShowEmergency(false)} className="flex-1 rounded-full border border-[#1C2420]/20 py-2.5 text-sm font-medium">
                    {t.emergencyCancel}
                  </button>
                  <button onClick={() => setEmergencySent(true)} className="flex-1 rounded-full bg-red-700 py-2.5 text-sm font-semibold text-white hover:bg-red-800">
                    {t.emergencyConfirm}
                  </button>
                </div>
              </>
            )}
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
          <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}