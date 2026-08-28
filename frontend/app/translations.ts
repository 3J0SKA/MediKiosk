export type Lang = "en" | "hi" | "pa" | "ta" | "bn";

export const LANGUAGES: { code: Lang; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिंदी" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
];

type Dict = {
  nav: { howItWorks: string; platform: string; forPhysicians: string; startIntake: string };
  hero: {
    eyebrow: string;
    headline1: string;
    headlineEm: string;
    headline2: string;
    sub: string;
    ctaStart: string;
    ctaPhysician: string;
    trust: string;
  };
  stats: {
    kicker: string;
    heading: string;
    items: { value: string; label: string }[];
  };
  journey: {
    kicker: string;
    heading: string;
    steps: { n: string; title: string; body: string }[];
  };
  features: {
    kicker: string;
    heading: string;
    items: { title: string; body: string }[];
  };
  physician: { heading: string; sub: string; cta: string };
  footer: { tagline: string };
  gate: { title: string; subtitle: string; continue: string };
};

export const translations: Record<Lang, Dict> = {
  en: {
    nav: { howItWorks: "How it works", platform: "Platform", forPhysicians: "For physicians", startIntake: "Start intake" },
    hero: {
      eyebrow: "AI clinical intake, before the consultation begins",
      headline1: "Two minutes with the doctor deserves",
      headlineEm: "ten minutes",
      headline2: "of listening first.",
      sub: "MediKiosk listens to patients in their own language, reads their old prescriptions, and hands physicians a complete, structured history before they walk into the room.",
      ctaStart: "Start patient intake",
      ctaPhysician: "Physician login",
      trust: "Built for ABDM · Hindi, English & regional languages · DPDP Act 2023 compliant",
    },
    stats: {
      kicker: "Why this matters",
      heading: "India's OPDs don't lack skilled doctors. They lack time to listen.",
      items: [
        { value: "2–5 min", label: "average OPD consultation time" },
        { value: "4,000–10,000", label: "patients registered per day at tertiary hospitals" },
        { value: "70–80%", label: "of diagnoses a thorough history alone can reveal" },
      ],
    },
    journey: {
      kicker: "The patient journey",
      heading: "Five steps, completed before the patient sees a doctor.",
      steps: [
        { n: "01", title: "Identify", body: "Scan your ABHA ID or Aadhaar, pick a language, and give consent — all guided by audio." },
        { n: "02", title: "Converse", body: "Answer questions by speaking or tapping. Urgent symptoms are flagged for immediate attention." },
        { n: "03", title: "Scan", body: "Upload old prescriptions and reports. We read and organize them for you." },
        { n: "04", title: "Summarize", body: "Your history is compiled and sent to the doctor's system automatically." },
        { n: "05", title: "Consult", body: "The doctor already knows your history — the visit is for examination, not repeating yourself." },
      ],
    },
    features: {
      kicker: "The platform",
      heading: "Everything a physician needs, already on screen.",
      items: [
        { title: "Speaks your language", body: "Voice or touch, in Hindi, English, or a regional language, with follow-up questions like a doctor would ask." },
        { title: "Reads your old prescriptions", body: "We scan and organize your past prescriptions, reports, and discharge papers into one timeline." },
        { title: "Hands doctors a finished draft", body: "A complete, structured history ready for the doctor to review and confirm." },
        { title: "Secure by design", body: "Linked to your ABHA ID, consent-first, and your data is cleared right after your visit." },
      ],
    },
    physician: { heading: "Already a physician here?", sub: "Review structured histories the moment your patient enters the room.", cta: "Physician login →" },
    footer: { tagline: "Smart India Hackathon 2026 · AI Clinical History Platform" },
    gate: { title: "Choose your language", subtitle: "Which language would you like to use?", continue: "Continue" },
  },
  hi: {
    nav: { howItWorks: "यह कैसे काम करता है", platform: "प्लेटफ़ॉर्म", forPhysicians: "डॉक्टरों के लिए", startIntake: "शुरू करें" },
    hero: {
      eyebrow: "परामर्श से पहले, एआई द्वारा मरीज़ का इतिहास",
      headline1: "डॉक्टर के साथ दो मिनट के लिए",
      headlineEm: "दस मिनट",
      headline2: "सुनना ज़रूरी है।",
      sub: "मेडीकियोस्क मरीज़ की बात उन्हीं की भाषा में सुनता है, पुराने पर्चे पढ़ता है, और डॉक्टर को परामर्श से पहले पूरा, व्यवस्थित इतिहास सौंपता है।",
      ctaStart: "मरीज़ की जानकारी शुरू करें",
      ctaPhysician: "डॉक्टर लॉगिन",
      trust: "ABDM के लिए बना · हिंदी, अंग्रेज़ी और क्षेत्रीय भाषाएँ · DPDP अधिनियम 2023 अनुरूप",
    },
    stats: {
      kicker: "यह क्यों ज़रूरी है",
      heading: "भारत के अस्पतालों में डॉक्टरों की कमी नहीं, सुनने के समय की कमी है।",
      items: [
        { value: "2–5 मिनट", label: "औसत ओपीडी परामर्श समय" },
        { value: "4,000–10,000", label: "बड़े अस्पतालों में रोज़ाना मरीज़" },
        { value: "70–80%", label: "केवल इतिहास से पता चलने वाले निदान" },
      ],
    },
    journey: {
      kicker: "मरीज़ की यात्रा",
      heading: "डॉक्टर से मिलने से पहले पाँच चरण पूरे होते हैं।",
      steps: [
        { n: "01", title: "पहचान", body: "अपना ABHA ID या आधार स्कैन करें, भाषा चुनें, और सहमति दें — सब कुछ ऑडियो द्वारा निर्देशित।" },
        { n: "02", title: "बातचीत", body: "बोलकर या छूकर सवालों के जवाब दें। ज़रूरी लक्षणों पर तुरंत ध्यान दिया जाएगा।" },
        { n: "03", title: "स्कैन", body: "पुराने पर्चे और रिपोर्ट अपलोड करें। हम उन्हें पढ़कर व्यवस्थित करते हैं।" },
        { n: "04", title: "सारांश", body: "आपका इतिहास तैयार होकर डॉक्टर के सिस्टम में अपने आप भेज दिया जाता है।" },
        { n: "05", title: "परामर्श", body: "डॉक्टर को आपका इतिहास पहले से पता है — मुलाकात जांच के लिए है, दोहराने के लिए नहीं।" },
      ],
    },
    features: {
      kicker: "प्लेटफ़ॉर्म",
      heading: "डॉक्टर को जो चाहिए, वह पहले से स्क्रीन पर है।",
      items: [
        { title: "आपकी भाषा में बात करता है", body: "बोलकर या छूकर, हिंदी, अंग्रेज़ी या क्षेत्रीय भाषा में — डॉक्टर जैसे सवाल पूछते हुए।" },
        { title: "पुराने पर्चे पढ़ता है", body: "हम आपके पुराने पर्चे, रिपोर्ट और डिस्चार्ज कागज़ात को स्कैन कर एक साथ व्यवस्थित करते हैं।" },
        { title: "डॉक्टर को तैयार सारांश देता है", body: "पूरा, व्यवस्थित इतिहास, डॉक्टर की समीक्षा और पुष्टि के लिए तैयार।" },
        { title: "सुरक्षा पहले से", body: "आपके ABHA ID से जुड़ा, सहमति-आधारित, और मुलाकात के बाद डेटा तुरंत हटा दिया जाता है।" },
      ],
    },
    physician: { heading: "क्या आप डॉक्टर हैं?", sub: "मरीज़ के कमरे में आते ही व्यवस्थित इतिहास देखें।", cta: "डॉक्टर लॉगिन →" },
    footer: { tagline: "स्मार्ट इंडिया हैकाथॉन 2026 · एआई क्लिनिकल हिस्ट्री प्लेटफ़ॉर्म" },
    gate: { title: "अपनी भाषा चुनें", subtitle: "आप किस भाषा का उपयोग करना चाहेंगे?", continue: "जारी रखें" },
  },
  pa: {
    nav: { howItWorks: "ਇਹ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ", platform: "ਪਲੇਟਫਾਰਮ", forPhysicians: "ਡਾਕਟਰਾਂ ਲਈ", startIntake: "ਸ਼ੁਰੂ ਕਰੋ" },
    hero: {
      eyebrow: "ਸਲਾਹ ਤੋਂ ਪਹਿਲਾਂ, ਏਆਈ ਦੁਆਰਾ ਮਰੀਜ਼ ਦਾ ਇਤਿਹਾਸ",
      headline1: "ਡਾਕਟਰ ਨਾਲ ਦੋ ਮਿੰਟਾਂ ਲਈ",
      headlineEm: "ਦਸ ਮਿੰਟ",
      headline2: "ਸੁਣਨਾ ਜ਼ਰੂਰੀ ਹੈ।",
      sub: "ਮੇਡੀਕਿਓਸਕ ਮਰੀਜ਼ ਦੀ ਗੱਲ ਉਹਨਾਂ ਦੀ ਆਪਣੀ ਭਾਸ਼ਾ ਵਿੱਚ ਸੁਣਦਾ ਹੈ, ਪੁਰਾਣੇ ਨੁਸਖੇ ਪੜ੍ਹਦਾ ਹੈ, ਅਤੇ ਡਾਕਟਰ ਨੂੰ ਸਲਾਹ ਤੋਂ ਪਹਿਲਾਂ ਪੂਰਾ, ਵਿਵਸਥਿਤ ਇਤਿਹਾਸ ਸੌਂਪਦਾ ਹੈ।",
      ctaStart: "ਮਰੀਜ਼ ਦੀ ਜਾਣਕਾਰੀ ਸ਼ੁਰੂ ਕਰੋ",
      ctaPhysician: "ਡਾਕਟਰ ਲਾਗਇਨ",
      trust: "ABDM ਲਈ ਬਣਾਇਆ · ਪੰਜਾਬੀ, ਹਿੰਦੀ, ਅੰਗਰੇਜ਼ੀ ਅਤੇ ਖੇਤਰੀ ਭਾਸ਼ਾਵਾਂ · DPDP ਐਕਟ 2023 ਅਨੁਸਾਰ",
    },
    stats: {
      kicker: "ਇਹ ਕਿਉਂ ਜ਼ਰੂਰੀ ਹੈ",
      heading: "ਭਾਰਤ ਦੇ ਹਸਪਤਾਲਾਂ ਵਿੱਚ ਡਾਕਟਰਾਂ ਦੀ ਨਹੀਂ, ਸੁਣਨ ਦੇ ਸਮੇਂ ਦੀ ਘਾਟ ਹੈ।",
      items: [
        { value: "2–5 ਮਿੰਟ", label: "ਔਸਤ ਓਪੀਡੀ ਸਲਾਹ ਸਮਾਂ" },
        { value: "4,000–10,000", label: "ਵੱਡੇ ਹਸਪਤਾਲਾਂ ਵਿੱਚ ਰੋਜ਼ਾਨਾ ਮਰੀਜ਼" },
        { value: "70–80%", label: "ਸਿਰਫ਼ ਇਤਿਹਾਸ ਤੋਂ ਪਤਾ ਲੱਗਣ ਵਾਲੇ ਨਿਦਾਨ" },
      ],
    },
    journey: {
      kicker: "ਮਰੀਜ਼ ਦੀ ਯਾਤਰਾ",
      heading: "ਡਾਕਟਰ ਨੂੰ ਮਿਲਣ ਤੋਂ ਪਹਿਲਾਂ ਪੰਜ ਪੜਾਅ ਪੂਰੇ ਹੁੰਦੇ ਹਨ।",
      steps: [
        { n: "01", title: "ਪਛਾਣ", body: "ਆਪਣਾ ABHA ID ਜਾਂ ਆਧਾਰ ਸਕੈਨ ਕਰੋ, ਭਾਸ਼ਾ ਚੁਣੋ, ਅਤੇ ਸਹਿਮਤੀ ਦਿਓ — ਸਭ ਆਡੀਓ ਰਾਹੀਂ ਗਾਈਡ ਕੀਤਾ ਗਿਆ।" },
        { n: "02", title: "ਗੱਲਬਾਤ", body: "ਬੋਲ ਕੇ ਜਾਂ ਛੂਹ ਕੇ ਸਵਾਲਾਂ ਦੇ ਜਵਾਬ ਦਿਓ। ਜ਼ਰੂਰੀ ਲੱਛਣਾਂ ਵੱਲ ਤੁਰੰਤ ਧਿਆਨ ਦਿੱਤਾ ਜਾਵੇਗਾ।" },
        { n: "03", title: "ਸਕੈਨ", body: "ਪੁਰਾਣੇ ਨੁਸਖੇ ਅਤੇ ਰਿਪੋਰਟਾਂ ਅੱਪਲੋਡ ਕਰੋ। ਅਸੀਂ ਉਹਨਾਂ ਨੂੰ ਪੜ੍ਹ ਕੇ ਵਿਵਸਥਿਤ ਕਰਦੇ ਹਾਂ।" },
        { n: "04", title: "ਸਾਰ", body: "ਤੁਹਾਡਾ ਇਤਿਹਾਸ ਤਿਆਰ ਹੋ ਕੇ ਡਾਕਟਰ ਦੇ ਸਿਸਟਮ ਵਿੱਚ ਆਪਣੇ ਆਪ ਭੇਜ ਦਿੱਤਾ ਜਾਂਦਾ ਹੈ।" },
        { n: "05", title: "ਸਲਾਹ", body: "ਡਾਕਟਰ ਨੂੰ ਤੁਹਾਡਾ ਇਤਿਹਾਸ ਪਹਿਲਾਂ ਹੀ ਪਤਾ ਹੈ — ਮੁਲਾਕਾਤ ਜਾਂਚ ਲਈ ਹੈ, ਦੁਹਰਾਉਣ ਲਈ ਨਹੀਂ।" },
      ],
    },
    features: {
      kicker: "ਪਲੇਟਫਾਰਮ",
      heading: "ਡਾਕਟਰ ਨੂੰ ਜੋ ਚਾਹੀਦਾ, ਉਹ ਪਹਿਲਾਂ ਹੀ ਸਕ੍ਰੀਨ 'ਤੇ ਹੈ।",
      items: [
        { title: "ਤੁਹਾਡੀ ਭਾਸ਼ਾ ਵਿੱਚ ਗੱਲ ਕਰਦਾ ਹੈ", body: "ਬੋਲ ਕੇ ਜਾਂ ਛੂਹ ਕੇ, ਪੰਜਾਬੀ, ਹਿੰਦੀ, ਅੰਗਰੇਜ਼ੀ ਜਾਂ ਖੇਤਰੀ ਭਾਸ਼ਾ ਵਿੱਚ।" },
        { title: "ਪੁਰਾਣੇ ਨੁਸਖੇ ਪੜ੍ਹਦਾ ਹੈ", body: "ਅਸੀਂ ਤੁਹਾਡੇ ਪੁਰਾਣੇ ਨੁਸਖੇ, ਰਿਪੋਰਟਾਂ ਅਤੇ ਡਿਸਚਾਰਜ ਕਾਗਜ਼ਾਤ ਨੂੰ ਇਕੱਠੇ ਵਿਵਸਥਿਤ ਕਰਦੇ ਹਾਂ।" },
        { title: "ਡਾਕਟਰ ਨੂੰ ਤਿਆਰ ਸਾਰ ਦਿੰਦਾ ਹੈ", body: "ਪੂਰਾ, ਵਿਵਸਥਿਤ ਇਤਿਹਾਸ, ਡਾਕਟਰ ਦੀ ਸਮੀਖਿਆ ਲਈ ਤਿਆਰ।" },
        { title: "ਸੁਰੱਖਿਆ ਪਹਿਲਾਂ ਤੋਂ", body: "ਤੁਹਾਡੇ ABHA ID ਨਾਲ ਜੁੜਿਆ, ਸਹਿਮਤੀ-ਅਧਾਰਿਤ, ਅਤੇ ਮੁਲਾਕਾਤ ਤੋਂ ਬਾਅਦ ਡਾਟਾ ਤੁਰੰਤ ਹਟਾ ਦਿੱਤਾ ਜਾਂਦਾ ਹੈ।" },
      ],
    },
    physician: { heading: "ਕੀ ਤੁਸੀਂ ਡਾਕਟਰ ਹੋ?", sub: "ਮਰੀਜ਼ ਦੇ ਕਮਰੇ ਵਿੱਚ ਆਉਂਦੇ ਹੀ ਵਿਵਸਥਿਤ ਇਤਿਹਾਸ ਦੇਖੋ।", cta: "ਡਾਕਟਰ ਲਾਗਇਨ →" },
    footer: { tagline: "ਸਮਾਰਟ ਇੰਡੀਆ ਹੈਕਾਥਾਨ 2026 · ਏਆਈ ਕਲੀਨਿਕਲ ਹਿਸਟਰੀ ਪਲੇਟਫਾਰਮ" },
    gate: { title: "ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ", subtitle: "ਤੁਸੀਂ ਕਿਹੜੀ ਭਾਸ਼ਾ ਵਰਤਣੀ ਚਾਹੋਗੇ?", continue: "ਜਾਰੀ ਰੱਖੋ" },
  },
  ta: {
    nav: { howItWorks: "இது எப்படி செயல்படுகிறது", platform: "தளம்", forPhysicians: "மருத்துவர்களுக்கு", startIntake: "தொடங்கவும்" },
    hero: {
      eyebrow: "ஆலோசனைக்கு முன், AI மூலம் நோயாளியின் வரலாறு",
      headline1: "மருத்துவருடன் இரண்டு நிமிடங்களுக்கு",
      headlineEm: "பத்து நிமிடங்கள்",
      headline2: "கேட்பது அவசியம்.",
      sub: "மெடிகியோஸ்க் நோயாளியின் சொந்த மொழியில் கேட்கிறது, பழைய மருந்துச் சீட்டுகளைப் படிக்கிறது, மற்றும் ஆலோசனைக்கு முன் மருத்துவருக்கு முழுமையான, ஒழுங்கமைக்கப்பட்ட வரலாற்றை அளிக்கிறது.",
      ctaStart: "நோயாளி விவரங்களைத் தொடங்கவும்",
      ctaPhysician: "மருத்துவர் உள்நுழைவு",
      trust: "ABDM-க்காக உருவாக்கப்பட்டது · தமிழ், இந்தி, ஆங்கிலம் மற்றும் பிராந்திய மொழிகள் · DPDP சட்டம் 2023 இணக்கம்",
    },
    stats: {
      kicker: "இது ஏன் முக்கியம்",
      heading: "இந்திய மருத்துவமனைகளில் திறமையான மருத்துவர்கள் குறைவில்லை. கேட்க நேரம் குறைவே.",
      items: [
        { value: "2–5 நிமிடம்", label: "சராசரி OPD ஆலோசனை நேரம்" },
        { value: "4,000–10,000", label: "பெரிய மருத்துவமனைகளில் தினசரி நோயாளிகள்" },
        { value: "70–80%", label: "வரலாறு மட்டுமே வெளிப்படுத்தும் நோயறிதல்கள்" },
      ],
    },
    journey: {
      kicker: "நோயாளியின் பயணம்",
      heading: "மருத்துவரை சந்திப்பதற்கு முன் ஐந்து படிகள் நிறைவடைகின்றன.",
      steps: [
        { n: "01", title: "அடையாளம்", body: "உங்கள் ABHA ID அல்லது ஆதாரை ஸ்கேன் செய்யவும், மொழியைத் தேர்ந்தெடுக்கவும், ஒப்புதல் அளிக்கவும்." },
        { n: "02", title: "உரையாடல்", body: "பேசி அல்லது தொட்டு கேள்விகளுக்கு பதிலளிக்கவும். அவசர அறிகுறிகள் உடனே கவனிக்கப்படும்." },
        { n: "03", title: "ஸ்கேன்", body: "பழைய மருந்துச் சீட்டுகள் மற்றும் அறிக்கைகளை பதிவேற்றவும். நாங்கள் அவற்றைப் படித்து ஒழுங்கமைக்கிறோம்." },
        { n: "04", title: "சுருக்கம்", body: "உங்கள் வரலாறு தயாராகி மருத்துவரின் அமைப்பிற்கு தானாக அனுப்பப்படுகிறது." },
        { n: "05", title: "ஆலோசனை", body: "மருத்துவருக்கு உங்கள் வரலாறு ஏற்கனவே தெரியும் — சந்திப்பு பரிசோதனைக்காகவே." },
      ],
    },
    features: {
      kicker: "தளம்",
      heading: "மருத்துவருக்குத் தேவையானது ஏற்கனவே திரையில் உள்ளது.",
      items: [
        { title: "உங்கள் மொழியில் பேசுகிறது", body: "பேசி அல்லது தொட்டு, தமிழ், இந்தி, ஆங்கிலம் அல்லது பிராந்திய மொழியில்." },
        { title: "பழைய மருந்துச் சீட்டுகளைப் படிக்கிறது", body: "உங்கள் பழைய மருந்துச் சீட்டுகள், அறிக்கைகள் மற்றும் டிஸ்சார்ஜ் ஆவணங்களை ஒழுங்கமைக்கிறோம்." },
        { title: "மருத்துவருக்கு தயாரான சுருக்கத்தை அளிக்கிறது", body: "மருத்துவரின் மதிப்பாய்வுக்குத் தயாரான முழுமையான வரலாறு." },
        { title: "வடிவமைப்பிலேயே பாதுகாப்பு", body: "உங்கள் ABHA ID உடன் இணைக்கப்பட்டது, ஒப்புதல் அடிப்படையிலானது." },
      ],
    },
    physician: { heading: "நீங்கள் ஒரு மருத்துவரா?", sub: "நோயாளி அறைக்குள் நுழையும் தருணத்திலேயே வரலாற்றைப் பாருங்கள்.", cta: "மருத்துவர் உள்நுழைவு →" },
    footer: { tagline: "ஸ்மார்ட் இந்தியா ஹேக்கத்தான் 2026 · AI மருத்துவ வரலாறு தளம்" },
    gate: { title: "உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்", subtitle: "நீங்கள் எந்த மொழியைப் பயன்படுத்த விரும்புகிறீர்கள்?", continue: "தொடரவும்" },
  },
  bn: {
    nav: { howItWorks: "এটি কীভাবে কাজ করে", platform: "প্ল্যাটফর্ম", forPhysicians: "চিকিৎসকদের জন্য", startIntake: "শুরু করুন" },
    hero: {
      eyebrow: "পরামর্শের আগে, AI দ্বারা রোগীর ইতিহাস",
      headline1: "ডাক্তারের সাথে দুই মিনিটের জন্য",
      headlineEm: "দশ মিনিট",
      headline2: "শোনা প্রয়োজন।",
      sub: "মেডিকিয়স্ক রোগীর কথা তাদের নিজের ভাষায় শোনে, পুরনো প্রেসক্রিপশন পড়ে, এবং পরামর্শের আগে ডাক্তারকে সম্পূর্ণ, সুবিন্যস্ত ইতিহাস দেয়।",
      ctaStart: "রোগীর তথ্য শুরু করুন",
      ctaPhysician: "চিকিৎসক লগইন",
      trust: "ABDM-এর জন্য তৈরি · বাংলা, হিন্দি, ইংরেজি ও আঞ্চলিক ভাষা · DPDP আইন 2023 অনুসারে",
    },
    stats: {
      kicker: "এটি কেন গুরুত্বপূর্ণ",
      heading: "ভারতের হাসপাতালে দক্ষ ডাক্তারের অভাব নেই। শোনার সময়ের অভাব আছে।",
      items: [
        { value: "２–৫ মিনিট", label: "গড় OPD পরামর্শের সময়" },
        { value: "4,000–10,000", label: "বড় হাসপাতালে প্রতিদিনের রোগী" },
        { value: "70–80%", label: "শুধু ইতিহাস থেকে জানা যায় এমন রোগ নির্ণয়" },
      ],
    },
    journey: {
      kicker: "রোগীর যাত্রা",
      heading: "ডাক্তারের সাথে দেখা করার আগে পাঁচটি ধাপ সম্পন্ন হয়।",
      steps: [
        { n: "01", title: "পরিচয়", body: "আপনার ABHA ID বা আধার স্ক্যান করুন, ভাষা বেছে নিন, এবং সম্মতি দিন — সবকিছু অডিও দ্বারা পরিচালিত।" },
        { n: "02", title: "কথোপকথন", body: "বলে বা স্পর্শ করে প্রশ্নের উত্তর দিন। জরুরি লক্ষণগুলিতে তাৎক্ষণিক মনোযোগ দেওয়া হবে।" },
        { n: "03", title: "স্ক্যান", body: "পুরনো প্রেসক্রিপশন ও রিপোর্ট আপলোড করুন। আমরা সেগুলো পড়ে সাজিয়ে দিই।" },
        { n: "04", title: "সারসংক্ষেপ", body: "আপনার ইতিহাস তৈরি হয়ে ডাক্তারের সিস্টেমে নিজে থেকেই পাঠানো হয়।" },
        { n: "05", title: "পরামর্শ", body: "ডাক্তার আগে থেকেই আপনার ইতিহাস জানেন — সাক্ষাৎ পরীক্ষার জন্য, পুনরাবৃত্তির জন্য নয়।" },
      ],
    },
    features: {
      kicker: "প্ল্যাটফর্ম",
      heading: "ডাক্তারের যা প্রয়োজন, তা আগে থেকেই স্ক্রিনে আছে।",
      items: [
        { title: "আপনার ভাষায় কথা বলে", body: "বলে বা স্পর্শ করে, বাংলা, হিন্দি, ইংরেজি বা আঞ্চলিক ভাষায়।" },
        { title: "পুরনো প্রেসক্রিপশন পড়ে", body: "আমরা আপনার পুরনো প্রেসক্রিপশন, রিপোর্ট ও ডিসচার্জ কাগজপত্র একসাথে সাজাই।" },
        { title: "ডাক্তারকে প্রস্তুত সারসংক্ষেপ দেয়", body: "সম্পূর্ণ, সুবিন্যস্ত ইতিহাস, ডাক্তারের পর্যালোচনার জন্য প্রস্তুত।" },
        { title: "নকশাতেই নিরাপত্তা", body: "আপনার ABHA ID-এর সাথে যুক্ত, সম্মতি-ভিত্তিক, এবং সাক্ষাতের পর তথ্য মুছে ফেলা হয়।" },
      ],
    },
    physician: { heading: "আপনি কি একজন চিকিৎসক?", sub: "রোগী ঘরে প্রবেশ করার সাথে সাথেই সুবিন্যস্ত ইতিহাস দেখুন।", cta: "চিকিৎসক লগইন →" },
    footer: { tagline: "স্মার্ট ইন্ডিয়া হ্যাকাথন 2026 · AI ক্লিনিক্যাল হিস্ট্রি প্ল্যাটফর্ম" },
    gate: { title: "আপনার ভাষা বেছে নিন", subtitle: "আপনি কোন ভাষা ব্যবহার করতে চান?", continue: "চালিয়ে যান" },
  },
};