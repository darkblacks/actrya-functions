import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  AuthenticatedRequest,
  FirebaseAuthGuard,
} from "../auth/firebase-auth.guard";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { TasksService } from "./tasks.service";

@UseGuards(FirebaseAuthGuard)
@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post("projects/:projectId/tasks")
  create(
    @Req() request: AuthenticatedRequest,
    @Param("projectId") projectId: string,
    @Body() dto: CreateTaskDto
  ) {
    return this.tasksService.create(request.user.uid, projectId, dto);
  }

  @Post("tasks/:taskId/subtasks")
  createSubtask(
    @Req() request: AuthenticatedRequest,
    @Param("taskId") taskId: string,
    @Body() dto: CreateTaskDto
  ) {
    return this.tasksService.findOne(request.user.uid, taskId).then((task: any) =>
      this.tasksService.create(request.user.uid, task.projectId, {
        ...dto,
        parentTaskId: taskId,
      })
    );
  }

  @Get("projects/:projectId/tasks")
  findAllByProject(
    @Req() request: AuthenticatedRequest,
    @Param("projectId") projectId: string
  ) {
    return this.tasksService.findAllByProject(request.user.uid, projectId);
  }

  @Get("kanbans/:kanbanId/tasks")
  findAllByKanban(
    @Req() request: AuthenticatedRequest,
    @Param("kanbanId") kanbanId: string
  ) {
    return this.tasksService.findAllByKanban(request.user.uid, kanbanId);
  }

  @Get("tasks/:taskId")
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param("taskId") taskId: string
  ) {
    return this.tasksService.findOne(request.user.uid, taskId);
  }

  @Get("tasks/:taskId/children")
  findChildren(
    @Req() request: AuthenticatedRequest,
    @Param("taskId") taskId: string
  ) {
    return this.tasksService.findChildren(request.user.uid, taskId);
  }

  @Get("tasks/:taskId/tree")
  findTree(
    @Req() request: AuthenticatedRequest,
    @Param("taskId") taskId: string
  ) {
    return this.tasksService.findTree(request.user.uid, taskId);
  }

  @Patch("tasks/:taskId")
  update(
    @Req() request: AuthenticatedRequest,
    @Param("taskId") taskId: string,
    @Body() dto: UpdateTaskDto
  ) {
    return this.tasksService.update(request.user.uid, taskId, dto);
  }

  @Patch("tasks/:taskId/move/:columnId")
  move(
    @Req() request: AuthenticatedRequest,
    @Param("taskId") taskId: string,
    @Param("columnId") columnId: string
  ) {
    return this.tasksService.move(request.user.uid, taskId, columnId);
  }

  @Delete("tasks/:taskId")
  remove(
    @Req() request: AuthenticatedRequest,
    @Param("taskId") taskId: string
  ) {
    return this.tasksService.remove(request.user.uid, taskId);
  }
}
