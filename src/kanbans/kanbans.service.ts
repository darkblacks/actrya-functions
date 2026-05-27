import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { FirebaseService } from "../firebase/firebase.service";
import { CreateColumnDto } from "./dto/create-column.dto";
import { CreateKanbanDto } from "./dto/create-kanban.dto";
import { UpdateColumnDto } from "./dto/update-column.dto";

type OwnerType = "project" | "task";
type ColumnType = "backlog" | "production" | "done" | "archived";

type KanbanColumnInput = {
  name: string;
  type: ColumnType;
  order?: number;
};

@Injectable()
export class KanbansService {
  constructor(private readonly firebaseService: FirebaseService) {}

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

  private async validateOwnerAndGetProjectId(
    userId: string,
    ownerType: OwnerType,
    ownerId: string
  ) {
    if (ownerType === "project") {
      await this.validateProjectAccess(userId, ownerId);
      return ownerId;
    }

    const taskDoc = await this.tasksCollection().doc(ownerId).get();

    if (!taskDoc.exists) {
      throw new NotFoundException("Tarefa dona do Kanban não encontrada.");
    }

    const task = taskDoc.data();

    if (!task?.projectId) {
      throw new NotFoundException("Tarefa inválida.");
    }

    await this.validateProjectAccess(userId, task.projectId);

    return task.projectId as string;
  }

  private buildProductionColumnKey(name: string, index: number) {
    const normalizedName = name
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return normalizedName || `production-${index + 1}`;
  }

  private normalizeCustomColumns(customColumns: KanbanColumnInput[]) {
    return customColumns
      .map((column, index) => {
        const name = column.name.trim();

        if (!name) {
          return null;
        }

        const key =
          column.type === "production"
            ? this.buildProductionColumnKey(name, index)
            : column.type;

        return {
          name,
          type: column.type,
          key,
          order: column.order ?? index + 1,
          isInitial: column.type === "backlog",
          isFinal: column.type === "done" || column.type === "archived",
        };
      })
      .filter((column): column is NonNullable<typeof column> => Boolean(column));
  }

  private async createDefaultColumns(
    projectId: string,
    kanbanId: string,
    now: Date,
    minimal = false,
    customColumns?: KanbanColumnInput[]
  ) {
    const defaults = customColumns?.length
      ? this.normalizeCustomColumns(customColumns)
      : minimal
        ? [
            {
              name: "A fazer",
              type: "production" as ColumnType,
              key: "todo",
              order: 1,
              isInitial: true,
              isFinal: false,
            },
            {
              name: "Concluído",
              type: "done" as ColumnType,
              key: "done",
              order: 2,
              isInitial: false,
              isFinal: true,
            },
          ]
        : [
            {
              name: "Backlog",
              type: "backlog" as ColumnType,
              key: "backlog",
              order: 1,
              isInitial: true,
              isFinal: false,
            },
            {
              name: "A Fazer",
              type: "production" as ColumnType,
              key: "todo",
              order: 2,
              isInitial: false,
              isFinal: false,
            },
            {
              name: "Em andamento",
              type: "production" as ColumnType,
              key: "doing",
              order: 3,
              isInitial: false,
              isFinal: false,
            },
            {
              name: "Concluído",
              type: "done" as ColumnType,
              key: "done",
              order: 4,
              isInitial: false,
              isFinal: true,
            },
          ];

    const batch = this.firebaseService.firestore.batch();

    const createdColumns = defaults.map((column) => {
      const ref = this.columnsCollection().doc();

      const data = {
        ...column,
        projectId,
        kanbanId,
        createdAt: now,
        updatedAt: now,
      };

      batch.set(ref, data);

      return {
        id: ref.id,
        ...data,
      };
    });

    await batch.commit();

    return createdColumns;
  }

  async createDefaultKanbanForOwner(params: {
    userId: string;
    projectId: string;
    ownerType: OwnerType;
    ownerId: string;
    name?: string;
    minimalColumns?: boolean;
    customColumns?: KanbanColumnInput[];
  }) {
    await this.validateProjectAccess(params.userId, params.projectId);

    const now = new Date();

    const kanbanData = {
      projectId: params.projectId,
      ownerType: params.ownerType,
      ownerId: params.ownerId,
      name:
        params.name ??
        (params.ownerType === "project"
          ? "Kanban principal"
          : "Kanban da tarefa"),
      description: "",
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    };

    const kanbanRef = await this.kanbansCollection().add(kanbanData);

    const columns = await this.createDefaultColumns(
      params.projectId,
      kanbanRef.id,
      now,
      params.minimalColumns ?? params.ownerType === "task",
      params.customColumns
    );

    return {
      kanban: {
        id: kanbanRef.id,
        ...kanbanData,
      },
      columns,
    };
  }

  async create(userId: string, projectId: string, dto: CreateKanbanDto) {
    const ownerProjectId = await this.validateOwnerAndGetProjectId(
      userId,
      dto.ownerType,
      dto.ownerId
    );

    if (ownerProjectId !== projectId) {
      throw new BadRequestException(
        "O dono do Kanban não pertence a este projeto."
      );
    }

    const now = new Date();

    const kanbanData = {
      projectId,
      ownerType: dto.ownerType,
      ownerId: dto.ownerId,
      name:
        dto.name?.trim() ??
        (dto.ownerType === "project"
          ? "Kanban principal"
          : "Kanban da tarefa"),
      description: dto.description?.trim() ?? "",
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    };

    const kanbanRef = await this.kanbansCollection().add(kanbanData);

    const columns = await this.createDefaultColumns(
      projectId,
      kanbanRef.id,
      now,
      dto.ownerType === "task"
    );

    return {
      id: kanbanRef.id,
      ...kanbanData,
      columns,
    };
  }

  async findByProject(userId: string, projectId: string) {
    await this.validateProjectAccess(userId, projectId);

    const snapshot = await this.kanbansCollection()
      .where("projectId", "==", projectId)
      .get();

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate?.() ?? new Date(0);
        const dateB = b.createdAt?.toDate?.() ?? new Date(0);

        return dateA.getTime() - dateB.getTime();
      });
  }

  async findByTask(userId: string, taskId: string) {
    const taskDoc = await this.tasksCollection().doc(taskId).get();

    if (!taskDoc.exists) {
      throw new NotFoundException("Tarefa não encontrada.");
    }

    const task = taskDoc.data();

    if (!task?.projectId) {
      throw new NotFoundException("Tarefa inválida.");
    }

    await this.validateProjectAccess(userId, task.projectId);

    const snapshot = await this.kanbansCollection()
      .where("ownerType", "==", "task")
      .where("ownerId", "==", taskId)
      .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async findColumns(userId: string, kanbanId: string) {
    const kanbanDoc = await this.kanbansCollection().doc(kanbanId).get();

    if (!kanbanDoc.exists) {
      throw new NotFoundException("Kanban não encontrado.");
    }

    const kanban = kanbanDoc.data();

    if (!kanban?.projectId) {
      throw new NotFoundException("Kanban inválido.");
    }

    await this.validateProjectAccess(userId, kanban.projectId);

    const snapshot = await this.columnsCollection()
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

  async createColumn(userId: string, kanbanId: string, dto: CreateColumnDto) {
    const columns = await this.findColumns(userId, kanbanId);

    const kanbanDoc = await this.kanbansCollection().doc(kanbanId).get();
    const kanban = kanbanDoc.data();

    if (!kanban?.projectId) {
      throw new NotFoundException("Kanban inválido.");
    }

    const now = new Date();

    const columnData = {
      projectId: kanban.projectId,
      kanbanId,
      name: dto.name.trim(),
      key: dto.key?.trim() ?? dto.name.trim().toLowerCase().replace(/\s+/g, "-"),
      order: dto.order ?? columns.length + 1,
      isInitial: dto.isInitial ?? false,
      isFinal: dto.isFinal ?? false,
      createdAt: now,
      updatedAt: now,
    };

    const ref = await this.columnsCollection().add(columnData);

    return {
      id: ref.id,
      ...columnData,
    };
  }

  async updateColumn(userId: string, columnId: string, dto: UpdateColumnDto) {
    const columnRef = this.columnsCollection().doc(columnId);

    const columnDoc = await columnRef.get();

    if (!columnDoc.exists) {
      throw new NotFoundException("Coluna não encontrada.");
    }

    const column = columnDoc.data();

    if (!column?.projectId) {
      throw new NotFoundException("Coluna inválida.");
    }

    await this.validateProjectAccess(userId, column.projectId);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (dto.name) updateData.name = dto.name.trim();
    if (dto.key) updateData.key = dto.key.trim();
    if (dto.order !== undefined) updateData.order = dto.order;
    if (dto.isInitial !== undefined) updateData.isInitial = dto.isInitial;
    if (dto.isFinal !== undefined) updateData.isFinal = dto.isFinal;

    await columnRef.update(updateData);

    return {
      id: columnId,
      ...column,
      ...updateData,
    };
  }
}