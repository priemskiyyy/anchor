import type React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";
import { TONE_COLORS } from "src/utils/constants/colors";

export const ProviderPicker: React.FunctionComponent = () => {
  const lab = useLab();
  const { provider } = useObservable(lab.runtime);

  return (
    <View aria-label="Provider" style={styles.picker}>
      {lab.catalog.map(({ id, label, icon }) => (
        <Pressable
          key={id}
          accessibilityRole="radio"
          accessibilityState={{ checked: id === provider.id }}
          aria-label={label}
          onPress={() => lab.selectProvider(id)}
          style={[
            styles.chip,
            id === provider.id
              ? { borderColor: TONE_COLORS[icon.tone] }
              : styles.idle,
          ]}
        >
          <Text style={[styles.monogram, { color: TONE_COLORS[icon.tone] }]}>
            {icon.monogram}
          </Text>
          <Text style={styles.label}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  picker: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 2,
    backgroundColor: "#ffffff",
  },
  idle: { borderColor: "#e4e4e7" },
  monogram: { fontSize: 11, fontWeight: "800" },
  label: { fontSize: 13, color: "#18181b" },
});
