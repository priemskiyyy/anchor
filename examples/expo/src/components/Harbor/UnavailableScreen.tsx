import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "src/components/Common/Button";
import { NoticeLine } from "src/components/Common/NoticeLine";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

export const UnavailableScreen: React.FunctionComponent = () => {
  const lab = useLab();
  const { busy, notice } = useObservable(lab.harbor.view);
  const { provider } = useObservable(lab.runtime);

  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>
        We can&apos;t reach the sign-in service
      </Text>
      <Text style={styles.line}>
        Harbor cannot tell whether you are signed in, so it signs nobody out.
        Try again once the network is back.
      </Text>
      <Button
        label="Retry"
        variant="primary"
        disabled={busy !== null}
        onPress={lab.harbor.retry}
      />
      {provider.capabilities.retry === "reload" ? (
        <Text style={styles.line}>
          {provider.label} initializes once per start, so only Reload Harbor
          tries again.
        </Text>
      ) : null}
      <NoticeLine notice={notice} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flexDirection: "column", gap: 10 },
  title: { fontSize: 20, fontWeight: "700", color: "#18181b" },
  line: { fontSize: 13, color: "#52525b" },
});
