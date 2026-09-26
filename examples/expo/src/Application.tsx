import { AnchorProvider } from "@priemskiyyy/anchor-react";
import type React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import type { SessionLab } from "example-shared/lab/types/SessionLab";
import { Button } from "src/components/Common/Button";
import { Panel } from "src/components/Common/Panel";
import { HarborApp } from "src/components/Harbor/HarborApp";
import { MisbehaveList } from "src/components/Lab/MisbehaveList";
import { ProviderPicker } from "src/components/Lab/ProviderPicker";
import { SessionCard } from "src/components/Lab/SessionCard";
import { LabContext } from "src/context/LabContext";
import { useObservable } from "src/hooks/useObservable";

type ApplicationProps = { lab: SessionLab };

export const Application: React.FunctionComponent<ApplicationProps> = ({
  lab,
}) => {
  const runtime = useObservable(lab.runtime);

  const handleReloadPress = () => {
    lab.reload();
  };

  const handleResetPress = () => {
    lab.reset();
  };

  return (
    <LabContext.Provider value={lab}>
      <AnchorProvider anchor={runtime.anchor}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              Session Lab on Expo
            </Text>
            <Text style={styles.intro}>
              Harbor over real Anchor adapters, on React Native. Send the app to
              the background and back: the foreground hint reads again.
            </Text>
            <ProviderPicker />
            <View style={styles.row}>
              <Button
                label="Reload Harbor"
                variant="secondary"
                disabled={false}
                onPress={handleReloadPress}
              />
              <Button
                label="Reset"
                variant="secondary"
                disabled={false}
                onPress={handleResetPress}
              />
            </View>
          </View>
          <Panel title={`Your app, on ${runtime.provider.name}`}>
            <HarborApp />
          </Panel>
          <SessionCard />
          <MisbehaveList />
        </ScrollView>
      </AnchorProvider>
    </LabContext.Provider>
  );
};

const styles = StyleSheet.create({
  content: {
    flexDirection: "column",
    gap: 16,
    padding: 16,
    backgroundColor: "#fafafa",
  },
  header: { flexDirection: "column", gap: 10 },
  title: { fontSize: 20, fontWeight: "700", color: "#18181b" },
  intro: { fontSize: 13, color: "#52525b" },
  row: { flexDirection: "row", gap: 8 },
});
