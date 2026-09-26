import { vi } from "vitest";

import type { AdapterSession } from "src/types/AdapterSession";
import type { AnchorDiagnosticEvent } from "src/types/AnchorDiagnosticEvent";
import type { EndRequest } from "src/types/EndRequest";
import type { EndResult } from "src/types/EndResult";
import type { SessionIdentity } from "src/types/SessionIdentity";
import type { Token } from "src/types/Token";
import type { TokenRequest } from "src/types/TokenRequest";
import { createDeferred } from "src/utils/common/createDeferred";
import { Diagnostics } from "src/utils/internal/diagnostics/Diagnostics";
import { SessionRecord } from "src/utils/internal/sessions/SessionRecord";

type Profile = "api" | "reports";

type HeldCall<TRequest, TAnswer> = {
  request: TRequest;
  settle: (answer: TAnswer) => void;
  fail: (error: unknown) => void;
};

export const identity: SessionIdentity = Object.freeze({
  principal: Object.freeze({
    authority: "https://login.example.com",
    subject: "ada",
    tenant: null,
  }),
  context: null,
});

export const token: Token = Object.freeze({
  value: "eyJ.access",
  kind: "access-token",
  scheme: "Bearer",
});

export const createRecord = ({
  getToken = true,
  end = true,
  timeout = 1_000,
}: { getToken?: boolean; end?: boolean; timeout?: number } = {}) => {
  const tokens: HeldCall<TokenRequest<Profile>, Token>[] = [];
  const ends: HeldCall<EndRequest, EndResult>[] = [];
  const events: AnchorDiagnosticEvent[] = [];
  const onEnded = vi.fn<(result: EndResult | null) => void>();
  const status = { blocked: false, disposed: false };

  const diagnostics = new Diagnostics({
    getSnapshot: () => ({
      state: "started",
      adapter: { name: "fixture" },
      session: {
        status: "signed-in",
        key: "key-1",
        principal: null,
        generation: 1,
      },
      operations: [],
    }),
    now: () => 0,
  });

  diagnostics.api.events.subscribe((event) => events.push(event));

  const session: AdapterSession<unknown, Profile> = {
    read: () => ({ status: "signed-out" }),
    ...(getToken
      ? {
          getToken: (request) => {
            const answer = createDeferred<Token>();

            tokens.push({
              request,
              settle: answer.resolve,
              fail: answer.reject,
            });

            return answer.promise;
          },
        }
      : {}),
    ...(end
      ? {
          end: (request) => {
            const answer = createDeferred<EndResult>();

            ends.push({ request, settle: answer.resolve, fail: answer.reject });

            return answer.promise;
          },
        }
      : {}),
  };

  const record = new SessionRecord({
    key: "key-1",
    identity,
    tokens: { api: {}, reports: {} },
    session,
    timeout,
    diagnostics,
    isActionRequired: () => status.blocked,
    isDisposed: () => status.disposed,
    onEnded,
  });

  return { record, tokens, ends, events, onEnded, status };
};

export const getTypes = (events: AnchorDiagnosticEvent[]) =>
  events.map(({ type }) => type);
