import { Anchor } from "@priemskiyyy/anchor";
import { createMockAdapter } from "@priemskiyyy/anchor/mock";

import { AnchorDevtools } from "src/AnchorDevtools";
import type { AnchorDevtoolsOptions } from "src/types/AnchorDevtoolsOptions";
import type { AnchorDevtoolsProps } from "src/types/AnchorDevtoolsProps";

const typed = new Anchor({
  adapter: createMockAdapter<{ name: string }, "api">({ tokens: { api: {} } })
    .adapter,
});

const untyped = new Anchor<unknown, unknown, string>({
  adapter: createMockAdapter<unknown, string>().adapter,
});

export const forTypedAnchor = new AnchorDevtools({ anchor: typed });

export const forUntypedAnchor = new AnchorDevtools({ anchor: untyped });

export const forDiagnosticsAlone = new AnchorDevtools({
  anchor: { diagnostics: typed.diagnostics },
});

export const leastOptions: AnchorDevtoolsOptions = {
  anchor: { diagnostics: typed.diagnostics },
};

export const withoutDiagnostics = new AnchorDevtools({
  // @ts-expect-error The inspector reads the diagnostics and nothing else.
  anchor: { session: typed.session },
});

export const observedMembers: (keyof AnchorDevtoolsOptions["anchor"])[] = [
  "diagnostics",
  // @ts-expect-error The inspector is given no start, so it can start nothing.
  "start",
  // @ts-expect-error The inspector is given no sync, so it can read nothing.
  "sync",
  // @ts-expect-error The inspector is given no session, so it can mint and end nothing.
  "session",
  // @ts-expect-error The inspector is given no dispose, so it can dispose nothing.
  "dispose",
];

export const wrapperProps: AnchorDevtoolsProps = {
  initialIsOpen: true,
  maxEvents: 500,
  // @ts-expect-error A wrapper reads the Anchor from its binding's provider.
  anchor: typed,
};
