import { createServer } from "node:http";

import { createAuthServer } from "src/createAuthServer";
import { createSessionHandler } from "src/createSessionHandler";
import { SERVER_ORIGIN, SERVER_PORT } from "src/utils/constants/server";
import { getWebRequest } from "src/utils/getWebRequest";
import { sendWebResponse } from "src/utils/sendWebResponse";

const handleRequest = createSessionHandler(createAuthServer());

const server = createServer((request, response) => {
  getWebRequest(request)
    .then(handleRequest)
    .then((answer) => sendWebResponse(response, answer))
    .catch(() => {
      response.writeHead(400).end();
    });
});

server.listen(SERVER_PORT, "127.0.0.1", () => {
  console.log(`Session Lab server: ${SERVER_ORIGIN}/`);
});

const handleShutdown = () => {
  server.close();
  server.closeAllConnections();
};

process.once("SIGINT", handleShutdown);
process.once("SIGTERM", handleShutdown);
