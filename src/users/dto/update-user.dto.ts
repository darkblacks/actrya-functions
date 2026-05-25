import { IsIn, IsOptional, IsString, Matches, MinLength } from "class-validator";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      "O nome de usuário deve conter apenas letras, números, ponto, underline ou hífen.",
  })
  username?: string;

  @IsOptional()
  @IsIn(["light", "dark"])
  theme?: "light" | "dark";
}