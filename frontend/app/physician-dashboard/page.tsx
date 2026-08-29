import React from 'react';

export default function PhysicianDashboard() {
  return (
    <div className="min-h-screen bg-[#0E1411] text-[#E4EAE6] p-6 font-sans">
      {/* Top Header with Doctor Profile */}
      <header className="bg-[#1C2420] border border-[#2D3A34] p-5 rounded-xl shadow-md mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        
        {/* Left Side: App Title & Doctor Info */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#2F6F63] flex items-center justify-center font-bold text-lg text-white border border-[#3E4E46]">
            RB
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Dr. Rajat Bhardwaj</h1>
              <span className="text-xs px-2 py-0.5 rounded bg-[#25352E] text-[#69D9BD] border border-[#2F6F63]/50 font-medium">
                MD Medicine
              </span>
            </div>
            <p className="text-xs text-[#94A39A] mt-0.5">
              MediKiosk Portal • License ID: <span className="font-mono text-[#C4D1C9]">12-345-678</span>
            </p>
          </div>
        </div>

        {/* Right Side: Quick Filters */}
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-1.5 text-sm rounded-lg bg-[#2F6F63] text-white font-medium hover:bg-[#26594F] transition">
            All Patients
          </button>
          <button className="px-3 py-1.5 text-sm rounded-lg bg-[#141A17] text-[#94A39A] border border-[#2D3A34] hover:bg-[#242F2A] transition">
            High Priority
          </button>
          <button className="px-3 py-1.5 text-sm rounded-lg bg-[#141A17] text-[#94A39A] border border-[#2D3A34] hover:bg-[#242F2A] transition">
            Medium Priority
          </button>
        </div>
      </header>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Queue Placeholder */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-[#B2C0B8]">Incoming Patient Queue</h2>
            <span className="text-xs text-[#7A8C82]">Dept: Internal Medicine</span>
          </div>
          
          <div className="p-4 rounded-xl border border-[#2F6F63] bg-[#17221D] cursor-pointer shadow-md">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-white">Patient Card Placeholder</h3>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-red-950/80 border border-red-800 text-red-300">
                High Priority
              </span>
            </div>
            <p className="text-sm text-[#B2C0B8] line-clamp-1">
              <strong className="text-white">Chief Complaint:</strong> Sample Complaint Text
            </p>
            <div className="mt-3 text-xs text-[#7A8C82] flex justify-between border-t border-[#25322C] pt-2">
              <span>Lang: Hindi</span>
              <span>Onset: 2 days</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[#2D3A34] bg-[#1C2420] cursor-pointer shadow-sm hover:border-[#3E4E46] transition">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-white">Patient Card Placeholder</h3>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-950/80 border border-amber-800 text-amber-300">
                Medium Priority
              </span>
            </div>
            <p className="text-sm text-[#B2C0B8] line-clamp-1">
              <strong className="text-white">Chief Complaint:</strong> Sample Complaint Text
            </p>
            <div className="mt-3 text-xs text-[#7A8C82] flex justify-between border-t border-[#25322C] pt-2">
              <span>Lang: English</span>
              <span>Onset: 1 day</span>
            </div>
          </div>
        </div>

        {/* Right Column: Details Panel */}
        <div className="md:col-span-2 bg-[#1C2420] p-6 rounded-xl shadow-md border border-[#2D3A34]">
          <div className="border-b border-[#2D3A34] pb-4 mb-5 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">Patient Details View</h2>
              <p className="text-sm text-[#94A39A]">ID: #0000 • Age / Gender Info</p>
            </div>
            <span className="px-3 py-1 bg-[#25352E] text-[#69D9BD] border border-[#2F6F63]/50 rounded-lg text-sm font-medium">
              Selected Language
            </span>
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-bold text-[#7A8C82] uppercase tracking-wider">Chief Complaint</h3>
              <p className="text-lg text-white font-medium mt-1">
                Static text for primary symptoms layout display.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-bold text-[#7A8C82] uppercase tracking-wider">AI Intake Clinical Summary</h3>
              <div className="mt-2 p-4 bg-[#141A17] rounded-lg border border-[#2D3A34] text-[#C4D1C9]">
                This area will render the summary output once connected to the backend intake model.
              </div>
            </div>

            <div className="pt-4 flex gap-3 border-t border-[#2D3A34]">
              <button className="px-5 py-2.5 bg-[#E9A23F] text-black font-semibold rounded-lg hover:bg-[#d49133] transition">
                Start Consultation
              </button>
              <button className="px-5 py-2.5 bg-[#25322C] text-[#E4EAE6] font-medium rounded-lg hover:bg-[#2D3A34] transition">
                Request Follow-Up
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}