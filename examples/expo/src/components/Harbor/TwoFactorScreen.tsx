import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "src/components/Common/Button";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

export const TwoFactorScreen: React.FunctionComponent = () => {
  const lab = useLab();
  const { busy } = useObservable(lab.harbor.view);

  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>
        Finish setting up two-factor
      </Text>
      <Text style={styles.line}>
        Your organization asks for a second factor before Harbor opens. Your
        session is kept, and it mints no tokens until then.
      </Text>
      <Button
        label="Set up two-factor"
        variant="primary"
        disabled={busy !== null}
        onPress={lab.harbor.completeAction}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flexDirection: "column", gap: 10 },
  title: { fontSize: 20, fontWeight: "700", color: "#18181b" },
  line: { fontSize: 13, color: "#52525b" },
});
