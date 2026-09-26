import { useSession } from "@priemskiyyy/anchor-react";
import type React from "react";
import { StyleSheet, Text } from "react-native";

import { SignInScreen } from "src/components/Harbor/SignInScreen";
import { TwoFactorScreen } from "src/components/Harbor/TwoFactorScreen";
import { UnavailableScreen } from "src/components/Harbor/UnavailableScreen";
import { WorkspaceScreen } from "src/components/Harbor/WorkspaceScreen";

// Harbor's whole screen follows the session state and nothing else.
export const HarborApp: React.FunctionComponent = () => {
  const state = useSession();

  if (state.status === "signed-in") {
    return <WorkspaceScreen session={state.session} />;
  }

  if (state.status === "signed-out") {
    return <SignInScreen />;
  }

  if (state.status === "action-required") {
    return <TwoFactorScreen />;
  }

  if (state.status === "unavailable") {
    return <UnavailableScreen />;
  }

  return <Text style={styles.restoring}>Restoring your session</Text>;
};

const styles = StyleSheet.create({
  restoring: { fontSize: 14, fontWeight: "600", color: "#3f3f46" },
});
