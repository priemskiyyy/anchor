import type { ServerResponse } from "node:http";

/** Writes the Fetch API's `Response` to Node's, each `set-cookie` as a header of its own. */
export const sendWebResponse = async (
  response: ServerResponse,
  answer: Response,
) => {
  const body = Buffer.from(await answer.arrayBuffer());

  response.writeHead(answer.status, [...answer.headers].flat());
  response.end(body);
};
