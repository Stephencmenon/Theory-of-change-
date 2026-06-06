import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles, statusStyle, flagStyle, money } from "./styles";
import MetricRows from "./MetricRows";
import type { BoardReport as BoardReportData } from "@/lib/data/report";

// Board report (PRD "Report Template Specs"). @react-pdf/renderer primitives only.
export default function BoardReport({ data }: { data: BoardReportData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 1. Header */}
        <Text style={styles.h1}>{data.orgName}</Text>
        <Text style={styles.meta}>
          Board Report · {data.periodLabel} · generated {data.generatedAt}
        </Text>

        {/* 2. ED Notes */}
        {data.edNotes ? (
          <View style={styles.section}>
            <Text style={styles.h2}>ED Notes</Text>
            <Text style={styles.notes}>{data.edNotes}</Text>
          </View>
        ) : null}

        {/* 3. Program outcomes — all active programs */}
        <View style={styles.section}>
          <Text style={styles.h2}>Program Outcomes</Text>
          {data.programs.map((p) => (
            <View key={p.id} style={{ marginBottom: 8 }}>
              <Text style={styles.h3}>{p.name}</Text>
              <MetricRows metrics={p.metrics} />
            </View>
          ))}
          {data.programs.length === 0 && <Text style={styles.muted}>No active programs.</Text>}
        </View>

        {/* 4. Fundraising summary by category */}
        <View style={styles.section}>
          <Text style={styles.h2}>
            Fundraising Summary{" "}
            <Text style={statusStyle(data.fundraising.orgStatus)}>
              ({data.fundraising.orgStatus ?? "no targets"})
            </Text>
          </Text>
          <View style={styles.headRow}>
            <Text style={styles.cell}>Category</Text>
            <Text style={styles.cell}>Target</Text>
            <Text style={styles.cell}>Actual</Text>
            <Text style={styles.cell}>Status</Text>
          </View>
          {data.fundraising.byCategory.map((c) => (
            <View style={styles.row} key={c.category}>
              <Text style={styles.cell}>{c.category}</Text>
              <Text style={styles.cell}>{c.target === null ? "—" : money(c.target)}</Text>
              <Text style={styles.cell}>{money(c.actual)}</Text>
              <Text style={[styles.cell, statusStyle(c.status)]}>{c.status ?? "—"}</Text>
            </View>
          ))}
        </View>

        {/* 5. Funder deadlines — all active, sorted by proximity (>90d unflagged) */}
        <View style={styles.section}>
          <Text style={styles.h2}>Funder Deadlines</Text>
          <View style={styles.headRow}>
            <Text style={styles.cell}>Funder</Text>
            <Text style={styles.cell}>Next deadline</Text>
            <Text style={styles.cell}>Window</Text>
          </View>
          {data.deadlines.map((d, i) => (
            <View style={styles.row} key={i}>
              <Text style={styles.cell}>{d.name}</Text>
              <Text style={styles.cell}>{d.date ?? "—"}</Text>
              <Text style={[styles.cell, flagStyle(d.flag)]}>{d.flag ?? "—"}</Text>
            </View>
          ))}
          {data.deadlines.length === 0 && <Text style={styles.muted}>No active funders.</Text>}
        </View>
      </Page>
    </Document>
  );
}
