import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { LoginDto } from "./dto/login.dto";

type FirebaseLoginResponse = {
  idToken: string;
  email: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
};

type FirebaseErrorResponse = {
  error?: {
    message?: string;
  };
};

@Injectable()
export class AuthService {
  async login(dto: LoginDto) {
    const apiKey = process.env.FIREBASE_WEB_API_KEY;

    if (!apiKey) {
      throw new BadRequestException("FIREBASE_WEB_API_KEY não configurada.");
    }

    const isEmulator = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;

    const baseUrl = isEmulator
      ? `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1`
      : "https://identitytoolkit.googleapis.com/v1";

    const response = await fetch(
      `${baseUrl}/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: dto.email.trim().toLowerCase(),
          password: dto.password,
          returnSecureToken: true,
        }),
      }
    );

    const data = (await response.json()) as FirebaseLoginResponse & FirebaseErrorResponse;

    if (!response.ok) {
      const message = data.error?.message ?? "Erro ao fazer login.";

      if (
        message === "INVALID_LOGIN_CREDENTIALS" ||
        message === "EMAIL_NOT_FOUND" ||
        message === "INVALID_PASSWORD"
      ) {
        throw new UnauthorizedException("E-mail ou senha inválidos.");
      }

      throw new UnauthorizedException(message);
    }

    return {
      message: "Login realizado com sucesso.",
      tokenType: "Bearer",
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
      user: {
        id: data.localId,
        email: data.email,
      },
    };
  }
}