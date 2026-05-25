import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { FirebaseModule } from "./firebase/firebase.module";
import { HealthModule } from "./health/health.module";
import { KanbansModule } from "./kanbans/kanbans.module";
import { ProjectsModule } from "./projects/projects.module";
import { TasksModule } from "./tasks/tasks.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    FirebaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
    ProjectsModule,
    TasksModule,
    KanbansModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
