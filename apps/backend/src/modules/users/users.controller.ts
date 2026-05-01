import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  HttpCode, HttpStatus, UseInterceptors, UploadedFile, ParseFilePipe,
  MaxFileSizeValidator, UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { BranchContext } from '@/common/decorators/branch-context.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';

@ApiTags('users')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.ACCOUNTANT, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Barcha foydalanuvchilar ro\'yxati' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, type: String })
  findAll(
    @CurrentUser() user: JwtPayload,
    @BranchContext() branchCtx: string | null,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    return this.usersService.findAll(user, branchCtx, +page, +limit, search, role);
  }

  @Get('me')
  @ApiOperation({ summary: 'O\'z profili' })
  getMe(@CurrentUser('sub') userId: string) {
    return this.usersService.getMe(userId);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Foydalanuvchi ma\'lumoti' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'Yangi foydalanuvchi qo\'shish' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.create(dto, user);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Foydalanuvchini yangilash' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Foydalanuvchini bloklash (soft delete)' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.remove(id, user);
  }

  @Put(':id/restore')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bloklangan foydalanuvchini qayta faollashtirish' })
  restore(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.restore(id, user);
  }

  @Post(':id/link-student/:studentId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Ota-onani o\'quvchiga bog\'lash' })
  linkParentStudent(
    @Param('id') parentId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.linkParentStudent(parentId, studentId, user);
  }

  @Put('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Parol o\'zgartirish' })
  changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, dto);
  }

  @Put('me/avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiOperation({ summary: 'Profil rasmini yangilash (JPEG/PNG/WebP, max 5MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  async updateAvatar(
    @UploadedFile(new ParseFilePipe({
      validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })],
    })) file: Express.Multer.File,
    @CurrentUser('sub') userId: string,
  ) {
    // Upload modulidan foydalanish uchun UploadService inject qilinishi mumkin,
    // hozircha URL ni to'g'ridan-to'g'ri saqlaymiz
    const avatarUrl = `/uploads/avatars/${file.originalname}`;
    return this.usersService.updateAvatar(userId, avatarUrl);
  }

  @Post('import/csv')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SCHOOL_ADMIN)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiOperation({ summary: 'CSV fayldan o\'quvchilarni ommaviy import qilish (max 500 ta)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary', description: 'CSV: firstName,lastName,email,password,phone,classId' } },
    },
  })
  async importCsv(
    @UploadedFile(new ParseFilePipe({
      validators: [new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 })], // 2MB
    })) file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
    @BranchContext() branchCtx: string | null,
  ) {
    return this.usersService.importFromCsv(file.buffer, user, branchCtx);
  }
}
