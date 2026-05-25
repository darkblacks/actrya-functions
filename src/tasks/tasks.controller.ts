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

  @Get("projects/:projectId/tasks")
  findAllByProject(
    @Req() request: AuthenticatedRequest,
    @Param("projectId") projectId: string
  ) {
    return this.tasksService.findAllByProject(request.user.uid, projectId);
  }

  @Get("tasks/:taskId")
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param("taskId") taskId: string
  ) {
    return this.tasksService.findOne(request.user.uid, taskId);
  }

  @Patch("tasks/:taskId")
  update(
    @Req() request: AuthenticatedRequest,
    @Param("taskId") taskId: string,
    @Body() dto: UpdateTaskDto
  ) {
    return this.tasksService.update(request.user.uid, taskId, dto);
  }

  @Delete("tasks/:taskId")
  remove(
    @Req() request: AuthenticatedRequest,
    @Param("taskId") taskId: string
  ) {
    return this.tasksService.remove(request.user.uid, taskId);
  }
}