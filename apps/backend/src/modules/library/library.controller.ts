import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { LibraryService, CreateBookDto, LoanBookDto } from './library.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtPayload, UserRole } from '@eduplatform/types';

@ApiTags('library')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'library', version: '1' })
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Get('stats')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.LIBRARIAN)
  getStats(@CurrentUser() user: JwtPayload) {
    return this.libraryService.getStats(user);
  }

  @Get('books')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.LIBRARIAN, UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.STUDENT)
  getBooks(@CurrentUser() user: JwtPayload, @Query('search') search?: string) {
    return this.libraryService.getBooks(user, search);
  }

  @Post('books')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.LIBRARIAN)
  createBook(@Body() dto: CreateBookDto, @CurrentUser() user: JwtPayload) {
    return this.libraryService.createBook(dto, user);
  }

  @Put('books/:id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.LIBRARIAN)
  updateBook(@Param('id') id: string, @Body() dto: Partial<CreateBookDto>, @CurrentUser() user: JwtPayload) {
    return this.libraryService.updateBook(id, dto, user);
  }

  @Delete('books/:id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.LIBRARIAN)
  removeBook(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.libraryService.removeBook(id, user);
  }

  @Get('loans')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.LIBRARIAN)
  getLoans(@CurrentUser() user: JwtPayload, @Query('active') active?: string) {
    const activeFilter = active === 'true' ? true : active === 'false' ? false : undefined;
    return this.libraryService.getLoans(user, activeFilter);
  }

  @Post('loans')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.LIBRARIAN)
  loanBook(@Body() dto: LoanBookDto, @CurrentUser() user: JwtPayload) {
    return this.libraryService.loanBook(dto, user);
  }

  @Put('loans/:id/return')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.LIBRARIAN)
  returnBook(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.libraryService.returnBook(id, user);
  }

  @Get('loans/export/pdf')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.LIBRARIAN)
  @ApiOperation({ summary: 'Kitob berish tarixi PDF eksport' })
  @ApiQuery({ name: 'active', required: false, description: 'true = qaytarilmaganlar, false = qaytarilganlar' })
  async exportLoansPdf(
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
    @Query('active') active?: string,
  ) {
    const activeFilter = active === 'true' ? true : active === 'false' ? false : undefined;
    const buffer = await this.libraryService.generateLoanHistoryPdf(user, activeFilter);
    const filename = `kutubxona-tarix-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
