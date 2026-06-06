import { Text, View } from "@react-pdf/renderer";
import { styles } from "./styles";
import type { MetricOutcome } from "@/lib/data/outcomes";

// Shared metric-outcome rows used by both report templates. Renders the PRD §11
// display rules: "No data entered" for missing, config warning for no target,
// off-track emphasis otherwise.
export default function MetricRows({ metrics }: { metrics: MetricOutcome[] }) {
  return (
    <View>
      <View style={styles.headRow}>
        <Text style={styles.cell}>Metric</Text>
        <Text style={styles.cell}>Target</Text>
        <Text style={styles.cell}>Actual</Text>
        <Text style={styles.cell}>Status</Text>
      </View>
      {metrics.map((m) => {
        const ytd = m.targetPeriod === "annual" ? " (YTD)" : "";
        return (
          <View style={styles.row} key={m.id}>
            <Text style={styles.cell}>{m.name}</Text>
            <Text style={styles.cell}>
              {m.target === null ? <Text style={styles.muted}>—</Text> : `${m.target} ${m.unit}`}
            </Text>
            <Text style={styles.cell}>
              {m.warning === "no-data" ? (
                <Text style={styles.muted}>No data entered</Text>
              ) : (
                `${m.actual} ${m.unit}${ytd}`
              )}
            </Text>
            <Text style={styles.cell}>
              {m.warning === "no-data" ? (
                <Text style={styles.muted}>—</Text>
              ) : m.warning === "no-target" ? (
                <Text style={styles.amber}>no target set</Text>
              ) : m.offTrack ? (
                <Text style={styles.red}>off-track</Text>
              ) : (
                <Text style={styles.green}>on-track</Text>
              )}
            </Text>
          </View>
        );
      })}
      {metrics.length === 0 && <Text style={styles.muted}>No active metrics.</Text>}
    </View>
  );
}
