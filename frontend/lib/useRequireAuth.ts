"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, getPatient, clearSession, type Patient } from "./auth";

/**
 * Guards a patient-only page. Redirects to /patient-login if there's no
 * valid session. Returns { patient, ready } — render nothing (or a loader)
 * until `ready` is true, to avoid a flash of protected content.
 */
export function useRequireAuth() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);

  useEffect(() => {
    const token = getToken();
    const savedPatient = getPatient();

    if (!token || !savedPatient) {
      router.replace("/patient-login");
      return;
    }

    setPatient(savedPatient);
    setReady(true);
  }, [router]);

  return { patient, ready, logout: () => { clearSession(); router.replace("/patient-login"); } };
}