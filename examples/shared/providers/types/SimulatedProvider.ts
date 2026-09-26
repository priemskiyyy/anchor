import type { LabAdapter } from "example-shared/providers/types/LabAdapter";
import type { MisbehaviorId } from "example-shared/providers/types/MisbehaviorId";
import type { OrganizationId } from "example-shared/world/types/OrganizationId";
import type { PersonId } from "example-shared/world/types/PersonId";

/**
 * One provider built over the world: the real adapter over its simulated SDK,
 * the provider's own calls Harbor makes on that SDK, and the lab's knobs that
 * make the SDK misbehave.
 */
export type SimulatedProvider = {
  adapter: LabAdapter;
  /** The provider's own sign-in, which a real app calls on the SDK Anchor holds as `native`. */
  signIn: (person: PersonId, organization: OrganizationId) => Promise<void>;
  /** The provider's own profile update, renaming whoever the SDK holds. */
  rename: (name: string) => Promise<void>;
  /** The provider's own organization switch, or `null` when its sessions name none. */
  switchOrganization: ((organization: OrganizationId) => Promise<void>) | null;
  /** The step that finishes a blocked session, or `null` when the provider blocks none. */
  completeAction: (() => Promise<void>) | null;
  misbehaviors: Partial<Record<MisbehaviorId, () => Promise<void>>>;
};
