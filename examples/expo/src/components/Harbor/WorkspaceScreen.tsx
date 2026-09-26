import type { RegisteredSession } from "@priemskiyyy/anchor-react";
import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import { describeCredential } from "example-shared/formatting/describeCredential";
import { describeSlowLoad } from "example-shared/formatting/describeSlowLoad";
import { formatShortKey } from "example-shared/formatting/formatShortKey";
import {
  ORGANIZATION_IDS,
  ORGANIZATIONS,
} from "example-shared/world/constants/organizations";
import { OTHER_PEOPLE, PEOPLE } from "example-shared/world/constants/people";
import { getPersonByEmail } from "example-shared/world/getPersonByEmail";
import { Button } from "src/components/Common/Button";
import { NoticeLine } from "src/components/Common/NoticeLine";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

type WorkspaceScreenProps = { session: RegisteredSession };

export const WorkspaceScreen: React.FunctionComponent<WorkspaceScreenProps> = ({
  session,
}) => {
  const lab = useLab();
  const { busy, notice, workspaces } = useObservable(lab.harbor.view);
  const { provider } = useObservable(lab.runtime);
  const person = getPersonByEmail(session.user.email);
  const workspace = workspaces[session.key];

  if (person === null) {
    return null;
  }

  const other = OTHER_PEOPLE[person];
  const loading = workspace === undefined || workspace.status === "loading";

  return (
    <View style={styles.screen}>
      <Text style={styles.name}>{session.user.name}</Text>
      <Text style={styles.line}>{session.user.email}</Text>
      <View style={styles.row}>
        {ORGANIZATION_IDS.map((organization) => (
          <Button
            key={organization}
            label={ORGANIZATIONS[organization].name}
            variant={
              workspace?.status === "ready" &&
              workspace.organization.id === organization
                ? "primary"
                : "secondary"
            }
            disabled={
              !provider.capabilities.organizations || busy !== null || loading
            }
            onPress={() => lab.harbor.switchOrganization(organization)}
          />
        ))}
      </View>
      {provider.capabilities.organizations ? null : (
        <Text style={styles.small}>
          {provider.label} sessions name no organization.
        </Text>
      )}
      <View style={styles.row}>
        <Button
          label={
            session.user.name === PEOPLE[person].name
              ? "Use short name"
              : "Use full name"
          }
          variant="secondary"
          disabled={busy !== null}
          onPress={() => lab.harbor.rename(session)}
        />
        <Button
          label={`Switch to ${PEOPLE[other].firstName}`}
          variant="secondary"
          disabled={busy !== null}
          onPress={() => lab.harbor.signIn(other)}
        />
        <Button
          label="Sign out"
          variant="primary"
          disabled={busy !== null}
          onPress={() => lab.harbor.signOut(session)}
        />
      </View>
      <NoticeLine notice={notice} />
      <View style={styles.projects}>
        <Text accessibilityRole="header" style={styles.projectsTitle}>
          Projects
          {workspace?.status === "ready"
            ? ` in ${workspace.organization.name}`
            : ""}
        </Text>
        {workspace?.status === "ready"
          ? workspace.projects.map((project) => (
              <Text key={project.id} style={styles.project}>
                {project.name} · {project.notes} notes
              </Text>
            ))
          : null}
        {workspace?.status === "ready" ? (
          <Text style={styles.small}>
            {describeCredential(workspace.credential)}
          </Text>
        ) : null}
        {workspace?.status === "failed" ? (
          <Text style={styles.line}>{workspace.message}</Text>
        ) : null}
        {loading ? (
          <Text style={styles.line}>
            {workspace?.status === "loading" && workspace.slowly
              ? describeSlowLoad(provider)
              : "Loading projects…"}
          </Text>
        ) : null}
        <View style={styles.row}>
          <Button
            label="Reload"
            variant="secondary"
            disabled={loading}
            onPress={() => lab.harbor.loadProjects(session, { slowly: false })}
          />
          <Button
            label="Load slowly"
            variant="secondary"
            disabled={loading}
            onPress={() => lab.harbor.loadProjects(session, { slowly: true })}
          />
        </View>
        <Text style={styles.small}>
          Cached under session key {formatShortKey(session.key)}, so no other
          session can ever see this list.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flexDirection: "column", gap: 10 },
  name: { fontSize: 17, fontWeight: "700", color: "#18181b" },
  line: { fontSize: 13, color: "#52525b" },
  small: { fontSize: 12, color: "#71717a" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  projects: {
    flexDirection: "column",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  projectsTitle: { fontSize: 15, fontWeight: "700", color: "#18181b" },
  project: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#f4f4f5",
    fontSize: 13,
    color: "#27272a",
  },
});
