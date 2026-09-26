import type {
  AnchorDiagnosticEvent,
  AnchorDiagnosticType,
} from "@priemskiyyy/anchor";

import { formatShortKey } from "example-shared/formatting/formatShortKey";
import { getEventDetail } from "example-shared/formatting/getEventDetail";

type EventDescription = (details: {
  /** The provider as a sentence starts with it. */
  label: string;
  /** The provider as a sentence names it after its first word. */
  name: string;
  key: string;
  context: unknown;
}) => string;

const getProfile = (context: unknown) =>
  getEventDetail(context, "profile") ?? "";

const isForced = (context: unknown) =>
  getEventDetail(context, "forceRefresh") === "true";

const getCode = (context: unknown) => getEventDetail(context, "code") ?? "";

const DESCRIPTIONS = {
  "anchor started": ({ name }) =>
    `Anchor opened the adapter for ${name} and is reading the session.`,
  "anchor start failed": ({ name }) =>
    `Anchor could not open the adapter for ${name}.`,
  "anchor disposed": () =>
    "This Anchor was disposed: its pending work rejected, and later callbacks change nothing.",
  "read started": ({ name }) => `Anchor asked ${name} for the session.`,
  "read completed": ({ label, context }) =>
    `${label} answered ${getEventDetail(context, "status") ?? "the read"}.`,
  "read failed": ({ context }) =>
    `The read failed with ${getCode(context)}, so the state stays as it was.`,
  "read superseded": () =>
    "A read answered after a newer event, so Anchor discarded its answer.",
  "answer invalid": () =>
    "The adapter answered outside the contract, so Anchor refused the answer.",
  "session accepted": ({ key, context }) =>
    getEventDetail(context, "status") === "action-required"
      ? `A new session, blocked on a step, under key ${key}.`
      : `A new session under key ${key}.`,
  "session updated": ({ key }) =>
    `The session under key ${key} changed in place and kept its key.`,
  "session signed out": () =>
    "Signed out, on the provider's word or a completed sign-out.",
  "session unavailable": ({ context }) =>
    `The first read failed with ${getCode(context)}: unavailable, never signed out.`,
  "token requested": ({ key, context }) =>
    `Harbor asked for ${isForced(context) ? "a fresh" : "the"} ${getProfile(context)} token for key ${key}.`,
  "token joined": ({ context }) =>
    `Another caller joined the ${getProfile(context)} token request in flight.`,
  "token received": ({ key, context }) =>
    `The ${getProfile(context)} token for key ${key} arrived.`,
  "token failed": ({ context }) =>
    `The ${getProfile(context)} token request failed with ${getCode(context)}.`,
  "token discarded": ({ key, context }) =>
    `The ${getProfile(context)} token for key ${key} arrived after its session was gone, and Anchor discarded it.`,
  "end started": ({ key }) =>
    `Harbor started ending the session under key ${key}.`,
  "end completed": ({ context }) =>
    `The ending answered: this device ${getEventDetail(context, "local") ?? ""}, the provider ${getEventDetail(context, "remote") ?? ""}.`,
  "end failed": ({ context }) =>
    `The ending failed with ${getCode(context)}, and the session stays.`,
  "callback ignored": ({ context }) =>
    `A late ${getEventDetail(context, "callback") ?? ""} callback reached a disposed Anchor, which ignored it.`,
} satisfies Record<AnchorDiagnosticType, EventDescription>;

/** One diagnostic event as a plain sentence, naming the session by its short key. */
export const describeDiagnosticEvent = (
  event: AnchorDiagnosticEvent,
  { label, name }: { label: string; name: string },
) =>
  DESCRIPTIONS[event.type]({
    label,
    name,
    key: event.session === null ? "none" : formatShortKey(event.session.key),
    context: event.context,
  });
