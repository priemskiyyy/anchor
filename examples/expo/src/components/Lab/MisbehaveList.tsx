import { useSession } from "@priemskiyyy/anchor-react";
import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import { getMisbehaviorRows } from "example-shared/lab/getMisbehaviorRows";
import { Button } from "src/components/Common/Button";
import { Panel } from "src/components/Common/Panel";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

export const MisbehaveList: React.FunctionComponent = () => {
  const lab = useLab();
  const { provider } = useObservable(lab.runtime);
  const world = useObservable(lab.world);
  const misbehaving = useObservable(lab.misbehaving);
  const status = useSession((state) => state.status);

  return (
    <Panel title="Make the provider misbehave">
      {getMisbehaviorRows(provider, status, world).map(
        ({ misbehavior, available, note, on }) => (
          <View key={misbehavior.id} style={styles.item}>
            <Button
              label={on ? `${misbehavior.label}: on` : misbehavior.label}
              variant={on ? "primary" : "secondary"}
              disabled={misbehaving !== null || !available}
              onPress={() => lab.misbehave(misbehavior.id)}
            />
            <Text style={styles.note}>{note}</Text>
          </View>
        ),
      )}
    </Panel>
  );
};

const styles = StyleSheet.create({
  item: { flexDirection: "column", gap: 6 },
  note: { fontSize: 12, lineHeight: 17, color: "#52525b" },
});
