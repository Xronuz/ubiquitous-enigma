import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { DayOfWeek } from '@eduplatform/types';

@Injectable()
export class DisplayService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public: maktab slug bo'yicha bugungi dars jadvalini qaytaradi (auth talab qilinmaydi) */
  async getTodaySchedule(schoolSlug: string) {
    const school = await this.prisma.school.findUnique({
      where: { slug: schoolSlug },
      select: { id: true, name: true, slug: true, phone: true },
    });

    if (!school) {
      throw new NotFoundException(`Maktab topilmadi: ${schoolSlug}`);
    }

    // Bugungi kun indeksini aniqlash (JS: 0=Sunday → enum: MONDAY=first)
    const jsDay = new Date().getDay();
    const dayMap: DayOfWeek[] = [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];
    const today = dayMap[jsDay];

    const schedule = await this.prisma.schedule.findMany({
      where: { schoolId: school.id, dayOfWeek: today },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            teacher: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        class: {
          select: { id: true, name: true, gradeLevel: true },
        },
      },
      orderBy: [{ timeSlot: 'asc' }, { class: { gradeLevel: 'asc' } }],
    });

    return {
      school,
      day: today,
      date: new Date().toISOString(),
      schedule,
    };
  }
}
