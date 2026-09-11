"use client";

import { useEffect, useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

type Priority = "high" | "medium" | "low";

type PatientListItem = {
  patient_id: number;
  full_name: string;
  age: number | null;
  gender: string;
  preferred_lang: string;
  chief_complaint: string | null;
  priority: Priority;
  updated_at: string;
};

type Document = {
  document_id: number;
  doc_type: string;
  document_date: string | null;
  uploaded_at: string;
};

type StructuredSummary = {
  chief_complaint: string | null;
  history_of_present_illness: string | null;
  symptoms: string[];
  onset_duration: string | null;
  severity: string | null;
  current_medications: { name: string; dosage: string | null; frequency: string | null }[];
  past_medical_history: string[];
  abnormal_lab_findings: { test_name: string; value: string; reference_range: string | null }[];
  allergies: string[];
  red_flags: string[];
  physician_notes: string | null;
};

type PatientDetail = {
  patient: any;
  priority: Priority | null;
  chief_complaint: string | null;
  structured_summary: StructuredSummary | null;
  documents: Document[];
};

const PRIORITY_STYLES: Record<Priority, string> = {
  high: "bg-red-950/80 border border-red-800 text-red-300",
  medium: "bg-amber-950/80 border border-amber-800 text-amber-300",
  low: "bg-[#25352E] border border-[#2F6F63]/50 text-[#69D9BD]",
};
const PRIORITY_LABEL: Record<Priority, string> = { high: "High Priority", medium: "Medium Priority", low: "Low Priority" };

export default function PhysicianDashboard() {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [filter, setFilter] = useState<"all" | Priority>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [consultationOpen, setConsultationOpen] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
    setLoadingList(true);
    setListError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/physician/patients`);
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText} — ${body || "no response body"}`);
      }
      const data = await res.json();
      setPatients(data);
      setSelectedId((prev) => (prev === null && data.length > 0 ? data[0].patient_id : prev));
    } catch (err: any) {
      console.error("Failed to load physician patient queue:", err);
      setListError(err?.message || "Failed to load patient queue.");
      setPatients([]);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    if (selectedId === null) return;
    setLoadingDetail(true);
    setDetailError(null);
    setConsultationOpen(false);
    fetch(`${BACKEND_URL}/api/physician/patients/${selectedId}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`${res.status} ${res.statusText} — ${body || "no response body"}`);
        }
        return res.json();
      })
      .then(setDetail)
      .catch((err: any) => {
        console.error("Failed to load patient detail:", err);
        setDetailError(err?.message || "Failed to load patient detail.");
        setDetail(null);
      })
      .finally(() => setLoadingDetail(false));
  }, [selectedId]);

  function viewDocument(documentId: number) {
    window.open(`${BACKEND_URL}/api/physician/documents/${documentId}/file`, "_blank");
  }

  const filteredPatients = filter === "all" ? patients : patients.filter((p) => p.priority === filter);

  return (
    <div className="min-h-screen bg-[#0E1411] text-[#E4EAE6] p-6 font-sans">
      {/* Top Header */}
      <header className="bg-[#1C2420] border border-[#2D3A34] p-5 rounded-xl shadow-md mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
              filter === "all" ? "bg-[#2F6F63] text-white" : "bg-[#141A17] text-[#94A39A] border border-[#2D3A34] hover:bg-[#242F2A]"
            }`}
          >
            All Patients ({patients.length})
          </button>
          <button
            onClick={() => setFilter("high")}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
              filter === "high" ? "bg-red-800 text-white" : "bg-[#141A17] text-[#94A39A] border border-[#2D3A34] hover:bg-[#242F2A]"
            }`}
          >
            High Priority
          </button>
          <button
            onClick={() => setFilter("medium")}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
              filter === "medium" ? "bg-amber-700 text-white" : "bg-[#141A17] text-[#94A39A] border border-[#2D3A34] hover:bg-[#242F2A]"
            }`}
          >
            Medium Priority
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Queue */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-[#B2C0B8]">Incoming Patient Queue</h2>
          </div>

          {loadingList ? (
            <p className="text-sm text-[#7A8C82]">Loading…</p>
          ) : listError ? (
            <div className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
              <p className="font-semibold">Couldn't load the patient queue.</p>
              <p className="mt-1 text-red-300/80">{listError}</p>
              <button
                onClick={loadPatients}
                className="mt-3 rounded-lg border border-red-700 px-3 py-1.5 text-xs font-semibold hover:bg-red-900/40"
              >
                Retry
              </button>
            </div>
          ) : filteredPatients.length === 0 ? (
            <p className="text-sm text-[#7A8C82]">No patients with a completed summary yet.</p>
          ) : (
            filteredPatients.map((p) => (
              <div
                key={p.patient_id}
                onClick={() => setSelectedId(p.patient_id)}
                className={`p-4 rounded-xl cursor-pointer shadow-sm transition ${
                  selectedId === p.patient_id
                    ? "border border-[#2F6F63] bg-[#17221D] shadow-md"
                    : "border border-[#2D3A34] bg-[#1C2420] hover:border-[#3E4E46]"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white">{p.full_name}</h3>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PRIORITY_STYLES[p.priority]}`}>
                    {PRIORITY_LABEL[p.priority]}
                  </span>
                </div>
                <p className="text-sm text-[#B2C0B8] line-clamp-1">
                  <strong className="text-white">Chief Complaint:</strong> {p.chief_complaint || "Not stated"}
                </p>
                <div className="mt-3 text-xs text-[#7A8C82] flex justify-between border-t border-[#25322C] pt-2">
                  <span>Lang: {p.preferred_lang?.toUpperCase() || "—"}</span>
                  <span>{new Date(p.updated_at).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right: Details Panel */}
        <div className="md:col-span-2 bg-[#1C2420] p-6 rounded-xl shadow-md border border-[#2D3A34]">
          {loadingDetail ? (
            <p className="text-sm text-[#7A8C82]">Loading patient details…</p>
          ) : detailError ? (
            <div className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
              <p className="font-semibold">Couldn't load this patient's details.</p>
              <p className="mt-1 text-red-300/80">{detailError}</p>
            </div>
          ) : !detail ? (
            <p className="text-sm text-[#7A8C82]">Select a patient from the queue.</p>
          ) : (
            <>
              <div className="border-b border-[#2D3A34] pb-4 mb-5 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">{detail.patient.full_name}</h2>
                  <p className="text-sm text-[#94A39A]">
                    ID: #{detail.patient.patient_id} • {detail.patient.age ?? "—"} yrs / {detail.patient.gender}
                  </p>
                </div>
                {detail.priority && (
                  <span className={`px-3 py-1 rounded-lg text-sm font-medium ${PRIORITY_STYLES[detail.priority]}`}>
                    {PRIORITY_LABEL[detail.priority]}
                  </span>
                )}
              </div>

              {!detail.structured_summary ? (
                <p className="text-sm text-[#7A8C82]">This patient hasn't generated a final summary yet.</p>
              ) : (
                <div className="space-y-5">
                  {detail.structured_summary.red_flags?.length > 0 && (
                    <div className="rounded-lg border border-red-800 bg-red-950/40 p-4">
                      <h3 className="text-xs font-bold text-red-300 uppercase tracking-wider">⚠ Priority Flags</h3>
                      <ul className="mt-2 space-y-1 text-sm text-red-200">
                        {detail.structured_summary.red_flags.map((f, i) => (
                          <li key={i}>⚠ {f}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <h3 className="text-xs font-bold text-[#7A8C82] uppercase tracking-wider">Chief Complaint</h3>
                    <p className="text-lg text-white font-medium mt-1">
                      {detail.structured_summary.chief_complaint || "Not stated"}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-[#7A8C82] uppercase tracking-wider">History of Present Illness</h3>
                    <div className="mt-2 p-4 bg-[#141A17] rounded-lg border border-[#2D3A34] text-[#C4D1C9]">
                      {detail.structured_summary.history_of_present_illness || "Not elicited"}
                    </div>
                  </div>

                  {detail.structured_summary.symptoms?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-[#7A8C82] uppercase tracking-wider">Reported Symptoms</h3>
                      <ul className="mt-2 list-disc pl-5 text-sm text-[#C4D1C9] space-y-1">
                        {detail.structured_summary.symptoms.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {detail.structured_summary.current_medications?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-[#7A8C82] uppercase tracking-wider">Current Medications</h3>
                      <div className="mt-2 overflow-hidden rounded-lg border border-[#2D3A34]">
                        <table className="w-full text-sm">
                          <thead className="bg-[#141A17] text-[#7A8C82]">
                            <tr>
                              <th className="px-3 py-2 text-left">Name</th>
                              <th className="px-3 py-2 text-left">Dosage</th>
                              <th className="px-3 py-2 text-left">Frequency</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detail.structured_summary.current_medications.map((m, i) => (
                              <tr key={i} className="border-t border-[#2D3A34] text-[#C4D1C9]">
                                <td className="px-3 py-2">{m.name}</td>
                                <td className="px-3 py-2">{m.dosage || "—"}</td>
                                <td className="px-3 py-2">{m.frequency || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {detail.structured_summary.abnormal_lab_findings?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-red-300 uppercase tracking-wider">Abnormal Lab Findings</h3>
                      <div className="mt-2 overflow-hidden rounded-lg border border-red-900">
                        <table className="w-full text-sm">
                          <thead className="bg-red-950/60 text-red-200">
                            <tr>
                              <th className="px-3 py-2 text-left">Test</th>
                              <th className="px-3 py-2 text-left">Value</th>
                              <th className="px-3 py-2 text-left">Reference</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detail.structured_summary.abnormal_lab_findings.map((l, i) => (
                              <tr key={i} className="border-t border-red-900/50 text-[#C4D1C9]">
                                <td className="px-3 py-2">{l.test_name}</td>
                                <td className="px-3 py-2">{l.value}</td>
                                <td className="px-3 py-2">{l.reference_range || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {detail.structured_summary.allergies?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-[#7A8C82] uppercase tracking-wider">Allergies</h3>
                      <p className="mt-1 text-sm text-[#C4D1C9]">{detail.structured_summary.allergies.join(", ")}</p>
                    </div>
                  )}

                  {/* Documents */}
                  <div>
                    <h3 className="text-xs font-bold text-[#7A8C82] uppercase tracking-wider">Uploaded Documents</h3>
                    {detail.documents.length === 0 ? (
                      <p className="mt-2 text-sm text-[#7A8C82]">No documents uploaded.</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {detail.documents.map((d) => (
                          <div
                            key={d.document_id}
                            className="flex items-center justify-between rounded-lg border border-[#2D3A34] bg-[#141A17] px-4 py-2.5"
                          >
                            <span className="text-sm text-[#C4D1C9] capitalize">{d.doc_type.replace("_", " ")}</span>
                            <button
                              onClick={() => viewDocument(d.document_id)}
                              className="text-xs font-semibold text-[#69D9BD] hover:underline"
                            >
                              View →
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 flex gap-3 border-t border-[#2D3A34]">
                    <button
                      onClick={() => setConsultationOpen(true)}
                      className="px-5 py-2.5 bg-[#E9A23F] text-black font-semibold rounded-lg hover:bg-[#d49133] transition"
                    >
                      Start Consultation
                    </button>
                    <button className="px-5 py-2.5 bg-[#25322C] text-[#E4EAE6] font-medium rounded-lg hover:bg-[#2D3A34] transition">
                      Request Follow-Up
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Consultation modal — full detail with inline document previews */}
      {consultationOpen && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#2D3A34] bg-[#1C2420] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2D3A34] px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-white">Consultation — {detail.patient.full_name}</h2>
                <p className="text-xs text-[#94A39A]">
                  ID: #{detail.patient.patient_id} • {detail.patient.age ?? "—"} yrs / {detail.patient.gender}
                  {detail.priority && (
                    <span className={`ml-2 rounded px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[detail.priority]}`}>
                      {PRIORITY_LABEL[detail.priority]}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => setConsultationOpen(false)}
                className="rounded-lg border border-[#2D3A34] px-3 py-1.5 text-sm text-[#94A39A] hover:bg-[#242F2A]"
              >
                Close ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {detail.structured_summary?.red_flags && detail.structured_summary.red_flags.length > 0 && (
                <div className="rounded-lg border border-red-800 bg-red-950/40 p-4">
                  <h3 className="text-xs font-bold text-red-300 uppercase tracking-wider">⚠ Priority Flags</h3>
                  <ul className="mt-2 space-y-1 text-sm text-red-200">
                    {detail.structured_summary.red_flags.map((f, i) => (
                      <li key={i}>⚠ {f}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="text-xs font-bold text-[#7A8C82] uppercase tracking-wider">Chief Complaint</h3>
                <p className="mt-1 text-lg font-medium text-white">
                  {detail.structured_summary?.chief_complaint || detail.chief_complaint || "Not stated"}
                </p>
              </div>

              {detail.structured_summary?.history_of_present_illness && (
                <div>
                  <h3 className="text-xs font-bold text-[#7A8C82] uppercase tracking-wider">History of Present Illness</h3>
                  <div className="mt-2 rounded-lg border border-[#2D3A34] bg-[#141A17] p-4 text-[#C4D1C9]">
                    {detail.structured_summary.history_of_present_illness}
                  </div>
                </div>
              )}

              {/* Uploaded documents — the whole reason this modal exists */}
              <div>
                <h3 className="text-xs font-bold text-[#7A8C82] uppercase tracking-wider">
                  Uploaded Documents ({detail.documents.length})
                </h3>
                {detail.documents.length === 0 ? (
                  <p className="mt-2 text-sm text-[#7A8C82]">No documents uploaded.</p>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {detail.documents.map((d) => (
                      <button
                        key={d.document_id}
                        onClick={() => viewDocument(d.document_id)}
                        className="group flex flex-col overflow-hidden rounded-lg border border-[#2D3A34] bg-[#141A17] text-left transition hover:border-[#2F6F63]"
                      >
                        <div className="flex h-28 items-center justify-center overflow-hidden bg-[#0E1411]">
                          <img
                            src={`${BACKEND_URL}/api/physician/documents/${d.document_id}/file`}
                            alt={d.doc_type}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                              const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement | null;
                              if (fallback) fallback.style.display = "flex";
                            }}
                          />
                          <div className="hidden h-full w-full items-center justify-center text-3xl text-[#3E4E46]">
                            📄
                          </div>
                        </div>
                        <div className="flex items-center justify-between px-3 py-2">
                          <span className="text-xs font-medium capitalize text-[#C4D1C9]">
                            {d.doc_type.replace("_", " ")}
                          </span>
                          <span className="text-xs text-[#69D9BD] opacity-0 transition group-hover:opacity-100">
                            Open →
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {detail.structured_summary?.current_medications && detail.structured_summary.current_medications.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-[#7A8C82] uppercase tracking-wider">Current Medications</h3>
                  <ul className="mt-2 list-disc pl-5 text-sm text-[#C4D1C9] space-y-1">
                    {detail.structured_summary.current_medications.map((m, i) => (
                      <li key={i}>
                        {m.name}
                        {m.dosage ? ` — ${m.dosage}` : ""}
                        {m.frequency ? ` (${m.frequency})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-[#2D3A34] px-6 py-4">
              <button
                onClick={() => setConsultationOpen(false)}
                className="rounded-lg border border-[#2D3A34] px-5 py-2.5 text-sm font-medium text-[#E4EAE6] hover:bg-[#242F2A]"
              >
                End Consultation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}