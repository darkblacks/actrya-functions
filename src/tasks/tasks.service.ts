import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { FirebaseService } from "../firebase/firebase.service";
import { KanbansService } from "../kanbans/kanbans.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";

type TaskStatus = "todo" | "doing" | "done" | "archived";

@Injectable()
export class TasksService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly kanbansService: KanbansService
  ) {}

  private projectsCollection() {
    return this.firebaseService.firestore.collection("projects");
  }

  private tasksCollection() {
    return this.firebaseService.firestore.collection("tasks");
  }

  private kanbansCollection() {
    return this.firebaseService.firestore.collection("kanbans");
  }

  private columnsCollection() {
    return this.firebaseService.firestore.collection("kanbanColumns");
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

    return {
      id: projectDoc.id,
      ...project,
    };
  }

  private async getFirstColumnForKanban(kanbanId: string) {
    const snapshot = await this.columnsCollection()
      .where("kanbanId", "==", kanbanId)
      .get();

    const columns = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => {
        const orderA = typeof a.order === "number" ? a.order : 0;
        const orderB = typeof b.order === "number" ? b.order : 0;
        return orderA - orderB;
      });

    const initialColumn = columns.find((column: any) => column.isInitial);

    return initialColumn ?? columns[0] ?? null;
  }

  private async getProjectDefaultKanban(userId: string, projectId: string) {
<<<<<<< HEAD
  const project: any = await this.validateProjectAccess(userId, projectId);
=======
    const project: any = await this.validateProjectAccess(userId, projectId);
>>>>>>> afbccb434479ac06023bdbba0409929451a7562c

  if (project.defaultKanbanId) {
    return project.defaultKanbanId as string;
  }

  const snapshot = await this.kanbansCollection()
    .where("ownerType", "==", "project")
    .where("ownerId", "==", projectId)
    .get();

  const existing = snapshot.docs[0];

  if (existing) {
    await this.projectsCollection().doc(projectId).update({
      defaultKanbanId: existing.id,
      updatedAt: new Date(),
    });

    return existing.id;
  }

  const { kanban } = await this.kanbansService.createDefaultKanbanForOwner({
    userId,
    projectId,
    ownerType: "project",
    ownerId: projectId,
    name: "Kanban principal",
    minimalColumns: false,
  });

  await this.projectsCollection().doc(projectId).update({
    defaultKanbanId: kanban.id,
    updatedAt: new Date(),
  });

  return kanban.id;
}

  private statusFromColumn(column: any): TaskStatus {
    if (column?.isFinal) return "done";
    if (column?.key === "doing") return "doing";
    if (column?.key === "done") return "done";
    if (column?.key === "archived") return "archived";
    return "todo";
  }

  async create(userId: string, projectId: string, dto: CreateTaskDto) {
    await this.validateProjectAccess(userId, projectId);

    const now = new Date();
    let parentTask: any | null = null;
    let kanbanId: string | undefined = dto.kanbanId;
    let columnId: string | undefined = dto.columnId;
    let depth = dto.depth ?? 0;
    let rootTaskId = dto.rootTaskId ?? null;
    let path = dto.path ?? [];

    if (dto.parentTaskId) {
      const parentDoc = await this.tasksCollection().doc(dto.parentTaskId).get();

      if (!parentDoc.exists) {
        throw new NotFoundException("Tarefa mãe não encontrada.");
      }

      parentTask = {
        id: parentDoc.id,
        ...parentDoc.data(),
      };

      if (parentTask.projectId !== projectId) {
        throw new BadRequestException("A tarefa mãe não pertence a este projeto.");
      }

      depth = typeof parentTask.depth === "number" ? parentTask.depth + 1 : 1;
      rootTaskId = parentTask.rootTaskId ?? parentTask.id;
      path = [...(parentTask.path ?? []), parentTask.id];

      if (!kanbanId) {
        const kanbanSnapshot = await this.kanbansCollection()
          .where("ownerType", "==", "task")
          .where("ownerId", "==", parentTask.id)
          .get();

        const existingTaskKanban = kanbanSnapshot.docs[0];

        if (!existingTaskKanban) {
          const created = await this.kanbansService.createDefaultKanbanForOwner({
            userId,
            projectId,
            ownerType: "task",
            ownerId: parentTask.id,
            name: "Kanban da tarefa",
            minimalColumns: true,
          });

          kanbanId = created.kanban.id;
        } else {
          kanbanId = existingTaskKanban.id;
        }
      }
    }

    if (!kanbanId) {
      kanbanId = await this.getProjectDefaultKanban(userId, projectId);
    }

    if (!kanbanId) {
      throw new BadRequestException("Não foi possível determinar o Kanban da tarefa.");
    }

    const resolvedKanbanId: string = kanbanId;
    const firstColumn = await this.getFirstColumnForKanban(resolvedKanbanId);

    if (!columnId) {
      if (!firstColumn) {
        throw new BadRequestException("O Kanban não possui colunas configuradas.");
      }

      columnId = firstColumn.id;
    }

    if (!columnId) {
      throw new BadRequestException("Não foi possível determinar a coluna da tarefa.");
    }

    const resolvedColumnId: string = columnId;
    const status = dto.status ?? this.statusFromColumn(firstColumn);

    const taskData = {
      projectId,
      kanbanId: resolvedKanbanId,
      columnId: resolvedColumnId,
      title: dto.title.trim(),
      description: dto.description?.trim() ?? "",
      status,
      priority: dto.priority ?? "medium",
      assigneeId: dto.assigneeId ?? userId,
      ownerId: userId,
      dueDate: dto.dueDate ?? null,
      order: dto.order ?? 0,
      parentTaskId: dto.parentTaskId ?? null,
      rootTaskId,
      depth,
      path,
      dependencyIds: dto.dependencyIds ?? [],
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.tasksCollection().add(taskData);

    await this.kanbansService.createDefaultKanbanForOwner({
      userId,
      projectId,
      ownerType: "task",
      ownerId: docRef.id,
      name: "Kanban da tarefa",
      minimalColumns: true,
    });

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
      .get();

    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a: any, b: any) => {
        const orderA = typeof a.order === "number" ? a.order : 0;
        const orderB = typeof b.order === "number" ? b.order : 0;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        const dateA = a.createdAt?.toDate?.() ?? new Date(0);
        const dateB = b.createdAt?.toDate?.() ?? new Date(0);

        return dateA.getTime() - dateB.getTime();
      });
  }

  async findAllByKanban(userId: string, kanbanId: string) {
    const kanbanDoc = await this.kanbansCollection().doc(kanbanId).get();

    if (!kanbanDoc.exists) {
      throw new NotFoundException("Kanban não encontrado.");
    }

    const kanban = kanbanDoc.data();

    if (!kanban?.projectId) {
      throw new NotFoundException("Kanban inválido.");
    }

    await this.validateProjectAccess(userId, kanban.projectId);

    const snapshot = await this.tasksCollection()
      .where("kanbanId", "==", kanbanId)
      .get();

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => {
        const orderA = typeof a.order === "number" ? a.order : 0;
        const orderB = typeof b.order === "number" ? b.order : 0;
        return orderA - orderB;
      });
  }

<<<<<<< HEAD
async findChildren(userId: string, taskId: string) {
  await this.findOne(userId, taskId);
=======
  async findChildren(userId: string, taskId: string) {
    await this.findOne(userId, taskId);
>>>>>>> afbccb434479ac06023bdbba0409929451a7562c

  const snapshot = await this.tasksCollection()
    .where("parentTaskId", "==", taskId)
    .get();

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => {
        const orderA = typeof a.order === "number" ? a.order : 0;
        const orderB = typeof b.order === "number" ? b.order : 0;
        return orderA - orderB;
      });
  }

  async findTree(userId: string, taskId: string) {
    const task = await this.findOne(userId, taskId);

    const snapshot = await this.tasksCollection()
      .where("path", "array-contains", taskId)
      .get();

    const descendants = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return {
      root: task,
      descendants: descendants.sort((a: any, b: any) => {
        const depthA = typeof a.depth === "number" ? a.depth : 0;
        const depthB = typeof b.depth === "number" ? b.depth : 0;
        if (depthA !== depthB) return depthA - depthB;
        const orderA = typeof a.order === "number" ? a.order : 0;
        const orderB = typeof b.order === "number" ? b.order : 0;
        return orderA - orderB;
      }),
    };
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
    if (dto.kanbanId !== undefined) updateData.kanbanId = dto.kanbanId;
    if (dto.columnId !== undefined) updateData.columnId = dto.columnId;
    if (dto.parentTaskId !== undefined) updateData.parentTaskId = dto.parentTaskId;
    if (dto.rootTaskId !== undefined) updateData.rootTaskId = dto.rootTaskId;
    if (dto.depth !== undefined) updateData.depth = dto.depth;
    if (dto.dependencyIds !== undefined) updateData.dependencyIds = dto.dependencyIds;
    if (dto.path !== undefined) updateData.path = dto.path;

    await docRef.update(updateData);

    await this.projectsCollection().doc(task.projectId).update({
      updatedAt: now,
    });

    return this.findOne(userId, taskId);
  }

  async move(userId: string, taskId: string, columnId: string) {
<<<<<<< HEAD
  const task: any = await this.findOne(userId, taskId);
  const columnDoc = await this.columnsCollection().doc(columnId).get();
=======
    const task: any = await this.findOne(userId, taskId);
    const columnDoc = await this.columnsCollection().doc(columnId).get();
>>>>>>> afbccb434479ac06023bdbba0409929451a7562c

    if (!columnDoc.exists) {
      throw new NotFoundException("Coluna não encontrada.");
    }

    const column = columnDoc.data();

    if (column?.projectId !== task.projectId) {
      throw new BadRequestException("A coluna não pertence ao projeto da tarefa.");
    }

    if (column?.kanbanId !== task.kanbanId) {
      throw new BadRequestException("A coluna não pertence ao Kanban da tarefa.");
    }

    const status = this.statusFromColumn(column);

    return this.update(userId, taskId, {
      columnId,
      status,
    });
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
