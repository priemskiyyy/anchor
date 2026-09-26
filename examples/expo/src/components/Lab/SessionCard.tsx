import { useAnchor, useSession } from "@priemskiyyy/anchor-react";
import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import { STATUS_LABELS } from "example-shared/lab/constants/labels";
import { getAcceptedSession } from "example-shared/utils/getAcceptedSession";
import { Panel } from "src/components/Common/Panel";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

export const SessionCard: React.FunctionComponent = () => {
  const state = useSession();
  const diagnostics = useObservable(useAnchor().diagnostics);
  const change = useObservable(useLab().sessionChange);
  const session = getAcceptedSession(state);

  const fields = [
    { label: "Status", value: STATUS_LABELS[state.status] },
    { label: "Key", value: session?.key ?? "none" },
    { label: "Generation", value: `#${diagnostics.session.generation}` },
    { label: "Authority", value: session?.principal.authority ?? "none" },
    { label: "Subject", value: session?.principal.subject ?? "none" },
  ];

  return (
    <Panel title="What Anchor sees">
      {fields.map(({ label, value }) => (
        <View key={label} style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      ))}
      {change === null ? null : (
        <Text style={styles.change}>{change.reason}</Text>
      )}
    </Panel>
  );
};

const styles = StyleSheet.create({
  field: { flexDirection: "column", gap: 2 },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#71717a",
    textTransform: "uppercase",
  },
  value: { fontSize: 13, fontFamily: "monospace", color: "#27272a" },
  change: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    color: "#1e3a8a",
    fontSize: 13,
  },
});
