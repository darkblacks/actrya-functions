import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateProjectKanbanColumnDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsIn(["backlog", "production", "done", "archived"])
  type!: "backlog" | "production" | "done" | "archived";

  @IsOptional()
  @IsNumber()
  order?: number;
}

export class CreateProjectDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsIn(["active", "paused", "completed", "archived"])
  status?: "active" | "paused" | "completed" | "archived";

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectKanbanColumnDto)
  kanbanColumns?: CreateProjectKanbanColumnDto[];
}
