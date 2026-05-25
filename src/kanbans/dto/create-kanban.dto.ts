import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateKanbanDto {
  @IsIn(["project", "task"])
  ownerType!: "project" | "task";

  @IsString()
  ownerId!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;
}
