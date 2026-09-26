import type React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

type ButtonProps = {
  label: string;
  variant: "primary" | "secondary";
  disabled: boolean;
  onPress: () => void;
};

export const Button: React.FunctionComponent<ButtonProps> = ({
  label,
  variant,
  disabled,
  onPress,
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ disabled }}
    aria-label={label}
    disabled={disabled}
    onPress={onPress}
    style={[
      styles.button,
      variant === "primary" ? styles.primary : styles.secondary,
      disabled ? styles.disabled : null,
    ]}
  >
    <Text
      style={[
        styles.label,
        variant === "primary" ? styles.primaryLabel : styles.secondaryLabel,
      ]}
    >
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  primary: { backgroundColor: "#18181b" },
  secondary: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d4d4d8",
  },
  disabled: { opacity: 0.5 },
  label: { fontSize: 14, fontWeight: "600" },
  primaryLabel: { color: "#ffffff" },
  secondaryLabel: { color: "#18181b" },
});
