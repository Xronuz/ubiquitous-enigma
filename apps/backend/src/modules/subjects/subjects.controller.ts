import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/create-subject.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtPayload, UserRole } from '@eduplatform/types';

@ApiTags('subjects')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'subjects', version: '1' })
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get('mine')
  @Roles(UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Menga biriktirilgan fanlar (teacher/class_teacher uchun)' })
  findMine(@CurrentUser() user: JwtPayload) {
    return this.subjectsService.findMine(user);
  }

  @Get()
  @Roles(
    UserRole.DIRECTOR, UserRole.BRANCH_ADMIN,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Fanlar ro\'yxati' })
  findAll(@CurrentUser() user: JwtPayload, @Query('classId') classId?: string) {
    return this.subjectsService.findAll(user, classId);
  }

  @Post()
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'Fan qo\'shish' })
  create(@Body() dto: CreateSubjectDto, @CurrentUser() user: JwtPayload) {
    return this.subjectsService.create(dto, user);
  }

  @Put(':id')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'Fanni yangilash' })
  update(@Param('id') id: string, @Body() dto: UpdateSubjectDto, @CurrentUser() user: JwtPayload) {
    return this.subjectsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Fanni o\'chirish' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.subjectsService.remove(id, user);
  }
}
