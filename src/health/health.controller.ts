import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  check() {
    return {
      status: "ok",
      app: "Grafion API",
      message: "NestJS rodando dentro do Firebase Functions",
      timestamp: new Date().toISOString(),
    };
  }
}