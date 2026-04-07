import React from "react";

// ── Styles — Black & Teal ─────────────────────────────────────
export const TEAL = "#0d9488";
export const TEAL_DIM = "#0f766e";
export const TEAL_GLOW = "rgba(13,148,136,0.15)";
export const TEAL_BORDER = "rgba(13,148,136,0.35)";

export const styles: Record<string, React.CSSProperties> = {
  body: {
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    background: "#0a0a0a",
    minHeight: "100vh",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "48px 20px",
  },
  wrap: {
    background: "#111111",
    borderRadius: 8,
    padding: "48px 52px",
    maxWidth: 800,
    width: "100%",
    boxShadow: `0 0 0 1px #1f1f1f, 0 20px 60px rgba(0,0,0,0.6), 0 0 40px ${TEAL_GLOW}`,
    border: `1px solid #1e1e1e`,
  },

  // Header
  headerBlock: { marginBottom: 24 },
  eyebrow: {
    display: "inline-block",
    fontSize: 11,
    fontFamily: "'Courier New', monospace",
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    color: TEAL,
    marginBottom: 10,
  },
  h1: {
    margin: "0 0 10px",
    fontSize: 32,
    fontWeight: 700,
    color: "#f0fafa",
    letterSpacing: "-0.5px",
    lineHeight: 1.2,
  },
  subtitle: {
    color: "#83a6a6",
    fontSize: 15,
    lineHeight: 1.6,
    margin: 0,
  },
  divider: {
    height: 1,
    background: "#1e1e1e",
    margin: "28px 0",
  },

  // Notification
  notification: {
    padding: "12px 16px",
    borderRadius: 4,
    marginBottom: 20,
    fontFamily: "'Courier New', monospace",
    fontSize: 13,
    fontWeight: 500,
  },
  notificationTypes: {
    success: { background: "rgba(13,148,136,0.12)", color: TEAL, border: `1px solid ${TEAL_BORDER}` },
    error: { background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" },
    warning: { background: "rgba(234,179,8,0.1)", color: "#facc15", border: "1px solid rgba(234,179,8,0.3)" },
    info: { background: "rgba(13,148,136,0.08)", color: "#5eead4", border: `1px solid ${TEAL_BORDER}` },
  },

  // Form
  fieldGroup: { marginBottom: 20 },
  label: {
    display: "block",
    fontSize: 11,
    fontFamily: "'Courier New', monospace",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: "#759494",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    padding: "13px 16px",
    border: "1px solid #1e2e2e",
    borderRadius: 4,
    fontSize: 15,
    background: "#0d1a1a",
    outline: "none",
    fontFamily: "inherit",
    color: "#d4f0ee",
    boxSizing: "border-box" as const,
    transition: "border-color 0.2s",
  },
  textarea: {
    width: "100%",
    padding: "13px 16px",
    border: "1px solid #1e2e2e",
    borderRadius: 4,
    fontSize: 15,
    background: "#0d1a1a",
    resize: "vertical" as const,
    minHeight: 110,
    fontFamily: "inherit",
    outline: "none",
    color: "#d4f0ee",
    boxSizing: "border-box" as const,
  },

  // Loading
  loadingBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 14,
    color: "#759494",
    fontSize: 14,
    fontFamily: "'Courier New', monospace",
    marginBottom: 16,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: TEAL,
    display: "inline-block",
    boxShadow: `0 0 8px ${TEAL}`,
  },

  // Buttons
  btn: {
    width: "100%",
    padding: "14px 20px",
    background: TEAL,
    color: "#021010",
    border: "none",
    borderRadius: 4,
    fontSize: 14,
    fontFamily: "'Courier New', monospace",
    letterSpacing: "0.08em",
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: 12,
    transition: "background 0.2s, box-shadow 0.2s",
    boxShadow: `0 0 20px ${TEAL_GLOW}`,
  },
  btnDisabled: { opacity: 0.35, cursor: "not-allowed", boxShadow: "none" },
  addBtn: {
    width: "100%",
    padding: "14px 20px",
    background: "transparent",
    color: TEAL,
    border: `1px solid ${TEAL_BORDER}`,
    borderRadius: 4,
    fontSize: 14,
    fontFamily: "'Courier New', monospace",
    letterSpacing: "0.08em",
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: 12,
    transition: "background 0.2s",
  },

  // Empty
  emptyResults: {
    padding: "28px 0",
    color: "#5b7a7a",
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center" as const,
  },

  // Results
  resultsBox: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 0,
  },
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "'Courier New', monospace",
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    color: TEAL,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: `1px solid #1a2e2e`,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "9px 0",
    borderBottom: "1px solid #131f1f",
  },
  rowLabel: {
    fontSize: 13,
    color: "#6b8f8f",
    fontFamily: "'Courier New', monospace",
    minWidth: 140,
  },
  rowValue: {
    fontSize: 14,
    color: "#a0d4d0",
    textAlign: "right" as const,
    flex: 1,
    marginLeft: 16,
    wordBreak: "break-word" as const,
  },

  // Match list
  ol: { listStyle: "none", margin: 0, padding: 0 },
  li: { padding: "12px 0", borderBottom: "1px solid #131f1f" },
  matchItem: { display: "flex", flexDirection: "column" as const, gap: 6 },
  matchHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  matchTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#c8ecea",
    flex: 1,
    lineHeight: 1.4,
  },
  badges: { display: "flex", gap: 6, fontSize: 11, flexShrink: 0 },
  badge: {
    padding: "3px 7px",
    borderRadius: 3,
    fontFamily: "'Courier New', monospace",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap" as const,
  },
  titleBadge: { background: "#0d1e1e", color: "#5eead4", border: "1px solid #152a2a" },
  abstractBadge: { background: "#1a1500", color: "#a08000", border: "1px solid #2a2200" },
  combinedBadge: { background: TEAL_GLOW, color: TEAL, border: `1px solid ${TEAL_BORDER}` },
  matchMeta: {
    fontSize: 11,
    color: "#627d7d",
    fontFamily: "'Courier New', monospace",
  },

  // Eligibility
  eligibility: {
    marginTop: 8,
    padding: "18px 20px",
    borderRadius: 4,
    lineHeight: 1.5,
    fontSize: 14,
  },
  eligibilityGreen: {
    background: TEAL_GLOW,
    color: "#5eead4",
    border: `1px solid ${TEAL_BORDER}`,
  },
  eligibilityAmber: {
    background: "rgba(234,179,8,0.08)",
    color: "#facc15",
    border: "1px solid rgba(234,179,8,0.25)",
  },
  eligibilityDetail: {
    margin: "6px 0 12px",
    fontSize: 13,
    fontStyle: "italic",
    opacity: 0.7,
  },
  simInfo: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap" as const,
    fontSize: 12,
    fontFamily: "'Courier New', monospace",
    paddingTop: 10,
    borderTop: "1px solid rgba(13,148,136,0.15)",
    color: TEAL_DIM,
  },
};
