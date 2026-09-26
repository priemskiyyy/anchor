import type { BetterAuthSessionStateLike } from "src/types/BetterAuthSessionStateLike";

export const isFetchSettled = ({
  isPending,
  isRefetching,
}: BetterAuthSessionStateLike) => !isPending && !isRefetching;
