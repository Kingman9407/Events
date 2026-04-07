"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc } from "firebase/firestore";
import { db as firestoreDb } from "@/lib/firebase";
import { getSession, type UserSession } from "@/lib/auth";
import type { ParticipantField } from "@/lib/types";

// ── helpers ────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const DEFAULT_FIELDS: ParticipantField[] = [
  { id: uid(), label: "Full Name",           type: "text",   required: true  },
  { id: uid(), label: "Date of Birth",        type: "date",   required: true  },
  { id: uid(), label: "College / Profession", type: "text",   required: false },
];

// ── component ──────────────────────────────────────────────────
export default function CreateCompetitionPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [enableAbstractCheck, setEnableAbstractCheck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // participant fields state
  const [fields, setFields] = useState<ParticipantField[]>(DEFAULT_FIELDS);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<ParticipantField["type"]>("text");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const session = getSession();
    if (!session) {
      router.replace("/login");
    } else {
      setUser(session);
    }
  }, [router]);

  // ── field management ─────────────────────────────────────────
  const addField = () => {
    if (!newLabel.trim()) return;
    setFields((prev) => [
      ...prev,
      { id: uid(), label: newLabel.trim(), type: newType, required: false },
    ]);
    setNewLabel("");
    setNewType("text");
  };

  const removeField = (id: string) =>
    setFields((prev) => prev.filter((f) => f.id !== id));

  const toggleRequired = (id: string) =>
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, required: !f.required } : f))
    );

  const moveField = (id: string, dir: -1 | 1) => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  // ── create handler ───────────────────────────────────────────
  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Please provide a name for the event.");
      return;
    }
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      const docRef = await addDoc(collection(firestoreDb, "competitions"), {
        name: name.trim(),
        ownerEmail: user.email,
        isPublic,
        enableAbstractCheck,
        createdAt: Date.now(),
        participantFields: fields,
      });
      router.push(`/competitions/${docRef.id}`);
    } catch (err) {
      console.error(err);
      setError("Failed to create the event. Please try again.");
      setLoading(false);
    }
  };

  if (!user) return null;

  // ── render ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white px-4 py-12">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-900/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-2xl mx-auto space-y-6">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="text-white/40 hover:text-white text-sm flex items-center gap-2 transition-colors"
        >
          ← Back
        </button>

        {/* ── Card ── */}
        <div className="bg-[#111118] border border-white/10 rounded-3xl p-8 shadow-2xl space-y-8">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Create New Event</h1>
            <p className="text-white/40 text-sm mt-1">
              Configure your event and define what data you want to collect from participants.
            </p>
          </div>

          {/* ── Section 1: Event Details ── */}
          <section className="space-y-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-white/30">
              Event Details
            </h2>

            {/* Event name */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Event Name <span className="text-emerald-400">*</span>
              </label>
              <input
                id="event-name"
                type="text"
                placeholder="e.g. Hackathon 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            {/* Public toggle */}
            <div
              className="flex items-center gap-3 p-4 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:border-white/10 transition-colors"
              onClick={() => setIsPublic(!isPublic)}
            >
              <div
                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  isPublic ? "bg-emerald-500 border-emerald-500" : "border-white/20"
                }`}
              >
                {isPublic && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Make Event Public</p>
                <p className="text-xs text-white/40 mt-0.5">
                  Anyone can discover and join this event from the listing page.
                </p>
              </div>
            </div>

            {/* Abstract similarity check toggle */}
            <div
              className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                enableAbstractCheck
                  ? "bg-violet-500/8 border-violet-500/30 hover:border-violet-500/50"
                  : "bg-white/5 border-white/5 hover:border-white/10"
              }`}
              onClick={() => setEnableAbstractCheck(!enableAbstractCheck)}
            >
              <div
                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  enableAbstractCheck ? "bg-violet-500 border-violet-500" : "border-white/20"
                }`}
              >
                {enableAbstractCheck && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Enable Abstract Similarity Check</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-violet-500/15 text-violet-400 border border-violet-500/25 font-medium">AI</span>
                </div>
                <p className="text-xs text-white/40 mt-0.5">
                  Participants must submit a project abstract. Duplicates similar to existing entries will be automatically rejected.
                </p>
              </div>
            </div>
          </section>

          {/* ── Section 2: Participant Fields ── */}
          <section className="space-y-5">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-white/30">
                Participant Information
              </h2>
              <p className="text-white/40 text-xs mt-1">
                Fields below will be shown to participants when they register for this event.
              </p>
            </div>

            {/* Existing fields list */}
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="flex items-center gap-3 bg-white/5 border border-white/8 rounded-xl px-4 py-3 group hover:border-white/15 transition-colors"
                >
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => moveField(field.id, -1)}
                      disabled={idx === 0}
                      className="text-white/30 hover:text-white disabled:opacity-20 leading-none text-xs"
                      title="Move up"
                    >▲</button>
                    <button
                      onClick={() => moveField(field.id, 1)}
                      disabled={idx === fields.length - 1}
                      className="text-white/30 hover:text-white disabled:opacity-20 leading-none text-xs"
                      title="Move down"
                    >▼</button>
                  </div>

                  {/* Field type badge */}
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-900/30 text-emerald-400 border border-emerald-500/20 shrink-0 uppercase">
                    {field.type}
                  </span>

                  {/* Label */}
                  <span className="flex-1 text-sm text-white truncate">{field.label}</span>

                  {/* Required badge */}
                  <button
                    onClick={() => toggleRequired(field.id)}
                    title="Toggle required"
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors shrink-0 ${
                      field.required
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : "bg-white/5 border-white/10 text-white/30 hover:text-white/50"
                    }`}
                  >
                    {field.required ? "Required" : "Optional"}
                  </button>

                  {/* Remove */}
                  <button
                    onClick={() => removeField(field.id)}
                    className="text-white/20 hover:text-red-400 transition-colors text-sm shrink-0"
                    title="Remove field"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {fields.length === 0 && (
                <p className="text-center text-white/30 text-sm py-4">
                  No fields added yet. Add one below.
                </p>
              )}
            </div>

            {/* Add new field row */}
            <div className="border border-dashed border-white/10 rounded-xl p-4 space-y-3">
              <p className="text-xs text-white/40 font-medium">Add a new field</p>
              <div className="flex gap-2 flex-wrap">
                <input
                  id="new-field-label"
                  type="text"
                  placeholder="Field label (e.g. Phone Number)"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addField()}
                  className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
                <select
                  id="new-field-type"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as ParticipantField["type"])}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                >
                  <option value="text">Text</option>
                  <option value="date">Date</option>
                  <option value="select">Dropdown</option>
                </select>
                <button
                  id="add-field-btn"
                  onClick={addField}
                  disabled={!newLabel.trim()}
                  className="bg-emerald-600/80 hover:bg-emerald-600 disabled:opacity-30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  + Add
                </button>
              </div>
            </div>
          </section>

          {/* ── Error ── */}
          {error && (
            <p className="text-red-400 text-xs text-center">{error}</p>
          )}

          {/* ── Submit ── */}
          <button
            id="create-event-btn"
            onClick={handleCreate}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3.5 font-semibold transition-all shadow-lg shadow-emerald-900/30 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create Event"}
          </button>
        </div>
      </div>
    </div>
  );
}
