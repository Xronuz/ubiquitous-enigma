import {
  Controller, Get, Post, Put, Delete, Body, Param, Version,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { IsArray, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';

class PromotionItemDto {
  @ApiProperty() @IsUUID() fromClassId: string;
  @ApiProperty() @IsUUID() toClassId: string;
}

class PromoteStudentsDto {
  @ApiProperty({ type: [PromotionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromotionItemDto)
  promotions: PromotionItemDto[];
}

@ApiTags('classes')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'classes', version: '1' })
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get('my-class')
  @Roles(UserRole.CLASS_TEACHER, UserRole.TEACHER)
  @ApiOperation({ summary: 'O\'z sinfi (class_teacher/teacher)' })
  findMyClass(@CurrentUser() user: JwtPayload) {
    return this.classesService.findMyClass(user);
  }

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Sinflar ro\'yxati' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.classesService.findAll(user);
  }

  @Get(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Sinf ma\'lumoti' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.classesService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Yangi sinf yaratish' })
  create(@Body() dto: CreateClassDto, @CurrentUser() user: JwtPayload) {
    return this.classesService.create(dto, user);
  }

  @Put(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Sinfni yangilash' })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateClassDto>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.classesService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.SCHOOL_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sinfni o\'chirish' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.classesService.remove(id, user);
  }

  @Get(':id/students')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Sinfdagi o\'quvchilar ro\'yxati' })
  getStudents(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.classesService.getStudents(id, user);
  }

  @Post(':id/students/:studentId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'O\'quvchini sinfga qo\'shish' })
  addStudent(
    @Param('id') classId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.classesService.addStudent(classId, studentId, user);
  }

  @Delete(':id/students/:studentId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'O\'quvchini sinfdan chiqarish' })
  removeStudent(
    @Param('id') classId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.classesService.removeStudent(classId, studentId, user);
  }

  @Post('promote')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'O\'quvchilarni yangi o\'quv yiliga ko\'chirish' })
  promoteStudents(@Body() dto: PromoteStudentsDto, @CurrentUser() user: JwtPayload) {
    return this.classesService.promoteStudents(dto.promotions, user);
  }
}
