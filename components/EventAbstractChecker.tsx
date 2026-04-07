"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
} from "firebase/firestore";
import { db as firestoreDb } from "@/lib/firebase";
import type { DBEntry } from "@/lib/types";
import {
  scoreEntries,
  isEligibleToAdd,
  formatPercent,
  cosineSimilarity,
  getEmbedding,
} from "@/lib/similarity";

// ── Types ──────────────────────────────────────────────────────
interface EventAbstract {
  id: string;
  competitionId: string;
  title: string;
  abstract: string;
  submittedAt: number;
  number: string;
}

interface Props {
  competitionId: string;
  isOwner: boolean;
}

// ── Component ──────────────────────────────────────────────────
export default function EventAbstractChecker({ competitionId, isOwner }: Props) {
  const [pipe, setPipe] = useState<any>(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [dbLoading, setDbLoading] = useState(true);

  const [abstracts, setAbstracts] = useState<EventAbstract[]>([]);
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");

  const [isChecking, setIsChecking] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [results, setResults] = useState<DBEntry[]>([]);

  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "warning" | "info";
  } | null>(null);

  // ── Load Model ────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    (async () => {
      try {
        const { pipeline, env } = await import("@xenova/transformers");
        env.allowLocalModels = false;
        env.useBrowserCache = true;
        const p = await pipeline(
          "feature-extraction",
          "Xenova/all-MiniLM-L6-v2",
          { progress_callback: (p: any) => console.log("Model:", p) }
        );
        setPipe(() => p);
      } catch (err) {
        console.error("Model load error:", err);
      } finally {
        setModelLoading(false);
      }
    })();
  }, []);

  // ── Load Event Abstracts from Firestore ───────────────────────
  const fetchAbstracts = async () => {
    setDbLoading(true);
    try {
      const q = query(
        collection(firestoreDb, "eventAbstracts"),
        where("competitionId", "==", competitionId)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as EventAbstract)
      );
      list.sort((a, b) => a.number.localeCompare(b.number));
      setAbstracts(list);
    } catch (err) {
      console.error("Error fetching abstracts:", err);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    fetchAbstracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId]);

  // ── Notification ──────────────────────────────────────────────
  const notify = (
    message: string,
    type: "success" | "error" | "warning" | "info"
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // ── Check Similarity ──────────────────────────────────────────
  const handleCheck = async () => {
    if (!pipe) { notify("Model is still loading, please wait.", "warning"); return; }
    if (!abstract.trim()) { notify("Please enter an abstract to check.", "warning"); return; }

    setIsChecking(true);
    setHasChecked(false);
    setResults([]);

    try {
      // Convert EventAbstract[] to DBEntry[] for the scorer
      const dbEntries: DBEntry[] = abstracts.map((a) => ({
        id: a.id,
        title: a.title,
        number: a.number,
        abstract: a.abstract,
      }));

      const scored = await scoreEntries(pipe, dbEntries, title, abstract);
      setResults(scored);
      setHasChecked(true);

      const best = scored[0];
      if (!best) {
        notify("No existing abstracts found. This will be the first entry!", "info");
      } else if (!isEligibleToAdd(true, scored)) {
        notify(
          `⚠️ High similarity detected! Abstract similarity: ${formatPercent(best.abstractScore)} — too similar to "${best.title}".`,
          "warning"
        );
      } else {
        notify("✅ No similar abstracts found. Safe to add.", "success");
      }
    } catch (err) {
      console.error("Check error:", err);
      notify("Check failed. See console for details.", "error");
    } finally {
      setIsChecking(false);
    }
  };

  // ── Add Abstract ──────────────────────────────────────────────
  const handleAdd = async () => {
    if (!title.trim() || !abstract.trim()) {
      notify("Both title and abstract are required.", "error");
      return;
    }
    if (!hasChecked) {
      notify("Please run a similarity check first.", "warning");
      return;
    }
    if (!isEligibleToAdd(hasChecked, results)) {
      notify("Submission blocked: abstract is too similar to an existing entry.", "error");
      return;
    }

    setIsAdding(true);
    try {
      const nextNum = (abstracts.length + 1).toString().padStart(3, "0");
      const newEntry = {
        competitionId,
        title: title.trim(),
        abstract: abstract.trim(),
        number: `ABT-${nextNum}`,
        submittedAt: Date.now(),
      };
      const ref = await addDoc(collection(firestoreDb, "eventAbstracts"), newEntry);
      setAbstracts((prev) => [
        ...prev,
        { id: ref.id, ...newEntry },
      ]);
      notify(`✅ Abstract added as ABT-${nextNum}!`, "success");
      setTitle("");
      setAbstract("");
      setResults([]);
      setHasChecked(false);
    } catch (err) {
      console.error("Add error:", err);
      notify("Failed to add abstract.", "error");
    } finally {
      setIsAdding(false);
    }
  };

  const eligible = isEligibleToAdd(hasChecked, results);
  const isLoading = modelLoading || dbLoading;
  const bestMatch = results[0];

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Notification ── */}
      {notification && (
        <div
          className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : notification.type === "warning"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
              : notification.type === "error"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
              : "bg-sky-500/10 border-sky-500/30 text-sky-400"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* ── Input Form ── */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/60 mb-1.5">
            Project Title <span className="text-white/30 font-normal">(optional but recommended)</span>
          </label>
          <input
            type="text"
            placeholder="Enter project title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition-colors text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/60 mb-1.5">
            Abstract <span className="text-emerald-400">*</span>
          </label>
          <textarea
            placeholder="Paste the project abstract here to check for duplicates…"
            value={abstract}
            onChange={(e) => setAbstract(e.target.value)}
            rows={5}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition-colors text-sm resize-none"
          />
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex flex-wrap gap-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-white/30 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            {modelLoading ? "Loading AI model (first load: ~15s)…" : "Loading event abstracts…"}
          </div>
        ) : (
          <button
            onClick={handleCheck}
            disabled={isChecking || !abstract.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium px-5 py-2.5 rounded-xl transition-colors text-sm"
          >
            {isChecking ? "Checking…" : "Run Similarity Check"}
          </button>
        )}

        {hasChecked && eligible && (
          <button
            onClick={handleAdd}
            disabled={isAdding}
            className="bg-sky-600/80 hover:bg-sky-500 disabled:opacity-40 text-white font-medium px-5 py-2.5 rounded-xl transition-colors text-sm"
          >
            {isAdding ? "Adding…" : "✚ Add to Event"}
          </button>
        )}
      </div>

      {/* ── Results ── */}
      {hasChecked && (
        <div className="space-y-4">

          {/* Eligibility Banner */}
          {results.length === 0 ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
              <p className="text-emerald-400 font-semibold text-sm">✅ First entry — no existing abstracts</p>
              <p className="text-white/40 text-xs mt-1">This will be the first abstract added to this event.</p>
            </div>
          ) : eligible ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-2">
              <p className="text-emerald-400 font-semibold text-sm">✅ Abstract is unique — eligible to add</p>
              <p className="text-white/40 text-xs">
                Highest similarity found: <span className="text-white/60 font-mono">{formatPercent(bestMatch?.finalScore)}</span> ({bestMatch?.title})
              </p>
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2">
              <p className="text-amber-400 font-semibold text-sm">⚠️ High similarity detected — submission blocked</p>
              <p className="text-white/40 text-xs">
                Abstract similarity to <span className="text-white/60">"{bestMatch?.title}"</span>:{" "}
                <span className="text-amber-400 font-mono font-bold">{formatPercent(bestMatch?.abstractScore)}</span>
              </p>
              <div className="flex gap-4 text-xs text-white/30 mt-1">
                <span>Title sim: {formatPercent(bestMatch?.titleScore)}</span>
                <span>Abstract sim: {formatPercent(bestMatch?.abstractScore)}</span>
                <span>Combined: {formatPercent(bestMatch?.finalScore)}</span>
              </div>
            </div>
          )}

          {/* Top Matches Table */}
          {results.length > 0 && (
            <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/30">
                  Top Similarity Matches ({abstracts.length} entries checked)
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left px-4 py-2 text-xs text-white/30 font-medium">#</th>
                      <th className="text-left px-4 py-2 text-xs text-white/30 font-medium">Title</th>
                      <th className="text-left px-4 py-2 text-xs text-white/30 font-medium">Title Sim</th>
                      <th className="text-left px-4 py-2 text-xs text-white/30 font-medium">Abstract Sim</th>
                      <th className="text-left px-4 py-2 text-xs text-white/30 font-medium">Overall</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.slice(0, 8).map((item, idx) => {
                      const isHighSim = (item.abstractScore ?? 0) >= 0.6 || (item.finalScore ?? 0) >= 0.6;
                      return (
                        <tr
                          key={item.id}
                          className={`border-b border-white/5 transition-colors ${
                            isHighSim ? "bg-amber-500/5" : "hover:bg-white/2"
                          }`}
                        >
                          <td className="px-4 py-3 text-white/30 font-mono text-xs">{idx + 1}</td>
                          <td className="px-4 py-3 text-white/80 max-w-[200px] truncate">
                            <span title={item.title}>{item.title || <span className="text-white/20">—</span>}</span>
                            <span className="ml-2 text-[10px] text-white/20 font-mono">{item.number}</span>
                          </td>
                          <td className="px-4 py-3 text-white/50 font-mono text-xs">
                            {formatPercent(item.titleScore)}
                          </td>
                          <td className={`px-4 py-3 font-mono text-xs font-semibold ${
                            (item.abstractScore ?? 0) >= 0.6 ? "text-amber-400" : "text-white/50"
                          }`}>
                            {item.abstractScore !== undefined ? formatPercent(item.abstractScore) : "—"}
                          </td>
                          <td className={`px-4 py-3 font-mono text-xs font-bold ${
                            (item.finalScore ?? 0) >= 0.6 ? "text-amber-400" : "text-emerald-400"
                          }`}>
                            {formatPercent(item.finalScore)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Existing Event Abstracts (owner only) ── */}
      {isOwner && (
        <div className="border-t border-white/5 pt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30">
              Event Abstracts ({abstracts.length})
            </h3>
            <button
              onClick={fetchAbstracts}
              className="text-xs text-white/30 hover:text-white/60 border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
            >
              ↻ Refresh
            </button>
          </div>

          {dbLoading ? (
            <div className="text-white/20 text-sm animate-pulse">Loading…</div>
          ) : abstracts.length === 0 ? (
            <div className="text-center py-8 text-white/20 text-sm">
              No abstracts submitted to this event yet.
            </div>
          ) : (
            <div className="space-y-2">
              {abstracts.map((a) => (
                <div
                  key={a.id}
                  className="bg-white/3 border border-white/8 rounded-xl px-4 py-3 space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-emerald-400/60 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                      {a.number}
                    </span>
                    <span className="text-sm text-white/80 font-medium truncate">{a.title || <span className="text-white/30 italic">No title</span>}</span>
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed line-clamp-2">{a.abstract}</p>
                  <p className="text-[10px] text-white/20">
                    {new Date(a.submittedAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
