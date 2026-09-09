"use client";

import { useEffect, useState } from "react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Read stored session
    const patientId = localStorage.getItem("patient_id");
    const patientIdCamel = localStorage.getItem("patientId");
    const sessionToken = patientId || patientIdCamel;

    console.log("🔍 Checking Auth status...");
    console.log("Stored patient_id:", sessionToken);

    if (!sessionToken || sessionToken === "undefined" || sessionToken === "null") {
      console.warn("❌ No valid session found in localStorage! Redirecting to login...");
      // Delay redirect by 1.5s so you can inspect the console log
      const timer = setTimeout(() => {
        window.location.replace("/");
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      console.log("✅ Session verified for user:", sessionToken);
      setIsAuthenticated(true);
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#F3ECDA] text-[#1C2420]">
        <div className="text-sm font-medium text-[#1C2420]/60 animate-pulse">
          Securing session... (Open F12 Console to inspect)
        </div>
      </main>
    );
  }

  return <>{children}</>;
}