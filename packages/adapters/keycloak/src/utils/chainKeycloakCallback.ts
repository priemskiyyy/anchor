import type { KeycloakLike } from "src/types/KeycloakLike";

export const chainKeycloakCallback = (
  sdk: KeycloakLike,
  name: "onReady" | "onAuthSuccess" | "onAuthRefreshSuccess" | "onAuthLogout",
  handler: () => void,
) => {
  const assigned = sdk[name];

  const chained = (...args: [authenticated?: boolean]) => {
    handler();
    assigned?.apply(sdk, args);
  };

  sdk[name] = chained;

  return () => {
    if (sdk[name] !== chained) {
      return;
    }

    sdk[name] = assigned;
  };
};
