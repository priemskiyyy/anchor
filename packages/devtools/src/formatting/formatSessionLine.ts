import type { AnchorSnapshot } from "@priemskiyyy/anchor";

export const formatSessionLine = ({
  adapter,
  session,
}: Pick<AnchorSnapshot, "adapter" | "session">) => {
  const parts = [
    adapter.name,
    session.status,
    `generation #${session.generation}`,
  ];

  if (session.key !== null) {
    parts.push(`key ${session.key}`);
  }

  return parts.join(" · ");
};
