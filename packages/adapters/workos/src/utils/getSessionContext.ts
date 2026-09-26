import type { WorkosRefreshedSession } from "src/types/WorkosRefreshedSession";

export const getSessionContext = ({
  organizationId,
  impersonator,
}: WorkosRefreshedSession) => JSON.stringify([organizationId, impersonator]);
