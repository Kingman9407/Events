import type { DBEntry } from "./types";

// ── Cosine Similarity ──────────────────────────────────────────
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length) return 0;
  const dot = a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

// ── Get Embedding ──────────────────────────────────────────────
export async function getEmbedding(pipe: any, text: string): Promise<number[]> {
  const emb = await pipe(text.trim(), { pooling: "mean", normalize: true });
  if (!emb?.data) throw new Error("Embedding failed");
  return Array.from(emb.data) as number[];
}

// ── Two-Stage Scoring ──────────────────────────────────────────
export async function scoreEntries(
  pipe: any,
  db: DBEntry[],
  queryTitle: string,
  queryAbstract: string
): Promise<DBEntry[]> {
  const queryTitleEmb = queryTitle.trim()
    ? await getEmbedding(pipe, queryTitle.trim())
    : null;
  const queryAbstractEmb = queryAbstract.trim()
    ? await getEmbedding(pipe, queryAbstract.trim())
    : null;

  const scored: DBEntry[] = [];

  for (const item of db) {
    let titleSim = 0;
    if (queryTitleEmb && item.title.trim()) {
      const titleEmb = await getEmbedding(pipe, item.title);
      titleSim = cosineSimilarity(queryTitleEmb, titleEmb);
    }

    let abstractSim: number | undefined = undefined;
    const shouldCompareAbstract =
      (titleSim > 0.6 && queryAbstractEmb !== null && item.abstract.trim()) ||
      (!queryTitle.trim() && queryAbstractEmb !== null && item.abstract.trim());

    if (shouldCompareAbstract && queryAbstractEmb) {
      const abstractEmb = await getEmbedding(pipe, item.abstract);
      abstractSim = cosineSimilarity(queryAbstractEmb, abstractEmb);
    }

    let finalScore = 0;
    let comparisonType: DBEntry["comparisonType"] = "title_only";

    if (abstractSim !== undefined) {
      if (queryTitle.trim() && queryAbstract.trim()) {
        finalScore = titleSim * 0.4 + abstractSim * 0.6;
        comparisonType = "title_and_abstract";
      } else {
        finalScore = abstractSim;
        comparisonType = "abstract_only";
      }
    } else {
      finalScore = titleSim;
      comparisonType = "title_only";
    }

    scored.push({
      ...item,
      titleScore: titleSim,
      abstractScore: abstractSim,
      finalScore,
      comparisonType,
    });
  }

  scored.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));
  return scored;
}

// ── Helpers ────────────────────────────────────────────────────
export function generateNextNumber(db: DBEntry[]): string {
  const next = (db.length + 1).toString().padStart(3, "0");
  return `PRJ-${next}`;
}

export function isEligibleToAdd(hasSearched: boolean, results: DBEntry[]): boolean {
  if (!hasSearched) return false;
  if (results.length === 0) return true;
  const best = results[0];
  if (best.abstractScore !== undefined) return best.abstractScore < 0.6;
  return true;
}

export function formatPercent(score?: number): string {
  if (score === undefined || isNaN(score)) return "—";
  return (score * 100).toFixed(2) + "%";
}
