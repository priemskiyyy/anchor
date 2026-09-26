import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import { describeEndResult } from "example-shared/formatting/describeEndResult";
import { PEOPLE, PERSON_IDS } from "example-shared/world/constants/people";
import { Button } from "src/components/Common/Button";
import { NoticeLine } from "src/components/Common/NoticeLine";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

export const SignInScreen: React.FunctionComponent = () => {
  const lab = useLab();
  const { busy, notice, ended } = useObservable(lab.harbor.view);

  return (
    <View style={styles.screen}>
      {ended === null ? null : (
        <View style={styles.ended}>
          <Text style={styles.endedTitle}>You signed out.</Text>
          {describeEndResult(ended.result, ended.provider).map((line) => (
            <Text key={line} style={styles.line}>
              {line}
            </Text>
          ))}
          {ended.result.navigation === null ? null : (
            <Text style={styles.url}>{ended.result.navigation.url}</Text>
          )}
        </View>
      )}
      <Text accessibilityRole="header" style={styles.title}>
        Sign in to Harbor
      </Text>
      <Text style={styles.line}>Your team&apos;s notes, in one place.</Text>
      {PERSON_IDS.map((person) => (
        <Button
          key={person}
          label={`Continue as ${PEOPLE[person].firstName}`}
          variant="secondary"
          disabled={busy !== null}
          onPress={() => lab.harbor.signIn(person)}
        />
      ))}
      <NoticeLine notice={notice} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flexDirection: "column", gap: 10 },
  ended: {
    flexDirection: "column",
    gap: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f4f4f5",
  },
  endedTitle: { fontSize: 14, fontWeight: "700", color: "#18181b" },
  title: { fontSize: 20, fontWeight: "700", color: "#18181b" },
  line: { fontSize: 13, color: "#52525b" },
  url: { fontSize: 11, fontFamily: "monospace", color: "#71717a" },
});
