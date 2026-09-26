import type { RegisteredSession } from "@priemskiyyy/anchor-react";
import type React from "react";
import type { ChangeEvent } from "react";
import { useId } from "react";

import {
  ORGANIZATION_IDS,
  ORGANIZATIONS,
} from "example-shared/world/constants/organizations";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

type OrganizationPickerProps = { session: RegisteredSession };

export const OrganizationPicker: React.FunctionComponent<
  OrganizationPickerProps
> = ({ session }) => {
  const lab = useLab();
  const { busy, workspaces } = useObservable(lab.harbor.view);
  const { provider } = useObservable(lab.runtime);
  const reasonId = useId();
  const workspace = workspaces[session.key];

  const current =
    workspace?.status === "ready" ? workspace.organization.id : "";

  const handleOrganizationChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const organization = ORGANIZATION_IDS.find(
      (id) => id === event.target.value,
    );

    if (organization === undefined) {
      return;
    }

    lab.harbor.switchOrganization(organization);
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <label className="flex items-center gap-2 text-sm">
        <span className="font-medium text-zinc-600 dark:text-zinc-400">
          Organization
        </span>
        <select
          value={current}
          aria-describedby={
            provider.capabilities.organizations ? undefined : reasonId
          }
          disabled={
            !provider.capabilities.organizations ||
            current === "" ||
            busy !== null
          }
          onChange={handleOrganizationChange}
          className="h-8 rounded-lg border border-zinc-300 bg-white px-2 text-sm disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {current === "" ? <option value="">Loading…</option> : null}
          {ORGANIZATION_IDS.map((id) => (
            <option key={id} value={id}>
              {ORGANIZATIONS[id].name}
            </option>
          ))}
        </select>
      </label>
      {provider.capabilities.organizations ? null : (
        <p id={reasonId} className="text-xs text-zinc-500 dark:text-zinc-400">
          {provider.label} sessions name no organization.
        </p>
      )}
    </div>
  );
};
