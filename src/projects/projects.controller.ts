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
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { ProjectsService } from "./projects.service";

@UseGuards(FirebaseAuthGuard)
@Controller("projects")
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateProjectDto
  ) {
    return this.projectsService.create(request.user.uid, dto);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.projectsService.findAll(request.user.uid);
  }

  @Get(":projectId")
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param("projectId") projectId: string
  ) {
    return this.projectsService.findOne(request.user.uid, projectId);
  }

  @Patch(":projectId")
  update(
    @Req() request: AuthenticatedRequest,
    @Param("projectId") projectId: string,
    @Body() dto: UpdateProjectDto
  ) {
    return this.projectsService.update(request.user.uid, projectId, dto);
  }

  @Delete(":projectId")
  remove(
    @Req() request: AuthenticatedRequest,
    @Param("projectId") projectId: string
  ) {
    return this.projectsService.remove(request.user.uid, projectId);
  }
}