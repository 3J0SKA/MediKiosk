"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getToken, getPatient, clearSession, type Patient } from "./auth";

const IDLE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes of inactivity
const WARNING_BEFORE_MS = 30 * 1000; // show warning 30s before logout
const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"];

export function useRequireAuth() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [idleWarningVisible, setIdleWarningVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const lastActivityRef = useRef<number>(Date.now());

  const logout = useCallback(() => {
    clearSession();
    router.replace("/patient-login");
  }, [router]);

  const stayLoggedIn = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIdleWarningVisible(false);
  }, []);

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

  useEffect(() => {
    if (!ready) return;

    function markActive() {
      lastActivityRef.current = Date.now();
      setIdleWarningVisible(false);
    }
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, markActive));

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = IDLE_LIMIT_MS - elapsed;

      if (remaining <= 0) {
        clearInterval(interval);
        logout();
        return;
      }
      if (remaining <= WARNING_BEFORE_MS) {
        setIdleWarningVisible(true);
        setSecondsLeft(Math.ceil(remaining / 1000));
      }
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, markActive));
      clearInterval(interval);
    };
  }, [ready, logout]);

  return { patient, ready, logout, idleWarningVisible, secondsLeft, stayLoggedIn };
}