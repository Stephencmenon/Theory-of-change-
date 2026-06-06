import { StyleSheet } from "@react-pdf/renderer";

// Shared styles for PDF reports. @react-pdf/renderer uses its own layout engine
// (not HTML/CSS) — these are its style primitives, not Tailwind.
export const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: "#111827", fontFamily: "Helvetica" },
  h1: { fontSize: 18, marginBottom: 2, fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 9, color: "#6b7280", marginBottom: 16 },
  section: { marginBottom: 16 },
  h2: { fontSize: 12, marginBottom: 6, fontFamily: "Helvetica-Bold" },
  h3: { fontSize: 10, marginBottom: 4, fontFamily: "Helvetica-Bold", color: "#374151" },
  notes: { fontSize: 10, color: "#374151", lineHeight: 1.4 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb", paddingVertical: 3 },
  headRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#9ca3af", paddingVertical: 3 },
  cell: { flex: 1, paddingRight: 6 },
  cellLabel: { color: "#6b7280" },
  muted: { color: "#9ca3af" },
  red: { color: "#dc2626", fontFamily: "Helvetica-Bold" },
  amber: { color: "#b45309" },
  yellow: { color: "#a16207" },
  green: { color: "#15803d" },
});

export function flagStyle(flag: "red" | "amber" | "yellow" | null) {
  if (flag === "red") return styles.red;
  if (flag === "amber") return styles.amber;
  if (flag === "yellow") return styles.yellow;
  return styles.muted;
}

export function statusStyle(s: "on-track" | "at-risk" | "off-track" | null) {
  if (s === "on-track") return styles.green;
  if (s === "at-risk") return styles.amber;
  if (s === "off-track") return styles.red;
  return styles.muted;
}

export const money = (n: number | null) =>
  n === null ? "No data entered" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
