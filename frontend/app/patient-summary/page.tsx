"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function PatientSummaryPage() {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Try checking local storage keys where the summary might be cached
    const localSummary =
      localStorage.getItem("ai_summary") ||
      localStorage.getItem("medikiosk_summary") ||
      localStorage.getItem("patient_summary") ||
      localStorage.getItem("summary");

    if (localSummary) {
      setSummary(localSummary);
      setLoading(false);
      return;
    }

    // 2. If not found in localStorage, attempt fetching from backend using stored patient ID
    const patientId = localStorage.getItem("patient_id") || localStorage.getItem("patientId");

    if (patientId) {
      fetch(`${BACKEND_URL}/api/patient/summary?patient_id=${patientId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.summary) {
            setSummary(data.summary);
          }
        })
        .catch((err) => console.error("Error fetching summary:", err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#10241F] px-6 py-12 text-[#F3ECDA]">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/patient-home"
            className="text-sm font-medium text-[#B9CFC4] hover:text-[#F3ECDA]"
          >
            ← Back to Home
          </Link>
          <span className="rounded-full bg-[#E9A23F]/20 px-3 py-1 text-xs font-semibold text-[#E9A23F]">
            Temporary Summary Preview
          </span>
        </div>

        <div className="rounded-2xl border border-[#B9CFC4]/15 bg-[#17332B] p-8 shadow-2xl">
          <h1 className="text-2xl font-semibold text-[#F3ECDA]">AI Visit Summary</h1>
          <p className="mt-1 text-sm text-[#B9CFC4]">
            Saved content retrieved from your recent AI chat session.
          </p>

          <div className="mt-6 rounded-xl border border-[#B9CFC4]/20 bg-[#10241F] p-6 text-sm leading-relaxed text-[#F3ECDA]/90">
            {loading ? (
              <p className="text-center text-[#B9CFC4]">Loading summary...</p>
            ) : summary ? (
              <div className="whitespace-pre-wrap">{summary}</div>
            ) : (
              <div className="py-6 text-center text-[#B9CFC4]">
                <p className="font-medium text-[#F3ECDA]">No summary found in storage or backend.</p>
                <p className="mt-2 text-xs text-[#B9CFC4]/70">
                  Ensure your AI chat explicitly saves the summary string to 
                  <code className="mx-1 rounded bg-[#17332B] px-1.5 py-0.5 text-[#E9A23F]">localStorage.setItem("ai_summary", text)</code>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}