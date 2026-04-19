import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { DisciplineService, CreateDisciplineDto, ResolveDto } from './discipline.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';

const MANAGERS = [
  UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL,
  UserRole.TEACHER, UserRole.CLASS_TEACHER,
];

@ApiTags('discipline')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'discipline', version: '1' })
export class DisciplineController {
  constructor(private readonly service: DisciplineService) {}

  @Get('stats')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Intizom statistikasi' })
  getStats(@CurrentUser() user: JwtPayload) {
    return this.service.getStats(user);
  }

  @Get()
  @Roles(...MANAGERS)
  @ApiOperation({ summary: 'Intizom hodisalari ro\'yxati' })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiQuery({ name: 'classId',   required: false })
  @ApiQuery({ name: 'from',      required: false })
  @ApiQuery({ name: 'to',        required: false })
  @ApiQuery({ name: 'page',      required: false, type: Number })
  @ApiQuery({ name: 'limit',     required: false, type: Number })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('studentId') studentId?: string,
    @Query('classId')   classId?: string,
    @Query('from')      from?: string,
    @Query('to')        to?: string,
    @Query('page')      page?: number,
    @Query('limit')     limit?: number,
  ) {
    return this.service.findAll(user, {
      studentId, classId, from, to,
      page:  page  ? +page  : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get('student/:studentId')
  @Roles(...MANAGERS)
  @ApiOperation({ summary: 'O\'quvchi intizom tarixi' })
  getStudentHistory(
    @Param('studentId') studentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getStudentHistory(studentId, user);
  }

  @Post()
  @Roles(...MANAGERS)
  @ApiOperation({ summary: 'Intizom hodisasi yaratish' })
  create(@Body() dto: CreateDisciplineDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Patch(':id/resolve')
  @Roles(...MANAGERS)
  @ApiOperation({ summary: 'Hodisani hal qilingan deb belgilash' })
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.resolve(id, dto, user);
  }

  @Delete(':id')
  @Roles(...MANAGERS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hodisani o\'chirish' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user);
  }
}
