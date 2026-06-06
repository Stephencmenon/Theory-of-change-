import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles, statusStyle, money } from "./styles";
import MetricRows from "./MetricRows";
import type { FunderReport as FunderReportData } from "@/lib/data/report";

// Funder report (PRD "Report Template Specs"). Linked programs only.
export default function FunderReport({ data }: { data: FunderReportData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 1. Header */}
        <Text style={styles.h1}>{data.orgName}</Text>
        <Text style={styles.meta}>
          Funder Report · {data.funderName} · {data.periodLabel} · generated {data.generatedAt}
        </Text>

        {/* 2. ED Notes */}
        {data.edNotes ? (
          <View style={styles.section}>
            <Text style={styles.h2}>ED Notes</Text>
            <Text style={styles.notes}>{data.edNotes}</Text>
          </View>
        ) : null}

        {/* 3. Program outcomes — linked programs only */}
        <View style={styles.section}>
          <Text style={styles.h2}>Program Outcomes</Text>
          {data.programs.map((p) => (
            <View key={p.id} style={{ marginBottom: 8 }}>
              <Text style={styles.h3}>{p.name}</Text>
              <MetricRows metrics={p.metrics} />
            </View>
          ))}
        </View>

        {/* 4. Funding summary for this funder */}
        <View style={styles.section}>
          <Text style={styles.h2}>Funding Summary</Text>
          <View style={styles.headRow}>
            <Text style={styles.cell}>Category</Text>
            <Text style={styles.cell}>Target</Text>
            <Text style={styles.cell}>Actual</Text>
            <Text style={styles.cell}>Status</Text>
          </View>
          {data.funding.map((c) => (
            <View style={styles.row} key={c.category}>
              <Text style={styles.cell}>{c.category}</Text>
              <Text style={styles.cell}>{c.target === null ? "—" : money(c.target)}</Text>
              <Text style={styles.cell}>{money(c.actual)}</Text>
              <Text style={[styles.cell, statusStyle(c.status)]}>{c.status ?? "—"}</Text>
            </View>
          ))}
        </View>

        {/* 5. Next deadline */}
        <View style={styles.section}>
          <Text style={styles.h2}>Next Deadline</Text>
          <View style={styles.row}>
            <Text style={styles.cell}>Renewal date</Text>
            <Text style={styles.cell}>{data.nextDeadline.renewal ?? "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cell}>Report due date</Text>
            <Text style={styles.cell}>{data.nextDeadline.reportDue ?? "—"}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
