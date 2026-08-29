"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PhysicianLogin() {
  const [step, setStep] = useState<'id' | 'otp'>('id');
  const [doctorId, setDoctorId] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  // Demo Doctor ID to match against
  const DEMO_DOCTOR_ID = "12-345-678";

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Keep input clean and capitalize letters if typed
    setDoctorId(e.target.value.toUpperCase());
  };

  const handleIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Regex matching XX-XXX-XXX format (letters or numbers)
    const idPattern = /^[A-Z0-9]{2}-[A-Z0-9]{3}-[A-Z0-9]{3}$/;

    if (doctorId.trim() === DEMO_DOCTOR_ID) {
      setError('');
      setStep('otp');
    } else if (!idPattern.test(doctorId.trim())) {
      setError('Invalid format. Please use format: XX-XXX-XXX (e.g., 12-345-678)');
    } else {
      setError(`Doctor ID not found. Use Demo ID: ${DEMO_DOCTOR_ID}`);
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length === 4) {
      setError('');
      router.push('/physician-dashboard');
    } else {
      setError('Please enter a 4-digit OTP (e.g., 5555)');
    }
  };

  return (
    <div className="min-h-screen bg-[#0E1411] text-[#E4EAE6] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-[#1C2420] border border-[#2D3A34] p-8 rounded-2xl shadow-xl">
        
        {/* Header Branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Medi<span className="text-[#E9A23F]">Kiosk</span>
          </h1>
          <p className="text-sm text-[#94A39A] mt-2">
            {step === 'id' ? 'Physician Portal Access' : 'Two-Factor Verification'}
          </p>
        </div>

        {/* Step 1: Physician ID Form */}
        {step === 'id' && (
          <form onSubmit={handleIdSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-[#7A8C82] uppercase tracking-wider mb-2">
                Physician License ID (XX-XXX-XXX)
              </label>
              <input
                type="text"
                value={doctorId}
                onChange={handleIdChange}
                placeholder="e.g. 12-345-678"
                maxLength={10}
                className="w-full px-4 py-3 rounded-xl bg-[#141A17] border border-[#2D3A34] text-white focus:outline-none focus:border-[#2F6F63] font-mono tracking-wide transition uppercase"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-950/50 border border-red-800 p-3 rounded-lg text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-[#E9A23F] text-black font-semibold rounded-xl hover:bg-[#d49133] transition shadow-md"
            >
              Get Authentication OTP
            </button>
          </form>
        )}

        {/* Step 2: Fake OTP Verification Form */}
        {step === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-5">
            <div className="p-3 bg-[#141A17] border border-[#2D3A34] rounded-lg text-xs text-[#94A39A]">
              OTP sent to registered mobile linked with ID: <span className="text-white font-mono font-bold">{doctorId}</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#7A8C82] uppercase tracking-wider mb-2">
                Enter 4-Digit OTP
              </label>
              <input
                type="text"
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="e.g. 5555"
                className="w-full px-4 py-3 text-center text-xl tracking-widest font-mono rounded-xl bg-[#141A17] border border-[#2D3A34] text-white focus:outline-none focus:border-[#2F6F63] transition"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-950/50 border border-red-800 p-3 rounded-lg text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-[#E9A23F] text-black font-semibold rounded-xl hover:bg-[#d49133] transition shadow-md"
            >
              Verify & Enter Dashboard
            </button>

            <button
              type="button"
              onClick={() => { setStep('id'); setError(''); }}
              className="w-full text-xs text-[#7A8C82] hover:text-white transition text-center"
            >
              ← Back to ID Login
            </button>
          </form>
        )}

        {/* Demo Credentials Footer */}
        <div className="mt-6 pt-6 border-t border-[#2D3A34] text-center">
          <p className="text-xs text-[#7A8C82]">
            <strong>Demo ID:</strong> <span className="text-[#69D9BD] font-mono font-bold">12-345-678</span> • Any 4-digit OTP works (e.g., <span className="text-[#69D9BD] font-mono font-bold">5555</span>)
          </p>
        </div>

      </div>
    </div>
  );
}