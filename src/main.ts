import "reflect-metadata";
import express, { Express } from "express";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

let cachedServer: Express | null = null;

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://api-gq54nudtcq-rj.a.run.app",
];

export async function createNestServer(): Promise<Express> {
  if (cachedServer) {
    return cachedServer;
  }

  const expressInstance = express();

  expressInstance.use((request, response, next) => {
    const origin = request.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
      response.setHeader("Access-Control-Allow-Origin", origin);
    }

    response.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PATCH,DELETE,OPTIONS"
    );

    response.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type,Authorization"
    );

    response.setHeader("Access-Control-Allow-Credentials", "true");

    if (request.method === "OPTIONS") {
      response.status(204).send();
      return;
    }

    next();
  });

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance)
  );

  app.enableCors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  app.setGlobalPrefix("api");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  await app.init();

  cachedServer = expressInstance;

  return expressInstance;
}