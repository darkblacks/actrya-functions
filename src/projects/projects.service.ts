import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { FirebaseService } from "../firebase/firebase.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";

@Injectable()
export class ProjectsService {
  constructor(private readonly firebaseService: FirebaseService) {}

  private collection() {
    return this.firebaseService.firestore.collection("projects");
  }

  async create(userId: string, dto: CreateProjectDto) {
    const now = new Date();

    const projectData = {
      name: dto.name.trim(),
      description: dto.description?.trim() ?? "",
      color: dto.color ?? "#7C3AED",
      status: dto.status ?? "active",
      ownerId: userId,
      memberIds: [userId],
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.collection().add(projectData);

    return {
      id: docRef.id,
      ...projectData,
    };
  }

  async findAll(userId: string) {
    const snapshot = await this.collection()
      .where("memberIds", "array-contains", userId)
      .orderBy("updatedAt", "desc")
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  async findOne(userId: string, projectId: string) {
    const doc = await this.collection().doc(projectId).get();

    if (!doc.exists) {
      throw new NotFoundException("Projeto não encontrado.");
    }

    const project = doc.data();

    if (!project?.memberIds?.includes(userId)) {
      throw new ForbiddenException("Você não tem acesso a este projeto.");
    }

    return {
      id: doc.id,
      ...project,
    };
  }

  async update(userId: string, projectId: string, dto: UpdateProjectDto) {
    const docRef = this.collection().doc(projectId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException("Projeto não encontrado.");
    }

    const project = doc.data();

    if (project?.ownerId !== userId) {
      throw new ForbiddenException("Apenas o dono pode editar este projeto.");
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (dto.name) updateData.name = dto.name.trim();
    if (dto.description !== undefined) {
      updateData.description = dto.description.trim();
    }
    if (dto.color) updateData.color = dto.color;
    if (dto.status) updateData.status = dto.status;

    await docRef.update(updateData);

    return this.findOne(userId, projectId);
  }

  async remove(userId: string, projectId: string) {
    const docRef = this.collection().doc(projectId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException("Projeto não encontrado.");
    }

    const project = doc.data();

    if (project?.ownerId !== userId) {
      throw new ForbiddenException("Apenas o dono pode excluir este projeto.");
    }

    await docRef.update({
      status: "archived",
      archivedAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      success: true,
      message: "Projeto arquivado com sucesso.",
    };
  }
}