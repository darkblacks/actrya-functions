import { onRequest } from "firebase-functions/v2/https";
import { createNestServer } from "./main";

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://api-gq54nudtcq-rj.a.run.app",
];

function applyCorsHeaders(request: any, response: any) {
  const origin = request.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
  }

  response.setHeader("Vary", "Origin");

  response.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,DELETE,OPTIONS"
  );

  response.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization"
  );

  response.setHeader("Access-Control-Allow-Credentials", "true");
}

export const api = onRequest(
  {
    region: "southamerica-east1",
    memory: "512MiB",
    timeoutSeconds: 60,
    cors: false,
  },
  async (request, response) => {
    applyCorsHeaders(request, response);

    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }

    const server = await createNestServer();
    return server(request, response);
  }
);