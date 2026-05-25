import { Module } from "@nestjs/common";
import { KanbansModule } from "../kanbans/kanbans.module";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";

@Module({
  imports: [KanbansModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
