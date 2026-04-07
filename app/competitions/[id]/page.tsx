"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  doc, getDoc, collection, addDoc, getDocs, query, where, deleteDoc,
} from "firebase/firestore";
import { db as firestoreDb } from "@/lib/firebase";
import { getSession, clearSession, type UserSession } from "@/lib/auth";
import type { Competition, ParticipantField, Participant, EventAbstract } from "@/lib/types";
import { scoreEntries, isEligibleToAdd, formatPercent } from "@/lib/similarity";

// ── helpers ────────────────────────────────────────────────────
type Tab = "overview" | "participants" | "checker";

function Badge({ children, color = "emerald" }: { children: React.ReactNode; color?: string }) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    amber:   "bg-amber-500/10  border-amber-500/30  text-amber-400",
    sky:     "bg-sky-500/10    border-sky-500/30    text-sky-400",
    rose:    "bg-rose-500/10   border-rose-500/30   text-rose-400",
    violet:  "bg-violet-500/10 border-violet-500/30 text-violet-400",
  };
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${map[color] ?? map.emerald}`}>
      {children}
    </span>
  );
}

// ── main component ─────────────────────────────────────────────
export default function EventManagementPage() {
  const router = useRouter();
  const params = useParams();
  const competitionId = params.id as string;

  const [user, setUser]               = useState<UserSession | null>(null);
  const [event, setEvent]             = useState<Competition | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [tab, setTab]                 = useState<Tab>("overview");

  // participants
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);

  // registration form
  const [formData, setFormData]       = useState<Record<string, string>>({});
  const [projectTitle, setProjectTitle] = useState("");
  const [projectAbstract, setProjectAbstract] = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [submitMsg, setSubmitMsg]     = useState<{ text: string; ok: boolean } | null>(null);

  // abstract similarity
  const [pipe, setPipe]               = useState<any>(null);
  const [pipeLoading, setPipeLoading] = useState(false);
  const [eventAbstracts, setEventAbstracts] = useState<EventAbstract[]>([]);
  const [simStatus, setSimStatus]     = useState<null | "checking" | "ok" | "blocked">(null);
  const [simMatch, setSimMatch]       = useState<{ title: string; abstractScore: number } | null>(null);
  const pipeLoadedRef                 = useRef(false);

  // copy
  const [copied, setCopied]           = useState(false);

  // ── auth + fetch event ───────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const session = getSession();
    if (!session) { router.replace("/login"); return; }
    setUser(session);

    (async () => {
      try {
        const snap = await getDoc(doc(firestoreDb, "competitions", competitionId));
        if (!snap.exists()) { router.replace("/competitions"); return; }
        setEvent({ id: snap.id, ...snap.data() } as Competition);
      } catch (e) {
        console.error(e);
        router.replace("/competitions");
      } finally {
        setLoadingEvent(false);
      }
    })();
  }, [competitionId, router]);

  // ── load AI model when participants tab opens (only if check enabled) ──
  useEffect(() => {
    if (tab !== "participants") return;
    if (!event?.enableAbstractCheck) return;
    if (pipeLoadedRef.current || pipeLoading) return;

    pipeLoadedRef.current = true;
    setPipeLoading(true);

    (async () => {
      try {
        const { pipeline, env } = await import("@xenova/transformers");
        env.allowLocalModels = false;
        env.useBrowserCache = true;
        const p = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
        setPipe(() => p);
      } catch (err) {
        console.error("Model load error:", err);
      } finally {
        setPipeLoading(false);
      }
    })();
  }, [tab, event?.enableAbstractCheck, pipeLoading]);

  // ── fetch event abstracts ─────────────────────────────────────
  const fetchEventAbstracts = useCallback(async () => {
    if (!event?.enableAbstractCheck) return;
    try {
      const q = query(
        collection(firestoreDb, "eventAbstracts"),
        where("competitionId", "==", competitionId)
      );
      const snap = await getDocs(q);
      setEventAbstracts(snap.docs.map(d => ({ id: d.id, ...d.data() } as EventAbstract)));
    } catch (e) {
      console.error("Error fetching event abstracts:", e);
    }
  }, [competitionId, event?.enableAbstractCheck]);

  useEffect(() => {
    if (event?.enableAbstractCheck) fetchEventAbstracts();
  }, [event?.enableAbstractCheck, fetchEventAbstracts]);

  // ── fetch participants when tab opens ────────────────────────
  const fetchParticipants = useCallback(async () => {
    setLoadingParts(true);
    try {
      const q = query(
        collection(firestoreDb, "participants"),
        where("competitionId", "==", competitionId)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Participant));
      list.sort((a, b) => b.submittedAt - a.submittedAt);
      setParticipants(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingParts(false);
    }
  }, [competitionId]);

  useEffect(() => {
    if (tab === "participants") fetchParticipants();
  }, [tab, fetchParticipants]);

  // ── check similarity ─────────────────────────────────────────
  const handleCheckSimilarity = async () => {
    if (!projectTitle.trim()) {
      setSubmitMsg({ text: "Project title is required.", ok: false });
      return;
    }
    if (!projectAbstract.trim()) {
      setSubmitMsg({ text: "Project abstract is required.", ok: false });
      return;
    }
    if (!pipe) {
      setSubmitMsg({ text: "AI model is still loading, please wait a moment.", ok: false });
      return;
    }

    setSubmitting(true);
    setSubmitMsg(null);
    setSimStatus("checking");

    try {
      const dbEntries = eventAbstracts.map(a => ({
        id: a.id,
        title: a.title,
        number: a.number,
        abstract: a.abstract,
      }));

      const scored = await scoreEntries(pipe, dbEntries, projectTitle, projectAbstract);
      const best   = scored[0];

      if (best && !isEligibleToAdd(true, scored)) {
        setSimStatus("blocked");
        setSimMatch({ title: best.title, abstractScore: best.abstractScore ?? 0 });
        setSubmitMsg({
          text: `⚠️ Similar project already exists! Abstract match: ${formatPercent(best.abstractScore)} with "${best.title}". Please revise your submission.`,
          ok: false,
        });
      } else {
        setSimStatus("ok");
        setSubmitMsg({ text: `✓ Abstract is unique. Safe to register.`, ok: true });
      }
    } catch (err) {
      console.error(err);
      setSubmitMsg({ text: "Similarity check failed. Please try again.", ok: false });
      setSimStatus(null);
    } finally {
      setSubmitting(false);
    }
  };

  // ── register participant ─────────────────────────────────────
  const handleRegister = async () => {
    if (!event?.participantFields) return;

    // Validate standard required fields
    for (const f of event.participantFields) {
      if (f.required && !formData[f.id]?.trim()) {
        setSubmitMsg({ text: `"${f.label}" is required.`, ok: false });
        return;
      }
    }

    // ── Abstract similarity check path ────────────────────────
    if (event.enableAbstractCheck) {
      if (simStatus !== "ok") {
        setSubmitMsg({ text: "Please pass the similarity check first.", ok: false });
        return;
      }

      setSubmitting(true);
      setSubmitMsg(null);

      try {
        await addDoc(collection(firestoreDb, "participants"), {
          competitionId,
          submittedAt: Date.now(),
          data: { ...formData, _projectTitle: projectTitle.trim() },
        });

        // Save abstract so future registrations are checked against it
        const nextNum = (eventAbstracts.length + 1).toString().padStart(3, "0");
        const newAbstractData = {
          competitionId,
          title: projectTitle.trim(),
          abstract: projectAbstract.trim(),
          number: `ABT-${nextNum}`,
          submittedAt: Date.now(),
        };
        const ref = await addDoc(collection(firestoreDb, "eventAbstracts"), newAbstractData);
        setEventAbstracts(prev => [...prev, { id: ref.id, ...newAbstractData }]);

        setSubmitMsg({ text: "Registration successful! 🎉", ok: true });
        setFormData({});
        setProjectTitle("");
        setProjectAbstract("");
        setSimStatus(null);
        setSimMatch(null);
        if (tab === "participants") fetchParticipants();
      } catch (err) {
        console.error(err);
        setSubmitMsg({ text: "Registration failed. Please try again.", ok: false });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // ── Normal registration (no abstract check) ───────────────
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      await addDoc(collection(firestoreDb, "participants"), {
        competitionId,
        submittedAt: Date.now(),
        data: formData,
      });
      setSubmitMsg({ text: "Registration successful! 🎉", ok: true });
      setFormData({});
      if (tab === "participants") fetchParticipants();
    } catch (e) {
      console.error(e);
      setSubmitMsg({ text: "Failed to register. Please try again.", ok: false });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (participantId: string) => {
    await deleteDoc(doc(firestoreDb, "participants", participantId));
    setParticipants(prev => prev.filter(p => p.id !== participantId));
  };

  const copyShareLink = () => {
    const link = `${window.location.origin}/competitions/${competitionId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleLogout = () => { clearSession(); router.replace("/login"); };

  // ── loading ──────────────────────────────────────────────────
  if (loadingEvent) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-white/30 text-sm animate-pulse">Loading event…</div>
      </div>
    );
  }
  if (!user || !event) return null;

  const isOwner = user.email === event.ownerEmail;
  const fields  = event.participantFields ?? [];

  // ── render ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-emerald-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* top nav */}
      <nav className="relative border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => router.push("/competitions")}
          className="text-white/40 hover:text-white text-sm flex items-center gap-1.5 transition-colors"
        >
          ← All Events
        </button>

        <div className="flex items-center gap-3">
          {user.picture ? (
            <img src={user.picture} alt="avatar" className="w-8 h-8 rounded-full border border-white/10" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-emerald-900/30 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
              {user.name?.charAt(0) ?? "U"}
            </div>
          )}
          <span className="text-sm text-white/60 hidden sm:block">{user.name}</span>
          <button
            onClick={handleLogout}
            className="text-xs text-white/30 hover:text-white/70 border border-white/10 hover:border-white/20 rounded-lg px-3 py-1.5 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div className="relative max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* event header */}
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge color={event.isPublic ? "emerald" : "amber"}>
              {event.isPublic ? "Public" : "Private"}
            </Badge>
            {isOwner && <Badge color="sky">You own this</Badge>}
            {event.enableAbstractCheck && (
              <Badge color="violet">🔍 Abstract Check ON</Badge>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
          <p className="text-white/40 text-sm">
            Organised by {event.ownerEmail} ·{" "}
            {new Date(event.createdAt).toLocaleDateString("en-IN", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        </header>

        {/* tabs */}
        <div className="flex gap-1 bg-white/5 border border-white/8 rounded-xl p-1 w-fit">
          {(["overview", "participants", "checker"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                tab === t
                  ? "bg-emerald-600 text-white shadow"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {t === "checker" ? "Similarity Checker" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {/* TAB: OVERVIEW                                         */}
        {/* ══════════════════════════════════════════════════════ */}
        {tab === "overview" && (
          <div className="grid md:grid-cols-2 gap-6">

            {/* Event Info */}
            <div className="bg-[#111118] border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-white/30">Event Info</h2>

              <InfoRow label="Event Name"      value={event.name} />
              <InfoRow label="Organiser"       value={event.ownerEmail} />
              <InfoRow label="Visibility"      value={event.isPublic ? "Public" : "Private"} />
              <InfoRow
                label="Created"
                value={new Date(event.createdAt).toLocaleString("en-IN", {
                  dateStyle: "medium", timeStyle: "short",
                })}
              />
              <InfoRow label="Event ID / Code" value={event.id} mono />

              {/* Abstract check status */}
              <div className="flex gap-4 justify-between items-start">
                <span className="text-xs text-white/30 shrink-0 pt-0.5">Abstract Check</span>
                <span className={`text-sm font-medium ${event.enableAbstractCheck ? "text-violet-400" : "text-white/20"}`}>
                  {event.enableAbstractCheck ? "✓ Enabled" : "Disabled"}
                </span>
              </div>
            </div>

            {/* Share */}
            <div className="bg-[#111118] border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-white/30">Share</h2>
              <p className="text-white/40 text-sm">Invite participants using the link or event code below.</p>

              <div>
                <p className="text-xs text-white/30 mb-1">Event Code</p>
                <code className="block bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-emerald-400 font-mono text-sm tracking-wide break-all">
                  {competitionId}
                </code>
              </div>

              <button
                onClick={copyShareLink}
                className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 rounded-xl py-2.5 text-sm font-medium transition-colors"
              >
                {copied ? "✓ Copied!" : "Copy Share Link"}
              </button>
            </div>

            {/* Participant Fields */}
            <div className="md:col-span-2 bg-[#111118] border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-white/30">
                Participant Fields ({fields.length}{event.enableAbstractCheck ? " + 2 AI-checked" : ""})
              </h2>
              {fields.length === 0 && !event.enableAbstractCheck ? (
                <p className="text-white/30 text-sm">No participant fields configured for this event.</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {fields.map((f, i) => (
                    <div key={f.id} className="bg-white/5 border border-white/8 rounded-xl px-4 py-3 flex items-center gap-3">
                      <span className="text-white/20 font-mono text-xs w-5 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{f.label}</p>
                        <p className="text-[10px] text-white/30 mt-0.5 uppercase">{f.type} · {f.required ? "Required" : "Optional"}</p>
                      </div>
                    </div>
                  ))}
                  {event.enableAbstractCheck && (
                    <>
                      <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
                        <span className="text-violet-400/50 text-xs w-5 shrink-0">⬡</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">Project Title</p>
                          <p className="text-[10px] text-violet-400/50 mt-0.5 uppercase">text · Required · AI-checked</p>
                        </div>
                      </div>
                      <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
                        <span className="text-violet-400/50 text-xs w-5 shrink-0">⬡</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">Project Abstract</p>
                          <p className="text-[10px] text-violet-400/50 mt-0.5 uppercase">textarea · Required · AI-checked</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* TAB: PARTICIPANTS                                     */}
        {/* ══════════════════════════════════════════════════════ */}
        {tab === "participants" && (
          <div className="space-y-8">

            {/* Registration Form */}
            <div className="bg-[#111118] border border-white/10 rounded-2xl p-6 space-y-5">
              <div>
                <h2 className="text-lg font-semibold">Register as Participant</h2>
                <p className="text-white/40 text-sm mt-1">Fill in the details below to join this event.</p>
              </div>

              {/* Abstract check status banner */}
              {event.enableAbstractCheck && (
                <div className="flex items-start gap-3 bg-violet-500/8 border border-violet-500/25 rounded-xl px-4 py-3">
                  <span className="text-violet-400 mt-0.5 shrink-0">🔍</span>
                  <div>
                    <p className="text-violet-300 text-sm font-medium">Abstract Similarity Check Active</p>
                    <p className="text-violet-400/60 text-xs mt-0.5">
                      Your project abstract will be verified against existing submissions. Duplicates or near-identical abstracts will be rejected automatically.
                    </p>
                    <p className="text-xs mt-1.5">
                      {pipeLoading ? (
                        <span className="text-amber-400 animate-pulse">⏳ Loading AI model…</span>
                      ) : pipe ? (
                        <span className="text-emerald-400">✓ AI model ready</span>
                      ) : (
                        <span className="text-white/30">AI model will load shortly</span>
                      )}
                      <span className="text-white/20 ml-2">·</span>
                      <span className="text-white/30 ml-2">{eventAbstracts.length} existing abstracts on record</span>
                    </p>
                  </div>
                </div>
              )}

              {fields.length === 0 && !event.enableAbstractCheck ? (
                <p className="text-white/30 text-sm">This event has no registration fields yet.</p>
              ) : (
                <>
                  {/* Standard fields */}
                  {fields.length > 0 && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {fields.map(f => (
                        <div key={f.id}>
                          <label className="block text-sm font-medium text-white/70 mb-1.5">
                            {f.label}
                            {f.required && <span className="text-emerald-400 ml-1">*</span>}
                          </label>

                          {f.type === "date" ? (
                            <input
                              type="date"
                              value={formData[f.id] ?? ""}
                              onChange={e => setFormData(p => ({ ...p, [f.id]: e.target.value }))}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50 transition-colors [color-scheme:dark]"
                            />
                          ) : f.type === "select" && f.options?.length ? (
                            <select
                              value={formData[f.id] ?? ""}
                              onChange={e => setFormData(p => ({ ...p, [f.id]: e.target.value }))}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                            >
                              <option value="">Select…</option>
                              {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input
                              type="text"
                              placeholder={`Enter ${f.label.toLowerCase()}`}
                              value={formData[f.id] ?? ""}
                              onChange={e => setFormData(p => ({ ...p, [f.id]: e.target.value }))}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition-colors"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Project abstract fields (similarity-gated) */}
                  {event.enableAbstractCheck && (
                    <div className="border-t border-violet-500/10 pt-5 space-y-4">
                      <p className="text-xs font-semibold uppercase tracking-widest text-violet-400/70">
                        Project Details <span className="text-violet-400/40 normal-case font-normal">— checked for duplicates</span>
                      </p>

                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-1.5">
                          Project Title <span className="text-emerald-400">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Enter your project title…"
                          value={projectTitle}
                          onChange={e => {
                            setProjectTitle(e.target.value);
                            setSimStatus(null);
                            setSimMatch(null);
                          }}
                          className="w-full bg-white/5 border border-violet-500/20 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-1.5">
                          Project Abstract <span className="text-emerald-400">*</span>
                          <span className="ml-2 text-[10px] text-violet-400/60 font-normal normal-case">AI similarity-checked on submit</span>
                        </label>
                        <textarea
                          placeholder="Describe your project in detail. This will be verified for uniqueness against all existing submissions…"
                          value={projectAbstract}
                          onChange={e => {
                            setProjectAbstract(e.target.value);
                            setSimStatus(null);
                            setSimMatch(null);
                          }}
                          rows={5}
                          className="w-full bg-white/5 border border-violet-500/20 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors resize-none text-sm"
                        />
                      </div>

                      {/* Inline similarity feedback */}
                      {simStatus === "checking" && (
                        <div className="flex items-center gap-2 text-sm text-violet-400 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping inline-block" />
                          Checking abstract for duplicates…
                        </div>
                      )}
                      {simStatus === "ok" && (
                        <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                          ✓ Abstract is unique — no similar projects found
                        </div>
                      )}
                      {simStatus === "blocked" && simMatch && (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 space-y-1">
                          <p className="text-amber-400 text-sm font-semibold">⚠️ Too similar to an existing project</p>
                          <p className="text-white/50 text-xs">
                            Matches <span className="text-white/70">"{simMatch.title}"</span> with{" "}
                            <span className="text-amber-400 font-mono font-bold">{formatPercent(simMatch.abstractScore)}</span> abstract similarity
                          </p>
                          <p className="text-white/30 text-xs">Please revise your abstract to make it more distinct.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Submit message */}
                  {submitMsg && (
                    <p className={`text-sm ${submitMsg.ok ? "text-emerald-400" : "text-red-400"}`}>
                      {submitMsg.text}
                    </p>
                  )}

                  {/* Register / Check buttons */}
                  {event.enableAbstractCheck && simStatus !== "ok" ? (
                    <button
                      onClick={handleCheckSimilarity}
                      disabled={submitting || pipeLoading || !projectAbstract.trim() || !projectTitle.trim()}
                      className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2"
                    >
                      {submitting && simStatus === "checking"
                        ? <><span className="w-2 h-2 rounded-full bg-white/60 animate-bounce inline-block" /> Checking similarity…</>
                        : pipeLoading
                        ? "⏳ Loading AI model…"
                        : "Check Similarity Score"}
                    </button>
                  ) : (
                    <button
                      onClick={handleRegister}
                      disabled={submitting || (event.enableAbstractCheck && pipeLoading)}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2"
                    >
                      {submitting ? "Registering…" : "Register for Event"}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Participants List */}
            <div className="bg-[#111118] border border-white/10 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  All Participants
                  <span className="ml-2 text-sm font-normal text-white/30">({participants.length})</span>
                </h2>
                <button
                  onClick={fetchParticipants}
                  className="text-xs text-white/30 hover:text-white/60 border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
                >
                  ↻ Refresh
                </button>
              </div>

              {loadingParts ? (
                <div className="text-white/30 text-sm animate-pulse py-4 text-center">Loading participants…</div>
              ) : participants.length === 0 ? (
                <div className="text-center py-10 text-white/20 text-sm">No participants registered yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left py-2 pr-4 text-xs text-white/30 font-medium">#</th>
                        {fields.map(f => (
                          <th key={f.id} className="text-left py-2 pr-4 text-xs text-white/30 font-medium whitespace-nowrap">
                            {f.label}
                          </th>
                        ))}
                        {event.enableAbstractCheck && (
                          <th className="text-left py-2 pr-4 text-xs text-violet-400/60 font-medium whitespace-nowrap">Project Title</th>
                        )}
                        <th className="text-left py-2 pr-4 text-xs text-white/30 font-medium">Registered</th>
                        {isOwner && <th className="py-2" />}
                      </tr>
                    </thead>
                    <tbody>
                      {participants.map((p, idx) => (
                        <tr key={p.id} className="border-b border-white/5 hover:bg-white/2 transition-colors group">
                          <td className="py-3 pr-4 text-white/30 font-mono text-xs">{idx + 1}</td>
                          {fields.map(f => (
                            <td key={f.id} className="py-3 pr-4 text-white/80 max-w-[180px] truncate">
                              {p.data?.[f.id] ?? <span className="text-white/20">—</span>}
                            </td>
                          ))}
                          {event.enableAbstractCheck && (
                            <td className="py-3 pr-4 text-violet-300/70 max-w-[180px] truncate text-xs">
                              {p.data?.["_projectTitle"] ?? <span className="text-white/20">—</span>}
                            </td>
                          )}
                          <td className="py-3 pr-4 text-white/30 text-xs whitespace-nowrap">
                            {new Date(p.submittedAt).toLocaleDateString("en-IN", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </td>
                          {isOwner && (
                            <td className="py-3">
                              <button
                                onClick={() => handleDelete(p.id)}
                                title="Remove participant"
                                className="text-white/20 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all text-xs px-2 py-1 rounded-lg hover:bg-rose-500/10"
                              >
                                ✕
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* TAB: SIMILARITY CHECKER                              */}
        {/* ══════════════════════════════════════════════════════ */}
        {tab === "checker" && (
          <div className="bg-[#111118] border border-white/10 rounded-2xl p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Abstract Similarity Checker</h2>
              <p className="text-white/40 text-sm mt-1">
                Manually check or add project abstracts for this event. All submissions are compared against existing entries.
              </p>
            </div>
            <EventAbstractCheckerWrapper competitionId={competitionId} isOwner={isOwner} />
          </div>
        )}

      </div>
    </div>
  );
}

// ── sub-components ─────────────────────────────────────────────
function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-4 justify-between items-start">
      <span className="text-xs text-white/30 shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-right break-all ${mono ? "font-mono text-emerald-400 text-xs" : "text-white/80"}`}>
        {value}
      </span>
    </div>
  );
}

// Lazy-load EventAbstractChecker so the model only loads when the checker tab opens
function EventAbstractCheckerWrapper({
  competitionId,
  isOwner,
}: {
  competitionId: string;
  isOwner: boolean;
}) {
  const [Checker, setChecker] = useState<React.ComponentType<{
    competitionId: string;
    isOwner: boolean;
  }> | null>(null);

  useEffect(() => {
    import("@/components/EventAbstractChecker").then(m => setChecker(() => m.default));
  }, []);

  if (!Checker) return <div className="text-white/30 text-sm animate-pulse">Loading checker…</div>;
  return <Checker competitionId={competitionId} isOwner={isOwner} />;
}
