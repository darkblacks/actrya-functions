import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  AuthenticatedRequest,
  FirebaseAuthGuard,
} from "../auth/firebase-auth.guard";
import { RegisterUserDto } from "./dto/register-user.dto";
import { UpdatePasswordDto } from "./dto/update-password.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post("register")
  register(@Body() dto: RegisterUserDto) {
    return this.usersService.register(dto);
  }

  @UseGuards(FirebaseAuthGuard)
  @Get("me")
  findMe(@Req() request: AuthenticatedRequest) {
    return this.usersService.findMe(request.user.uid);
  }

  @UseGuards(FirebaseAuthGuard)
  @Patch("me")
  updateMe(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateUserDto
  ) {
    return this.usersService.updateMe(request.user.uid, dto);
  }

  @UseGuards(FirebaseAuthGuard)
  @Patch("me/password")
  updatePassword(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdatePasswordDto
  ) {
    return this.usersService.updatePassword(
      request.user.uid,
      dto.newPassword
    );
  }

  @UseGuards(FirebaseAuthGuard)
  @Delete("me")
  deactivateMe(@Req() request: AuthenticatedRequest) {
    return this.usersService.deactivateMe(request.user.uid);
  }
}