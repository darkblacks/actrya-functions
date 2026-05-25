import { Module } from "@nestjs/common";
import { KanbansModule } from "../kanbans/kanbans.module";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";

@Module({
  imports: [KanbansModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
