import type { MockAdapter } from "src/mock/types/MockAdapter";
import type { MockAdapterOptions } from "src/mock/types/MockAdapterOptions";
import type { MockEnd } from "src/mock/types/MockEnd";
import type { MockRead } from "src/mock/types/MockRead";
import type { MockSession } from "src/mock/types/MockSession";
import type { MockTokenCall } from "src/mock/types/MockTokenCall";
import type { AdapterSession } from "src/types/AdapterSession";
import type { EndRequest } from "src/types/EndRequest";
import type { EndResult } from "src/types/EndResult";
import type { SessionAnswer } from "src/types/SessionAnswer";
import type { SessionIdentity } from "src/types/SessionIdentity";
import type { SessionObserver } from "src/types/SessionObserver";
import type { Token } from "src/types/Token";
import type { TokenRequest } from "src/types/TokenRequest";
import { AnchorError } from "src/utils/AnchorError";
import { createDeferred } from "src/utils/common/createDeferred";
import { NOT_APPLICABLE_END_RESULT } from "src/utils/constants/end";
import { SIGNED_OUT_SESSION_STATE } from "src/utils/constants/states";

type HeldKind = "read" | "getToken" | "end";

const COMPLETED_END_RESULT: EndResult = Object.freeze({
  local: "completed",
  remote: "not-applicable",
  navigation: null,
});

const isHeldCall = (
  hold: MockAdapterOptions<unknown, string>["hold"],
  kind: HeldKind,
) => {
  if (typeof hold === "boolean") {
    return hold;
  }

  return hold?.[kind] === true;
};

const holdsSession = <TUser>(
  answer: SessionAnswer<TUser>,
  { principal, context }: SessionIdentity,
) =>
  answer.status !== "signed-out" &&
  answer.principal.authority === principal.authority &&
  answer.principal.tenant === principal.tenant &&
  answer.principal.subject === principal.subject &&
  answer.context === context;

/**
 * An adapter for tests that records every call and answers as the test says.
 * By default it behaves as a correct adapter: it mints and ends only for the
 * session a request names. It never guards itself after disposal.
 *
 * @example
 * ```ts
 * const mock = createMockAdapter({ tokens: { api: {} }, hold: { getToken: true } });
 * const anchor = new Anchor({ adapter: mock.adapter });
 *
 * mock.change(signedIn);
 * await anchor.start();
 * ```
 */
export const createMockAdapter = <
  TUser = unknown,
  TProfile extends string = never,
>(
  options: MockAdapterOptions<TUser, TProfile> = {},
): MockAdapter<TUser, TProfile> => {
  const sessions: MockSession<TUser>[] = [];
  const reads: MockRead<TUser>[] = [];
  const tokens: MockTokenCall<TProfile>[] = [];
  const ends: MockEnd[] = [];

  const provider: { answer: SessionAnswer<TUser> } = {
    answer: options.answer ?? SIGNED_OUT_SESSION_STATE,
  };

  let minted = 0;

  const mintDefaultToken = (request: TokenRequest<TProfile>): Token => {
    if (!holdsSession(provider.answer, request.session)) {
      throw new AnchorError({
        code: "SESSION_CHANGED",
        message: "The mock provider holds another session.",
      });
    }

    minted += 1;

    return {
      value: `${request.profile}:${request.session.principal.subject}:${minted}`,
      kind: "access-token",
      scheme: "Bearer",
    };
  };

  const endDefaultSession = (session: SessionIdentity) => {
    if (!holdsSession(provider.answer, session)) {
      return NOT_APPLICABLE_END_RESULT;
    }

    provider.answer = SIGNED_OUT_SESSION_STATE;

    return COMPLETED_END_RESULT;
  };

  const open = (
    observer: SessionObserver<TUser>,
  ): AdapterSession<TUser, TProfile> => {
    if (typeof options.onOpen === "function") {
      options.onOpen(observer);
    }

    const session: MockSession<TUser> = { observer, disposeCount: 0 };

    sessions.push(session);

    return {
      read: (context) => {
        const answer = createDeferred<SessionAnswer<TUser>>();

        reads.push({
          context,
          settle: (next = provider.answer) => answer.resolve(next),
          fail: answer.reject,
        });

        if (!isHeldCall(options.hold, "read")) {
          answer.resolve(provider.answer);
        }

        return answer.promise;
      },
      ...(options.getToken === false
        ? {}
        : {
            getToken: (request: TokenRequest<TProfile>) => {
              const answer = createDeferred<Token>();

              const settle = (token?: Token) => {
                if (token !== undefined) {
                  answer.resolve(token);

                  return;
                }

                try {
                  answer.resolve(mintDefaultToken(request));
                } catch (error) {
                  answer.reject(error);
                }
              };

              tokens.push({ request, settle, fail: answer.reject });

              if (!isHeldCall(options.hold, "getToken")) {
                settle();
              }

              return answer.promise;
            },
          }),
      ...(options.end === false
        ? {}
        : {
            end: (request: EndRequest) => {
              const answer = createDeferred<EndResult>();

              const settle = (result?: EndResult) =>
                answer.resolve(result ?? endDefaultSession(request.session));

              ends.push({ request, settle, fail: answer.reject });

              if (!isHeldCall(options.hold, "end")) {
                settle();
              }

              return answer.promise;
            },
          }),
      dispose: () => {
        session.disposeCount += 1;
      },
    };
  };

  return {
    adapter: {
      name: options.name ?? "mock",
      native: Object.freeze({ name: options.name ?? "mock" }),
      tokens: options.tokens ?? {},
      open,
    },
    sessions,
    reads,
    tokens,
    ends,
    current: () => provider.answer,
    push: (answer) => {
      provider.answer = answer;

      for (const { observer } of [...sessions]) {
        observer.session(answer);
      }
    },
    change: (answer) => {
      provider.answer = answer;
    },
    invalidate: () => {
      for (const { observer } of [...sessions]) {
        observer.invalidate();
      }
    },
  };
};
