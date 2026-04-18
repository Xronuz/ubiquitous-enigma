import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import * as PDFDocument from 'pdfkit';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';

export class CreateBookDto {
  @IsString()
  title: string;

  @IsOptional() @IsString()
  author?: string;

  @IsOptional() @IsString()
  isbn?: string;

  @IsOptional() @IsInt() @Min(1)
  totalCopies?: number;
}

export class LoanBookDto {
  @IsString()
  bookId: string;

  @IsString()
  studentId: string;
}

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async getBooks(currentUser: JwtPayload, search?: string) {
    const where: any = { schoolId: currentUser.schoolId! };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
        { isbn: { contains: search, mode: 'insensitive' } },
      ];
    }
    const books = await this.prisma.libraryBook.findMany({
      where,
      include: { _count: { select: { loans: true } } },
      orderBy: { title: 'asc' },
    });
    return books.map(b => ({
      ...b,
      totalCopies: b.copiesTotal,
      availableCopies: b.copiesAvailable,
    }));
  }

  async createBook(dto: CreateBookDto, currentUser: JwtPayload) {
    const copies = dto.totalCopies ?? 1;
    return this.prisma.libraryBook.create({
      data: {
        schoolId: currentUser.schoolId!,
        title: dto.title,
        author: dto.author,
        isbn: dto.isbn,
        copiesTotal: copies,
        copiesAvailable: copies,
      },
    });
  }

  async updateBook(id: string, dto: Partial<CreateBookDto>, currentUser: JwtPayload) {
    const book = await this.prisma.libraryBook.findFirst({ where: { id, schoolId: currentUser.schoolId! } });
    if (!book) throw new NotFoundException('Kitob topilmadi');
    const data: any = {};
    if (dto.title) data.title = dto.title;
    if (dto.author !== undefined) data.author = dto.author;
    if (dto.isbn !== undefined) data.isbn = dto.isbn;
    return this.prisma.libraryBook.update({ where: { id }, data });
  }

  async removeBook(id: string, currentUser: JwtPayload) {
    const book = await this.prisma.libraryBook.findFirst({ where: { id, schoolId: currentUser.schoolId! } });
    if (!book) throw new NotFoundException('Kitob topilmadi');
    const activeLoans = await this.prisma.libraryLoan.count({ where: { bookId: id, returnDate: null } });
    if (activeLoans > 0) throw new BadRequestException('Kitob qaytarilmagan, o\'chirib bo\'lmaydi');
    return this.prisma.libraryBook.delete({ where: { id } });
  }

  async loanBook(dto: LoanBookDto, currentUser: JwtPayload) {
    // Atomic transaction — race condition oldini oladi (double-booking mumkin emas)
    return this.prisma.$transaction(async (tx) => {
      const book = await tx.libraryBook.findFirst({ where: { id: dto.bookId, schoolId: currentUser.schoolId! } });
      if (!book) throw new NotFoundException('Kitob topilmadi');
      if (book.copiesAvailable < 1) throw new BadRequestException('Kitob nusxasi qolmagan');

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14); // 2 hafta

      const loan = await tx.libraryLoan.create({
        data: {
          schoolId: currentUser.schoolId!,
          bookId: dto.bookId,
          studentId: dto.studentId,
          dueDate,
        },
        include: { book: { select: { title: true } } },
      });

      // Faqat haqiqatan nusxa bo'lsa dekrement qilamiz (atomic check)
      const updated = await tx.libraryBook.updateMany({
        where: { id: dto.bookId, copiesAvailable: { gt: 0 } },
        data: { copiesAvailable: { decrement: 1 } },
      });

      if (updated.count === 0) {
        throw new BadRequestException('Kitob nusxasi qolmagan — boshqa foydalanuvchi oldi');
      }

      return loan;
    });
  }

  async returnBook(loanId: string, currentUser: JwtPayload) {
    const loan = await this.prisma.libraryLoan.findFirst({ where: { id: loanId, schoolId: currentUser.schoolId! } });
    if (!loan) throw new NotFoundException('Ijara yozuvi topilmadi');
    if (loan.returnDate) throw new BadRequestException('Kitob allaqachon qaytarilgan');

    await this.prisma.libraryBook.update({
      where: { id: loan.bookId },
      data: { copiesAvailable: { increment: 1 } },
    });
    return this.prisma.libraryLoan.update({ where: { id: loanId }, data: { returnDate: new Date() } });
  }

  async getLoans(currentUser: JwtPayload, active?: boolean) {
    const where: any = { schoolId: currentUser.schoolId! };
    if (active === true) where.returnDate = null;
    if (active === false) where.returnDate = { not: null };

    const loans = await this.prisma.libraryLoan.findMany({
      where,
      include: { book: { select: { title: true, author: true } } },
      orderBy: { loanDate: 'desc' },
    });

    // Enrich with student info
    const studentIds = [...new Set(loans.map(l => l.studentId))];
    const users = studentIds.length > 0
      ? await this.prisma.user.findMany({ where: { id: { in: studentIds } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    return loans.map(l => ({ ...l, student: userMap[l.studentId] ?? null }));
  }

  // ─── PDF Export: Loan History ────────────────────────────────────────────

  async generateLoanHistoryPdf(currentUser: JwtPayload, active?: boolean): Promise<Buffer> {
    const loans = await this.getLoans(currentUser, active);
    const school = await this.prisma.school.findUnique({
      where: { id: currentUser.schoolId! },
      select: { name: true },
    });

    const now = new Date();

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new (PDFDocument as any)({ margin: 40, size: 'A4' });
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end',  () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const marginL  = 40;
      const pageW    = doc.page.width;
      const contentW = pageW - marginL * 2;

      // Header
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e293b')
         .text(school?.name ?? 'EduPlatform', marginL, 40, { width: contentW, align: 'center' });
      doc.fontSize(10).font('Helvetica').fillColor('#64748b')
         .text('Kutubxona — Kitob Berish Tarixi', { align: 'center' });
      if (active !== undefined) {
        doc.fontSize(9).fillColor('#94a3b8')
           .text(active ? 'Faqat qaytarilmaganlar' : 'Faqat qaytarilganlar', { align: 'center' });
      }
      doc.fontSize(8).fillColor('#94a3b8')
         .text(`Yaratildi: ${now.toLocaleString('uz-UZ')}  — Jami: ${loans.length} ta`, { align: 'right' });
      doc.moveDown(0.8);

      if (loans.length === 0) {
        doc.fontSize(11).fillColor('#64748b').text('Yozuvlar topilmadi.', { align: 'center' });
        doc.end();
        return;
      }

      // Table header
      const COL = { num: 40, student: 60, book: 200, loan: 370, due: 430, return: 490 };
      const rowH = 18;
      let y = doc.y;

      doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(8);
      doc.text('#',           COL.num,     y, { width: 16 });
      doc.text('O\'quvchi',  COL.student,  y, { width: 135 });
      doc.text('Kitob',       COL.book,    y, { width: 165 });
      doc.text('Berilgan',    COL.loan,    y, { width: 55 });
      doc.text('Muddat',      COL.due,     y, { width: 55 });
      doc.text('Qaytarildi',  COL.return,  y, { width: 70 });

      y += rowH;
      doc.moveTo(marginL, y - 4).lineTo(pageW - marginL, y - 4).strokeColor('#cbd5e1').stroke();

      loans.forEach((loan: any, i: number) => {
        if (y > 740) { doc.addPage(); y = 40; }

        const isOverdue = !loan.returnDate && loan.dueDate && new Date(loan.dueDate) < now;
        const bg = isOverdue ? '#fef2f2' : i % 2 === 0 ? '#f8fafc' : '#ffffff';

        doc.fillColor(bg).rect(marginL, y - 2, contentW, rowH - 1).fill();

        const studentName = loan.student
          ? `${loan.student.firstName} ${loan.student.lastName}`
          : loan.studentId.slice(0, 8) + '…';
        const bookTitle = loan.book?.title ?? '—';
        const loanDate  = new Date(loan.loanDate).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const dueDate   = loan.dueDate ? new Date(loan.dueDate).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';
        const retDate   = loan.returnDate ? new Date(loan.returnDate).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';

        doc.fillColor('#0f172a').font('Helvetica').fontSize(7.5);
        doc.text(String(i + 1),  COL.num,    y, { width: 16 });
        doc.text(studentName,    COL.student, y, { width: 135, ellipsis: true });
        doc.text(bookTitle,      COL.book,    y, { width: 165, ellipsis: true });
        doc.text(loanDate,       COL.loan,    y, { width: 55 });
        doc.fillColor(isOverdue ? '#dc2626' : '#0f172a')
           .text(dueDate,        COL.due,     y, { width: 55 });
        doc.fillColor(loan.returnDate ? '#16a34a' : '#94a3b8')
           .font(loan.returnDate ? 'Helvetica' : 'Helvetica-Oblique')
           .text(loan.returnDate ? retDate : 'Qaytarilmagan', COL.return, y, { width: 75 });
        y += rowH;
      });

      // Summary
      const returned  = loans.filter((l: any) => l.returnDate).length;
      const active2   = loans.filter((l: any) => !l.returnDate).length;
      const overdue2  = loans.filter((l: any) => !l.returnDate && new Date(l.dueDate) < now).length;

      y += 6;
      doc.fillColor('#64748b').font('Helvetica').fontSize(8)
         .text(`Qaytarilgan: ${returned}  |  Faol: ${active2}  |  Muddati o'tgan: ${overdue2}`, marginL, y);

      doc.end();
    });
  }

  async getStats(currentUser: JwtPayload) {
    const now = new Date();
    const [totalBooks, activeLoans, overdueLoans, aggResult] = await this.prisma.$transaction([
      this.prisma.libraryBook.count({ where: { schoolId: currentUser.schoolId! } }),
      this.prisma.libraryLoan.count({ where: { schoolId: currentUser.schoolId!, returnDate: null } }),
      this.prisma.libraryLoan.count({ where: { schoolId: currentUser.schoolId!, returnDate: null, dueDate: { lt: now } } }),
      this.prisma.libraryBook.aggregate({
        where: { schoolId: currentUser.schoolId! },
        _sum: { copiesTotal: true, copiesAvailable: true },
      }),
    ]);

    return {
      totalBooks,
      totalCopies: aggResult._sum?.copiesTotal ?? 0,
      availableCopies: aggResult._sum?.copiesAvailable ?? 0,
      activeLoans,
      overdueLoans,
    };
  }
}
