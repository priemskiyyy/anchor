import type { EndRequest, EndResult } from "@priemskiyyy/anchor";

import type { HttpAdapterOptions } from "src/types/HttpAdapterOptions";
import { ENDED_RESULT } from "src/utils/constants/answers";

export const signOutSession = async (
  end: NonNullable<HttpAdapterOptions<unknown, never>["end"]>,
  request: EndRequest,
): Promise<EndResult> => {
  await end(request);

  return ENDED_RESULT;
};
