import "reflect-metadata";
import express, { Express } from "express";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

let cachedServer: Express | null = null;

export async function createNestServer(): Promise<Express> {
  if (cachedServer) {
    return cachedServer;
  }

  const expressInstance = express();

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance)
  );

  app.enableCors({
    origin: true,
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