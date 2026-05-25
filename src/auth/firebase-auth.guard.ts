import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { FirebaseService } from "../firebase/firebase.service";
import { AuthUser } from "./auth-user.interface";

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly firebaseService: FirebaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Token não informado.");
    }

    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      throw new UnauthorizedException("Token inválido.");
    }

    try {
      const decodedToken = await this.firebaseService.auth.verifyIdToken(token);

      request.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
      };

      return true;
    } catch {
      throw new UnauthorizedException("Token inválido ou expirado.");
    }
  }
}