"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db as firestoreDb } from "@/lib/firebase";
import { getSession, type UserSession } from "@/lib/auth";
import type { Competition } from "@/lib/types";

export default function CompetitionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const session = getSession();
    if (!session) {
      router.replace("/login");
    } else {
      setUser(session);
      fetchPublicCompetitions();
    }
  }, [router]);

  const fetchPublicCompetitions = async () => {
    try {
      const q = query(collection(firestoreDb, "competitions"), where("isPublic", "==", true));
      const snap = await getDocs(q);
      const comps = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Competition));
      // Sort by creation time descending
      comps.sort((a, b) => b.createdAt - a.createdAt);
      setCompetitions(comps);
    } catch (err) {
      console.error("Failed to fetch public competitions", err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return;
    setJoinError("");
    try {
      const docRef = doc(firestoreDb, "competitions", joinCode.trim());
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        router.push(`/competitions/${docSnap.id}`);
      } else {
        setJoinError("Competition not found. Please check the code.");
      }
    } catch (err) {
      console.error(err);
      setJoinError("Error validating competition code.");
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 pt-12 md:p-12">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Events & Competitions</h1>
            <p className="text-white/40">Join an existing event or create your own to analyze submissions.</p>
          </div>
          <button
            onClick={() => router.push("/competitions/create")}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-900/20"
          >
            + Create New Event
          </button>
        </header>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <h2 className="text-xl font-semibold">Public Events</h2>
            {loading ? (
              <div className="text-white/40">Loading events...</div>
            ) : competitions.length === 0 ? (
              <div className="bg-[#111118] border border-white/5 p-8 rounded-2xl text-center">
                <p className="text-white/40 mb-4">No public events are active right now.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {competitions.map((comp) => (
                  <div 
                    key={comp.id} 
                    className="bg-[#111118] border border-white/10 p-5 rounded-xl hover:border-emerald-500/50 cursor-pointer transition-all hover:-translate-y-1"
                    onClick={() => router.push(`/competitions/${comp.id}`)}
                  >
                    <h3 className="font-semibold text-lg truncate mb-1">{comp.name}</h3>
                    <p className="text-xs text-white/40 truncate">Organized by {comp.ownerEmail}</p>
                    <div className="mt-4 text-emerald-400 text-sm font-medium">Join Event →</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Join via Code</h2>
            <div className="bg-[#111118] border border-white/10 p-6 rounded-2xl">
              <p className="text-sm text-white/50 mb-4">Have an invite code for a private event? Enter it below to join.</p>
              <input
                type="text"
                placeholder="e.g. XyZ123"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoinByCode()}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 mb-3 text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50"
              />
              {joinError && <p className="text-red-400 text-xs mb-3">{joinError}</p>}
              <button 
                onClick={handleJoinByCode}
                className="w-full bg-white/10 hover:bg-white/15 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Join Event
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
