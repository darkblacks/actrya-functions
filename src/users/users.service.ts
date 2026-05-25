import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { FirebaseService } from "../firebase/firebase.service";
import { RegisterUserDto } from "./dto/register-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(private readonly firebaseService: FirebaseService) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizeUsername(username: string): string {
    return username.trim().toLowerCase();
  }

  async register(dto: RegisterUserDto) {
    const db = this.firebaseService.firestore;

    const email = this.normalizeEmail(dto.email);
    const username = this.normalizeUsername(dto.username);

    const usernameRef = db.collection("usernames").doc(username);
    const usernameAlreadyExists = await usernameRef.get();

    if (usernameAlreadyExists.exists) {
      throw new ConflictException("Nome de usuário já está em uso.");
    }

    await usernameRef.set({
      username,
      reservedAt: new Date(),
    });

    let createdAuthUserUid: string | null = null;

    try {
      const authUser = await this.firebaseService.auth.createUser({
        email,
        password: dto.password,
        displayName: dto.name.trim(),
        disabled: false,
      });

      createdAuthUserUid = authUser.uid;

      const now = new Date();

      const userProfile = {
        id: authUser.uid,
        name: dto.name.trim(),
        username,
        email,
        role: "user",
        status: "active",
        theme: "dark",
        onboardingCompleted: false,
        createdAt: now,
        updatedAt: now,
      };

      await db.collection("users").doc(authUser.uid).set(userProfile);

      await usernameRef.update({
        userId: authUser.uid,
        email,
        confirmedAt: new Date(),
      });

      return {
        message: "Usuário criado com sucesso.",
        user: userProfile,
      };
    } catch (error) {
      await usernameRef.delete().catch(() => undefined);

      if (createdAuthUserUid) {
        await this.firebaseService.auth
          .deleteUser(createdAuthUserUid)
          .catch(() => undefined);
      }

      const firebaseError = error as { code?: string; message?: string };

      if (firebaseError.code === "auth/email-already-exists") {
        throw new ConflictException("E-mail já está em uso.");
      }

      if (firebaseError.code === "auth/invalid-password") {
        throw new BadRequestException("Senha inválida.");
      }

      throw new BadRequestException(
        firebaseError.message ?? "Erro ao criar usuário."
      );
    }
  }

  async findMe(userId: string) {
    const doc = await this.firebaseService.firestore
      .collection("users")
      .doc(userId)
      .get();

    if (!doc.exists) {
      throw new NotFoundException("Perfil de usuário não encontrado.");
    }

    return doc.data();
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    const db = this.firebaseService.firestore;

    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new NotFoundException("Perfil de usuário não encontrado.");
    }

    const currentUser = userDoc.data();

    if (!currentUser) {
      throw new NotFoundException("Perfil de usuário não encontrado.");
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (dto.name) {
      const name = dto.name.trim();

      updateData.name = name;

      await this.firebaseService.auth.updateUser(userId, {
        displayName: name,
      });
    }

    if (dto.theme) {
      updateData.theme = dto.theme;
    }

    if (dto.username) {
      const newUsername = this.normalizeUsername(dto.username);
      const oldUsername = currentUser.username as string | undefined;

      if (newUsername !== oldUsername) {
        const newUsernameRef = db.collection("usernames").doc(newUsername);
        const newUsernameDoc = await newUsernameRef.get();

        if (newUsernameDoc.exists) {
          throw new ConflictException("Nome de usuário já está em uso.");
        }

        await newUsernameRef.set({
          username: newUsername,
          userId,
          email: currentUser.email,
          confirmedAt: new Date(),
        });

        if (oldUsername) {
          await db
            .collection("usernames")
            .doc(oldUsername)
            .delete()
            .catch(() => undefined);
        }

        updateData.username = newUsername;
      }
    }

    await userRef.update(updateData);

    return this.findMe(userId);
  }

  async updatePassword(userId: string, newPassword: string) {
    await this.firebaseService.auth.updateUser(userId, {
      password: newPassword,
    });

    return {
      success: true,
      message: "Senha atualizada com sucesso.",
    };
  }

  async deactivateMe(userId: string) {
    const userRef = this.firebaseService.firestore
      .collection("users")
      .doc(userId);

    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new NotFoundException("Perfil de usuário não encontrado.");
    }

    await userRef.update({
      status: "inactive",
      updatedAt: new Date(),
    });

    await this.firebaseService.auth.updateUser(userId, {
      disabled: true,
    });

    return {
      success: true,
      message: "Usuário desativado com sucesso.",
    };
  }
}