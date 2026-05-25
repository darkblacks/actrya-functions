import {
  Body,
  Controller,
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
import { CreateColumnDto } from "./dto/create-column.dto";
import { CreateKanbanDto } from "./dto/create-kanban.dto";
import { UpdateColumnDto } from "./dto/update-column.dto";
import { KanbansService } from "./kanbans.service";

@UseGuards(FirebaseAuthGuard)
@Controller()
export class KanbansController {
  constructor(private readonly kanbansService: KanbansService) {}

  @Post("projects/:projectId/kanbans")
  create(
    @Req() request: AuthenticatedRequest,
    @Param("projectId") projectId: string,
    @Body() dto: CreateKanbanDto
  ) {
    return this.kanbansService.create(request.user.uid, projectId, dto);
  }

  @Get("projects/:projectId/kanbans")
  findByProject(
    @Req() request: AuthenticatedRequest,
    @Param("projectId") projectId: string
  ) {
    return this.kanbansService.findByProject(request.user.uid, projectId);
  }

  @Get("tasks/:taskId/kanbans")
  findByTask(
    @Req() request: AuthenticatedRequest,
    @Param("taskId") taskId: string
  ) {
    return this.kanbansService.findByTask(request.user.uid, taskId);
  }

  @Get("kanbans/:kanbanId/columns")
  findColumns(
    @Req() request: AuthenticatedRequest,
    @Param("kanbanId") kanbanId: string
  ) {
    return this.kanbansService.findColumns(request.user.uid, kanbanId);
  }

  @Post("kanbans/:kanbanId/columns")
  createColumn(
    @Req() request: AuthenticatedRequest,
    @Param("kanbanId") kanbanId: string,
    @Body() dto: CreateColumnDto
  ) {
    return this.kanbansService.createColumn(request.user.uid, kanbanId, dto);
  }

  @Patch("columns/:columnId")
  updateColumn(
    @Req() request: AuthenticatedRequest,
    @Param("columnId") columnId: string,
    @Body() dto: UpdateColumnDto
  ) {
    return this.kanbansService.updateColumn(request.user.uid, columnId, dto);
  }
}
