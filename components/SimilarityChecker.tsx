"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DBEntry } from "@/lib/types";
import { scoreEntries, generateNextNumber, isEligibleToAdd, formatPercent } from "@/lib/similarity";
import { styles, TEAL_GLOW, TEAL_BORDER } from "@/components/ui/styles";
import { Section, Row } from "@/components/ui/ResultComponents";
import { getSession, clearSession, type UserSession } from "@/lib/auth";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db as firestoreDb } from "@/lib/firebase";

// ── SimilarityChecker ─────────────────────────────────────────
export default function SimilarityChecker() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [pipe, setPipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [queryTitle, setQueryTitle] = useState("");
  const [queryAbstract, setQueryAbstract] = useState("");
  const [results, setResults] = useState<DBEntry[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "warning" | "info";
  } | null>(null);
  const [db, setDb] = useState<DBEntry[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);

  // ── Load Data from Firestore ────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const querySnapshot = await getDocs(collection(firestoreDb, "entries"));
        const entries: DBEntry[] = [];
        querySnapshot.forEach((doc) => {
          entries.push({ id: doc.id, ...doc.data() } as DBEntry);
        });
        setDb(entries);
      } catch (err) {
        console.error("❌ Error fetching from Firestore:", err);
      } finally {
        setLoadingDb(false);
      }
    };
    fetchData();
  }, []);

  // ── Auth Check ──────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const session = getSession();
    if (!session) {
      router.replace("/login");
    } else {
      setUser(session);
    }
  }, [router]);

  // ── Load Model ──────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const loadModel = async () => {
      try {
        const { pipeline, env } = await import("@xenova/transformers");
        env.allowLocalModels = false;
        env.useBrowserCache = true;
        const p = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
          progress_callback: (progress: any) =>
            console.log("Model loading:", progress),
        });
        if (!p) throw new Error("Pipeline failed to load");
        setPipe(() => p);
      } catch (err) {
        console.error("❌ Model load error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadModel();
  }, []);

  // ── Notification ────────────────────────────────────────────
  const showNotification = (
    message: string,
    type: "success" | "error" | "warning" | "info"
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // ── Search ──────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!pipe) { console.warn("Pipeline not ready"); return; }
    if (!queryTitle.trim() && !queryAbstract.trim()) {
      showNotification("Please enter at least a title or abstract.", "warning");
      return;
    }
    setIsSearching(true);
    setHasSearched(false);
    setResults([]);
    try {
      const scored = await scoreEntries(pipe, db, queryTitle, queryAbstract);
      setResults(scored);
      setHasSearched(true);
    } catch (err) {
      console.error("❌ Search error:", err);
      showNotification("Search failed. Check console for details.", "error");
    } finally {
      setIsSearching(false);
    }
  };

  // ── Add Entry ───────────────────────────────────────────────
  const handleAddEntry = async () => {
    if (!queryTitle.trim() || !queryAbstract.trim()) {
      showNotification("Both title and abstract are required to add an entry.", "error");
      return;
    }
    try {
      const newEntryData = {
        title: queryTitle.trim(),
        number: generateNextNumber(db),
        abstract: queryAbstract.trim(),
      };
      const docRef = await addDoc(collection(firestoreDb, "entries"), newEntryData);
      
      const newEntry: DBEntry = { id: docRef.id, ...newEntryData };
      setDb((prev) => [...prev, newEntry]);
      
      showNotification(
        `Entry added successfully! Number: ${newEntry.number}. Total entries: ${db.length + 1}`,
        "success"
      );
      setQueryTitle("");
      setQueryAbstract("");
      setResults([]);
      setHasSearched(false);
    } catch (err) {
      console.error("❌ Error adding entry:", err);
      showNotification("Failed to add entry to database.", "error");
    }
  };

  const eligible = isEligibleToAdd(hasSearched, results);

  const handleLogout = () => {
    clearSession();
    router.replace("/login");
  };

  // ── Render ──────────────────────────────────────────────────
  if (!user) return null; // Prevent flash before redirect

  return (
    <div style={styles.body}>
      <div style={styles.wrap}>

        {/* User Profile Bar */}
        <div style={localStyles.userBar}>
          <div style={localStyles.userInfo}>
            {user.picture ? (
              <img src={user.picture} alt="Profile" style={localStyles.avatar} />
            ) : (
              <div style={localStyles.avatarPlaceholder}>{user.name?.charAt(0) || "U"}</div>
            )}
            <span style={localStyles.userName}>{user.name || user.email}</span>
          </div>
          <button
            onClick={handleLogout}
            style={localStyles.logoutBtn}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.color = "#a0d4d0";
              (e.target as HTMLButtonElement).style.borderColor = "#a0d4d0";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.color = "#759494";
              (e.target as HTMLButtonElement).style.borderColor = "#1a2e2e";
            }}
          >
            Sign Out
          </button>
        </div>

        {/* Header */}
        <div style={styles.headerBlock}>
          <span style={styles.eyebrow}>Similarity Analyzer</span>
          <h1 style={styles.h1}>Text Similarity Check</h1>
          <p style={styles.subtitle}>
            Two-stage semantic comparison — titles first, then abstracts for close matches.
          </p>
        </div>

        <div style={styles.divider} />

        {/* Notification */}
        {notification && (
          <div
            style={{
              ...styles.notification,
              ...(styles.notificationTypes as any)[notification.type],
            }}
          >
            {notification.message}
          </div>
        )}

        {/* Inputs */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Title</label>
          <input
            type="text"
            placeholder="Enter title to check for similarity..."
            value={queryTitle}
            onChange={(e) => setQueryTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            style={styles.input}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Abstract</label>
          <textarea
            placeholder="Enter abstract (required for adding a new entry)"
            value={queryAbstract}
            onChange={(e) => setQueryAbstract(e.target.value)}
            style={styles.textarea}
          />
        </div>

        {/* Buttons */}
        {loading || loadingDb ? (
          <div style={styles.loadingBox}>
            <span style={styles.loadingDot} /> {loading ? "Loading model — first load takes ~10–20s" : "Loading database..."}
          </div>
        ) : (
          <button
            onClick={handleSearch}
            disabled={isSearching}
            style={{ ...styles.btn, ...(isSearching ? styles.btnDisabled : {}) }}
          >
            {isSearching ? "Analyzing…" : "Run Similarity Check"}
          </button>
        )}

        {hasSearched && eligible && (
          <button onClick={handleAddEntry} style={styles.addBtn}>
            Add Entry to Database
          </button>
        )}

        <div style={styles.divider} />

        {/* States */}
        {!hasSearched && !isSearching && (
          <div style={styles.emptyResults}>
            Results will appear here after analysis.
          </div>
        )}
        {isSearching && (
          <div style={styles.emptyResults}>Processing two-stage analysis…</div>
        )}

        {/* Results */}
        {hasSearched && db.length === 0 && (
          <div style={styles.resultsBox}>
            <Section title="Your Query">
              <Row label="Title" value={queryTitle || "—"} />
              <Row
                label="Abstract"
                value={
                  queryAbstract
                    ? queryAbstract.length > 100
                      ? queryAbstract.slice(0, 100) + "…"
                      : queryAbstract
                    : "—"
                }
              />
            </Section>
            <div style={{ ...styles.eligibility, ...styles.eligibilityGreen }}>
              <strong>Entry eligible for addition</strong>
              <p style={styles.eligibilityDetail}>
                Database is currently empty. This will be the first entry!
              </p>
            </div>
          </div>
        )}

        {hasSearched && results.length > 0 && (
          <div style={styles.resultsBox}>

            <Section title="Your Query">
              <Row label="Title" value={queryTitle || "—"} />
              <Row
                label="Abstract"
                value={
                  queryAbstract
                    ? queryAbstract.length > 100
                      ? queryAbstract.slice(0, 100) + "…"
                      : queryAbstract
                    : "—"
                }
              />
            </Section>

            <Section title="Analysis Info">
              <Row label="Threshold" value="60% title similarity" />
              <Row label="Total Entries" value={String(db.length)} />
              <Row
                label="Abstract Comparisons"
                value={String(results.filter((r) => r.abstractScore !== undefined).length)}
              />
            </Section>

            <Section title="Best Match">
              <Row label="Title" value={results[0].title} />
              <Row label="Score" value={formatPercent(results[0].finalScore)} bold />
            </Section>

            {/* Top 10 */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Top 10 Matches</div>
              <ol style={styles.ol}>
                {results.slice(0, 10).map((item) => (
                  <li key={item.id} style={styles.li}>
                    <div style={styles.matchItem}>
                      <div style={styles.matchHeader}>
                        <span style={styles.matchTitle}>{item.title}</span>
                        <div style={styles.badges}>
                          <span style={{ ...styles.badge, ...styles.titleBadge }}>
                            T: {formatPercent(item.titleScore)}
                          </span>
                          {item.abstractScore !== undefined && (
                            <span style={{ ...styles.badge, ...styles.abstractBadge }}>
                              A: {formatPercent(item.abstractScore)}
                            </span>
                          )}
                          <span style={{ ...styles.badge, ...styles.combinedBadge }}>
                            {formatPercent(item.finalScore)}
                          </span>
                        </div>
                      </div>
                      <div style={styles.matchMeta}>
                        {item.comparisonType} · {item.number}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Eligibility Banner */}
            {eligible ? (
              <div style={{ ...styles.eligibility, ...styles.eligibilityGreen }}>
                <strong>Entry eligible for addition</strong>
                <p style={styles.eligibilityDetail}>
                  No high-similarity matches found. Safe to add to the database.
                </p>
                <div style={styles.simInfo}>
                  <span>Title: {formatPercent(results[0].titleScore)}</span>
                  {results[0].abstractScore !== undefined && (
                    <span>Abstract: {formatPercent(results[0].abstractScore)}</span>
                  )}
                  <span>Overall: {formatPercent(results[0].finalScore)}</span>
                  <span>Compared against {db.length} entries</span>
                </div>
              </div>
            ) : (
              <div style={{ ...styles.eligibility, ...styles.eligibilityAmber }}>
                <strong>High similarity detected</strong>
                <p style={styles.eligibilityDetail}>
                  This entry is too similar to an existing record. Addition not recommended.
                </p>
                <div style={styles.simInfo}>
                  <span>Title: {formatPercent(results[0].titleScore)}</span>
                  <span>Abstract: {formatPercent(results[0].abstractScore)}</span>
                  <span>Overall: {formatPercent(results[0].finalScore)}</span>
                  <span>Compared against {db.length} entries</span>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

const localStyles: Record<string, React.CSSProperties> = {
  userBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    paddingBottom: "16px",
    borderBottom: "1px solid #1a2e2e",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    border: `1px solid ${TEAL_BORDER}`,
  },
  avatarPlaceholder: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "rgba(13,148,136,0.1)",
    border: `1px solid ${TEAL_BORDER}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#0d9488",
    fontWeight: "bold",
    fontSize: "14px",
    textTransform: "uppercase",
  },
  userName: {
    color: "#a0d4d0",
    fontSize: "14px",
    fontWeight: 500,
  },
  logoutBtn: {
    background: "transparent",
    color: "#759494",
    border: "1px solid #1a2e2e",
    borderRadius: "4px",
    padding: "6px 12px",
    fontSize: "12px",
    fontFamily: "'Courier New', monospace",
    cursor: "pointer",
    transition: "all 0.2s",
  },
};
