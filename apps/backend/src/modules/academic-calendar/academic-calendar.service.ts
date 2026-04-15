import { Injectable, NotFoundException } from '@nestjs/common';
import { IsString, IsOptional, IsDateString, IsBoolean, IsEnum } from 'class-validator';
import * as PDFDocument from 'pdfkit';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';

export enum AcademicEventType {
  HOLIDAY       = 'holiday',
  EXAM_WEEK     = 'exam_week',
  QUARTER_START = 'quarter_start',
  QUARTER_END   = 'quarter_end',
  SCHOOL_EVENT  = 'school_event',
  MEETING       = 'meeting',
  OTHER         = 'other',
}

export class CreateAcademicEventDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(AcademicEventType) type?: AcademicEventType;
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
  @IsOptional() @IsBoolean() allDay?: boolean;
  @IsOptional() @IsString() color?: string;
}

@Injectable()
export class AcademicCalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(currentUser: JwtPayload, from?: string, to?: string) {
    const where: any = { schoolId: currentUser.schoolId! };
    if (from || to) {
      where.startDate = {};
      if (from) where.startDate.gte = new Date(from);
      if (to)   where.startDate.lte = new Date(to);
    }
    return this.prisma.academicEvent.findMany({
      where,
      orderBy: { startDate: 'asc' },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const event = await this.prisma.academicEvent.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!event) throw new NotFoundException('Tadbir topilmadi');
    return event;
  }

  async create(dto: CreateAcademicEventDto, currentUser: JwtPayload) {
    return this.prisma.academicEvent.create({
      data: {
        schoolId:    currentUser.schoolId!,
        createdById: currentUser.sub,
        title:       dto.title,
        description: dto.description,
        type:        (dto.type ?? AcademicEventType.OTHER) as any,
        startDate:   new Date(dto.startDate),
        endDate:     new Date(dto.endDate),
        allDay:      dto.allDay ?? true,
        color:       dto.color,
      },
    });
  }

  async update(id: string, dto: Partial<CreateAcademicEventDto>, currentUser: JwtPayload) {
    await this.findOne(id, currentUser);
    return this.prisma.academicEvent.update({
      where: { id },
      data: {
        ...dto,
        type:      dto.type as any,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate:   dto.endDate   ? new Date(dto.endDate)   : undefined,
      },
    });
  }

  async remove(id: string, currentUser: JwtPayload) {
    await this.findOne(id, currentUser);
    await this.prisma.academicEvent.delete({ where: { id } });
    return { message: 'Tadbir o\'chirildi' };
  }

  // ─── PDF Export ──────────────────────────────────────────────────────────

  async exportPdf(currentUser: JwtPayload, from?: string, to?: string): Promise<Buffer> {
    const events = await this.findAll(currentUser, from, to);
    const school = await this.prisma.school.findUnique({
      where: { id: currentUser.schoolId! },
      select: { name: true },
    });

    const TYPE_UZ: Record<string, string> = {
      holiday:       'Dam olish kuni',
      exam_week:     'Imtihon haftasi',
      quarter_start: 'Chorak boshlanishi',
      quarter_end:   'Chorak tugashi',
      school_event:  'Maktab tadbiri',
      meeting:       'Yig\'ilish',
      other:         'Boshqa',
    };

    const TYPE_COLORS: Record<string, string> = {
      holiday:       '#ef4444',
      exam_week:     '#f59e0b',
      quarter_start: '#10b981',
      quarter_end:   '#3b82f6',
      school_event:  '#8b5cf6',
      meeting:       '#ec4899',
      other:         '#6b7280',
    };

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new (PDFDocument as any)({ margin: 40, size: 'A4' });
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end',  () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const marginL = 40;
      const pageW = doc.page.width;
      const contentW = pageW - marginL * 2;

      // Header
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#1e293b')
         .text(school?.name ?? 'EduPlatform', marginL, 40, { width: contentW, align: 'center' });
      doc.fontSize(11).font('Helvetica').fillColor('#64748b')
         .text('Akademik Kalendar', { align: 'center' });
      if (from || to) {
        const range = [from, to].filter(Boolean).join(' — ');
        doc.fontSize(9).fillColor('#94a3b8').text(range, { align: 'center' });
      }
      doc.fontSize(8).fillColor('#94a3b8')
         .text(`Yaratildi: ${new Date().toLocaleString('uz-UZ')}`, { align: 'right' });
      doc.moveDown(1);

      if (events.length === 0) {
        doc.fontSize(11).fillColor('#64748b').text("Tadbirlar topilmadi.", { align: 'center' });
        doc.end();
        return;
      }

      // Group by month
      const byMonth: Record<string, typeof events> = {};
      for (const ev of events) {
        const key = new Date(ev.startDate).toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' });
        if (!byMonth[key]) byMonth[key] = [];
        byMonth[key].push(ev);
      }

      for (const [monthLabel, evs] of Object.entries(byMonth)) {
        if (doc.y > 700) doc.addPage();

        // Month header
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#6366f1')
           .text(monthLabel.toUpperCase(), marginL, doc.y);
        doc.moveDown(0.3);
        doc.moveTo(marginL, doc.y).lineTo(pageW - marginL, doc.y).strokeColor('#e2e8f0').stroke();
        doc.moveDown(0.4);

        for (const ev of evs) {
          if (doc.y > 730) doc.addPage();

          const typeLabel = TYPE_UZ[ev.type] ?? 'Boshqa';
          const color = TYPE_COLORS[ev.type] ?? '#6b7280';
          const startFmt = new Date(ev.startDate).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' });
          const endFmt   = new Date(ev.endDate).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' });
          const dateStr  = startFmt === endFmt ? startFmt : `${startFmt} – ${endFmt}`;

          const rowY = doc.y;

          // Color indicator dot
          doc.circle(marginL + 5, rowY + 7, 4).fill(color);

          // Title + date
          doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(9)
             .text(ev.title, marginL + 16, rowY, { width: contentW - 80 });
          doc.fillColor('#64748b').font('Helvetica').fontSize(8)
             .text(dateStr, pageW - marginL - 80, rowY, { width: 80, align: 'right' });

          // Type badge + description
          doc.fillColor(color).fontSize(7.5)
             .text(`[${typeLabel}]`, marginL + 16, doc.y, { width: contentW });
          if (ev.description) {
            doc.fillColor('#6b7280').fontSize(8)
               .text(ev.description, marginL + 16, doc.y, { width: contentW });
          }
          doc.moveDown(0.4);
        }
        doc.moveDown(0.5);
      }

      doc.end();
    });
  }

  // ─── iCal Export ─────────────────────────────────────────────────────────

  async exportICal(currentUser: JwtPayload, from?: string, to?: string): Promise<string> {
    const events = await this.findAll(currentUser, from, to);
    const school = await this.prisma.school.findUnique({
      where: { id: currentUser.schoolId! },
      select: { name: true },
    });

    const esc = (s: string) => s.replace(/[\\;,]/g, c => `\\${c}`).replace(/\n/g, '\\n');
    const dtFmt = (d: Date, allDay?: boolean) => {
      if (allDay) return d.toISOString().slice(0, 10).replace(/-/g, '');
      return d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    };
    const now = dtFmt(new Date());

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:-//EduPlatform//${school?.name ?? 'School'}//UZ`,
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${esc(school?.name ?? 'Akademik Kalendar')}`,
      'X-WR-TIMEZONE:Asia/Tashkent',
    ];

    for (const ev of events) {
      const uid = `${ev.id}@eduplatform.uz`;
      const start = ev.allDay
        ? `DTSTART;VALUE=DATE:${dtFmt(new Date(ev.startDate), true)}`
        : `DTSTART:${dtFmt(new Date(ev.startDate))}`;
      const end = ev.allDay
        ? `DTEND;VALUE=DATE:${dtFmt(new Date(ev.endDate), true)}`
        : `DTEND:${dtFmt(new Date(ev.endDate))}`;

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        start,
        end,
        `SUMMARY:${esc(ev.title)}`,
        ...(ev.description ? [`DESCRIPTION:${esc(ev.description)}`] : []),
        `CATEGORIES:${ev.type.toUpperCase()}`,
        'END:VEVENT',
      );
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }
}
