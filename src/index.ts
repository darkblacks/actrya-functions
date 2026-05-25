import { onRequest } from "firebase-functions/v2/https";
import { createNestServer } from "./main";

export const api = onRequest(
  {
    region: "southamerica-east1",
    memory: "512MiB",
    timeoutSeconds: 60,
  },
  async (request, response) => {
    const server = await createNestServer();
    return server(request, response);
  }
);