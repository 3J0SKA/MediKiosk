const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export type Patient = {
  patient_id: number;
  abha_id: string;
  full_name: string;
  age: number | null;
  gender: string;
  phone: string | null;
  preferred_lang: string;
};

export function saveSession(token: string, patient: Patient) {
  localStorage.setItem("medikiosk-token", token);
  localStorage.setItem("medikiosk-patient", JSON.stringify(patient));
  // Fresh login → the audio tour should be offered again this session
  localStorage.removeItem("medikiosk-tour-dismissed");
}

export function getToken(): string | null {
  return localStorage.getItem("medikiosk-token");
}

export function getPatient(): Patient | null {
  const raw = localStorage.getItem("medikiosk-patient");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem("medikiosk-token");
  localStorage.removeItem("medikiosk-patient");
  localStorage.removeItem("medikiosk-tour-dismissed");
}

export async function authFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${BACKEND_URL}${path}`, { ...options, headers });
}