import React from "react";
import { styles } from "@/components/ui/styles";

// ── Section ────────────────────────────────────────────────────
export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}

// ── Row ────────────────────────────────────────────────────────
export function Row({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div style={styles.row}>
      <span style={styles.rowLabel}>{label}</span>
      <span style={{ ...styles.rowValue, fontWeight: bold ? 700 : 400 }}>
        {value}
      </span>
    </div>
  );
}
