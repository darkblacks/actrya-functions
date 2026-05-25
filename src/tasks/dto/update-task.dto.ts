import {
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsIn(["todo", "doing", "done", "archived"])
  status?: "todo" | "doing" | "done" | "archived";

  @IsOptional()
  @IsIn(["low", "medium", "high", "urgent"])
  priority?: "low" | "medium" | "high" | "urgent";

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsString()
  kanbanId?: string;

  @IsOptional()
  @IsString()
  columnId?: string;

  @IsOptional()
  @IsString()
  parentTaskId?: string | null;

  @IsOptional()
  @IsString()
  rootTaskId?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  depth?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencyIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  path?: string[];
}
