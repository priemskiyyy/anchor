import type React from "react";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

type PanelProps = { title: string; children: ReactNode };

export const Panel: React.FunctionComponent<PanelProps> = ({
  title,
  children,
}) => (
  <View aria-label={title} style={styles.panel}>
    <Text accessibilityRole="header" style={styles.title}>
      {title}
    </Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  panel: {
    flexDirection: "column",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    backgroundColor: "#ffffff",
  },
  title: { fontSize: 16, fontWeight: "700", color: "#18181b" },
});
