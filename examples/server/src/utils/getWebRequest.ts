import type { IncomingMessage } from "node:http";

import { MAXIMUM_BODY_SIZE, SERVER_ORIGIN } from "src/utils/constants/server";

const readBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const input: unknown = chunk;
    const bytes = typeof input === "string" ? Buffer.from(input) : input;

    if (!Buffer.isBuffer(bytes)) {
      throw new Error("Expected a byte stream.");
    }

    size += bytes.length;

    if (size > MAXIMUM_BODY_SIZE) {
      throw new Error("The request body is too large.");
    }

    chunks.push(bytes);
  }

  return Buffer.concat(chunks);
};

/** A Node request as the Fetch API's `Request`, which the handler and Better Auth take. */
export const getWebRequest = async (request: IncomingMessage) => {
  const method = request.method ?? "GET";
  const headers = new Headers();

  for (const [name, value] of Object.entries(request.headers)) {
    if (value === undefined) {
      continue;
    }

    for (const item of Array.isArray(value) ? value : [value]) {
      headers.append(name, item);
    }
  }

  return new Request(new URL(request.url ?? "/", SERVER_ORIGIN), {
    method,
    headers,
    ...(method === "GET" || method === "HEAD"
      ? {}
      : { body: await readBody(request) }),
  });
};
