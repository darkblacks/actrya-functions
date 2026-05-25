import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { FirebaseService } from "../firebase/firebase.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";

@Injectable()
export class TasksService {
  constructor(private readonly firebaseService: FirebaseService) {}

  private projectsCollection() {
    return this.firebaseService.firestore.collection("projects");
  }

  private tasksCollection() {
    return this.firebaseService.firestore.collection("tasks");
  }

  private async validateProjectAccess(userId: string, projectId: string) {
    const projectDoc = await this.projectsCollection().doc(projectId).get();

    if (!projectDoc.exists) {
      throw new NotFoundException("Projeto não encontrado.");
    }

    const project = projectDoc.data();

    if (!project?.memberIds?.includes(userId)) {
      throw new ForbiddenException("Você não tem acesso a este projeto.");
    }

    return project;
  }

  async create(userId: string, projectId: string, dto: CreateTaskDto) {
    await this.validateProjectAccess(userId, projectId);

    const now = new Date();

    const taskData = {
      projectId,
      title: dto.title.trim(),
      description: dto.description?.trim() ?? "",
      status: dto.status ?? "todo",
      priority: dto.priority ?? "medium",
      assigneeId: dto.assigneeId ?? userId,
      ownerId: userId,
      dueDate: dto.dueDate ?? null,
      order: dto.order ?? 0,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.tasksCollection().add(taskData);

    await this.projectsCollection().doc(projectId).update({
      updatedAt: now,
    });

    return {
      id: docRef.id,
      ...taskData,
    };
  }

  async findAllByProject(userId: string, projectId: string) {
    await this.validateProjectAccess(userId, projectId);

    const snapshot = await this.tasksCollection()
      .where("projectId", "==", projectId)
      .orderBy("order", "asc")
      .orderBy("createdAt", "asc")
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  async findOne(userId: string, taskId: string) {
    const doc = await this.tasksCollection().doc(taskId).get();

    if (!doc.exists) {
      throw new NotFoundException("Tarefa não encontrada.");
    }

    const task = doc.data();

    if (!task?.projectId) {
      throw new NotFoundException("Tarefa inválida.");
    }

    await this.validateProjectAccess(userId, task.projectId);

    return {
      id: doc.id,
      ...task,
    };
  }

  async update(userId: string, taskId: string, dto: UpdateTaskDto) {
    const docRef = this.tasksCollection().doc(taskId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException("Tarefa não encontrada.");
    }

    const task = doc.data();

    if (!task?.projectId) {
      throw new NotFoundException("Tarefa inválida.");
    }

    await this.validateProjectAccess(userId, task.projectId);

    const now = new Date();

    const updateData: Record<string, unknown> = {
      updatedAt: now,
    };

    if (dto.title) updateData.title = dto.title.trim();

    if (dto.description !== undefined) {
      updateData.description = dto.description.trim();
    }

    if (dto.status) updateData.status = dto.status;
    if (dto.priority) updateData.priority = dto.priority;
    if (dto.assigneeId !== undefined) updateData.assigneeId = dto.assigneeId;
    if (dto.dueDate !== undefined) updateData.dueDate = dto.dueDate;
    if (dto.order !== undefined) updateData.order = dto.order;

    await docRef.update(updateData);

    await this.projectsCollection().doc(task.projectId).update({
      updatedAt: now,
    });

    return this.findOne(userId, taskId);
  }

  async remove(userId: string, taskId: string) {
    const docRef = this.tasksCollection().doc(taskId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException("Tarefa não encontrada.");
    }

    const task = doc.data();

    if (!task?.projectId) {
      throw new NotFoundException("Tarefa inválida.");
    }

    await this.validateProjectAccess(userId, task.projectId);

    const now = new Date();

    await docRef.update({
      status: "archived",
      archivedAt: now,
      updatedAt: now,
    });

    await this.projectsCollection().doc(task.projectId).update({
      updatedAt: now,
    });

    return {
      success: true,
      message: "Tarefa arquivada com sucesso.",
    };
  }
}