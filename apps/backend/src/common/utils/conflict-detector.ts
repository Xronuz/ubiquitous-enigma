/**
 * ConflictDetectorService — Filiallararo jadval to'qnashuvini tekshirish.
 *
 * Asosiy qoidalar:
 *   1. O'QITUVCHI  → school-wide tekshirish (barcha filiallar).
 *      O'qituvchi bir vaqtda ikki filialda dars bera olmaydi.
 *
 *   2. XONA        → faqat shu filial doirasida tekshirish.
 *      Har filialning o'z xonalari — boshqa filialga ta'luqli emas.
 *
 *   3. SINF        → faqat shu sinf doirasida tekshirish.
 *
 * Vaqt zonasi (UTC) strategiyasi:
 *   - Barcha schedule slotlari haftalik takrorlanuvchi (dayOfWeek + startTime/endTime)
 *   - Vaqt mahalliy (school.timezone) saqlanadi, STRING sifatida "HH:MM"
 *   - Konflikt tekshirishda mahalliy vaqt UTC ga o'tkaziladi:
 *       utcMin = dayIndex * 1440 + (H * 60 + M) - tzOffsetMinutes
 *   - Ikki slot to'qnashadi agar: startA_utc < endB_utc && endA_utc > startB_utc
 *
 * Timezone offset (Node.js Intl API, tashqi kutubxonasiz):
 *   Asia/Tashkent = UTC+5 → offset = +300 min
 *   Europe/London (summer) = UTC+1 → offset = +60 min
 */

import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface ClashParams {
  schoolId:    string;
  branchId?:   string | null;   // tekshirilayotgan filial (xona uchun)
  teacherId?:  string;
  roomId?:     string;
  classId?:    string;
  dayOfWeek:   string;          // "monday" ... "sunday"
  startTime:   string;          // "HH:MM"
  endTime:     string;          // "HH:MM"
  timezone:    string;          // "Asia/Tashkent"
  excludeId?:  string;          // yangilashda o'zini istisno qilish
}

export interface ConflictDetail {
  type:    'teacher' | 'room' | 'class';
  message: string;
  slotId:  string;
  branchId?: string | null;
}

const DAY_INDEX: Record<string, number> = {
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3,
  friday: 4, saturday: 5, sunday: 6,
};

// ── UTC offset hisoblash ──────────────────────────────────────────────────────
/**
 * Berilgan IANA timezone uchun UTC dan farqni minutlarda qaytaradi.
 * Asia/Tashkent → +300 (UTC+5)
 * Bu funksiya Node.js Intl API ishlatadi — tashqi paket talab qilinmaydi.
 *
 * Eslatma: DST (kunlik vaqt o'zgarishi) bo'lmagan timezone larda bu doim bir xil.
 * O'zbekiston (Asia/Tashkent) DST ishlatmaydi — xavfsiz.
 */
function getTimezoneOffsetMin(timezone: string): number {
  try {
    // Bir xil vaqt uchun UTC va timezone formatidagi stringlarni taqqoslaymiz
    const date = new Date('2024-06-15T12:00:00Z');

    // UTC vaqt
    const utcStr = new Intl.DateTimeFormat('en-US', {
      timeZone:    'UTC',
      year:        'numeric', month:   '2-digit', day:    '2-digit',
      hour:        '2-digit', minute:  '2-digit',  second: '2-digit',
      hour12:      false,
    }).format(date);

    // Maqsad timezone vaqt
    const tzStr = new Intl.DateTimeFormat('en-US', {
      timeZone:    timezone,
      year:        'numeric', month:   '2-digit', day:    '2-digit',
      hour:        '2-digit', minute:  '2-digit',  second: '2-digit',
      hour12:      false,
    }).format(date);

    // Har ikkalasini Date ga parse qilib farqni olamiz
    const utcDate = new Date(utcStr.replace(',', ''));
    const tzDate  = new Date(tzStr.replace(',', ''));
    const offsetMs = tzDate.getTime() - utcDate.getTime();
    return Math.round(offsetMs / 60000); // milliseconds → minutes
  } catch {
    // Noto'g'ri timezone berilsa — 0 qaytaramiz (UTC)
    return 0;
  }
}

/**
 * Mahalliy "HH:MM" va dayOfWeek ni UTC minutlarga aylantiradi.
 * Natija: haftaning boshidan (monday 00:00 UTC) hisoblangan minutlar.
 *
 * Misol:
 *   dayOfWeek="monday", time="08:00", timezone="Asia/Tashkent" (UTC+5)
 *   → localMin = 0 * 1440 + 8 * 60 + 0 = 480
 *   → tzOffset = +300
 *   → utcMin = 480 - 300 = 180  (monday 03:00 UTC)
 */
export function toWeeklyUtcMin(dayOfWeek: string, timeStr: string, timezone: string): number {
  const dayIdx = DAY_INDEX[dayOfWeek.toLowerCase()] ?? 0;
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const localMin = dayIdx * 1440 + h * 60 + m;
  const tzOffset = getTimezoneOffsetMin(timezone);
  return localMin - tzOffset;
}

/**
 * Ikki vaqt oralig'i o'rtasida to'qnashuv bor-yo'qligini tekshiradi.
 * Standart interval overlap: startA < endB && endA > startB
 */
function overlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class ConflictDetectorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Yangi yoki yangilangan jadval sloti uchun to'qnashuvni tekshiradi.
   *
   * @throws ConflictException — to'qnashuv aniqlansa
   * @returns ConflictDetail[] — barcha to'qnashuvlar (throw qilishdan oldin ishlatish mumkin)
   */
  async checkClash(params: ClashParams): Promise<ConflictDetail[]> {
    const {
      schoolId, branchId, teacherId, roomId, classId,
      dayOfWeek, startTime, endTime, timezone, excludeId,
    } = params;

    // Yangi slotning UTC minutlari
    const newStart = toWeeklyUtcMin(dayOfWeek, startTime, timezone);
    const newEnd   = toWeeklyUtcMin(dayOfWeek, endTime, timezone);

    if (newStart >= newEnd) {
      // Yarim tunda kesilgan jadvallar (masalan 23:30-00:30) — alohida logika kerak
      // Hozircha bunday holatni qabul qilmaymiz
      return [];
    }

    const conflicts: ConflictDetail[] = [];
    const exclude = excludeId ? { id: { not: excludeId } } : {};

    // ── 1. O'QITUVCHI to'qnashuvi — SCHOOL-WIDE ─────────────────────────────
    if (teacherId) {
      // O'qituvchining o'sha kunda barcha filiallardagi darslarini olamiz
      const teacherSlots = await this.prisma.schedule.findMany({
        where: {
          schoolId,
          teacherId,
          dayOfWeek: dayOfWeek as any,
          ...exclude,
        },
        select: {
          id:              true,
          branchId:        true,
          startTime:       true,
          endTime:         true,
          startDayMinUtc:  true,
          endDayMinUtc:    true,
          class:   { select: { name: true } },
          subject: { select: { name: true } },
        },
      });

      for (const slot of teacherSlots) {
        // UTC minutlar saqlanganmi? Agar yo'q — mahalliy vaqtni ishlatamiz
        const slotStart = slot.startDayMinUtc
          ?? toWeeklyUtcMin(dayOfWeek, slot.startTime, timezone);
        const slotEnd   = slot.endDayMinUtc
          ?? toWeeklyUtcMin(dayOfWeek, slot.endTime, timezone);

        if (overlaps(newStart, newEnd, slotStart, slotEnd)) {
          const branchInfo = slot.branchId && slot.branchId !== branchId
            ? ' (boshqa filialda)'
            : '';
          conflicts.push({
            type:     'teacher',
            slotId:   slot.id,
            branchId: slot.branchId,
            message:  `O'qituvchi ${slot.class?.name ?? ''}${branchInfo} sinfida ${slot.subject?.name ?? 'boshqa'} darsida band (${slot.startTime}–${slot.endTime})`,
          });
        }
      }
    }

    // ── 2. XONA to'qnashuvi — SCHOOL-WIDE (xona noyob ID bilan aniqlanadi) ────
    // branchId null bo'lsa ham tekshiriladi — xona ikki marta band qilinmasin.
    if (roomId) {
      const roomSlots = await this.prisma.schedule.findMany({
        where: {
          schoolId,
          ...(branchId ? { branchId } : {}),  // branchId berilsa filtrlaymiz, yo'qsa school-wide
          roomId,
          dayOfWeek: dayOfWeek as any,
          ...exclude,
        },
        select: {
          id:             true,
          startTime:      true,
          endTime:        true,
          startDayMinUtc: true,
          endDayMinUtc:   true,
          class:   { select: { name: true } },
          subject: { select: { name: true } },
        },
      });

      for (const slot of roomSlots) {
        const slotStart = slot.startDayMinUtc
          ?? toWeeklyUtcMin(dayOfWeek, slot.startTime, timezone);
        const slotEnd   = slot.endDayMinUtc
          ?? toWeeklyUtcMin(dayOfWeek, slot.endTime, timezone);

        if (overlaps(newStart, newEnd, slotStart, slotEnd)) {
          conflicts.push({
            type:    'room',
            slotId:  slot.id,
            message: `Xona ${slot.class?.name ?? ''} sinfi ${slot.subject?.name ?? ''} darsi uchun band (${slot.startTime}–${slot.endTime})`,
          });
        }
      }
    }

    // ── 3. SINF to'qnashuvi ───────────────────────────────────────────────────
    if (classId) {
      const classSlots = await this.prisma.schedule.findMany({
        where: {
          schoolId,
          classId,
          dayOfWeek: dayOfWeek as any,
          ...exclude,
        },
        select: {
          id:             true,
          startTime:      true,
          endTime:        true,
          startDayMinUtc: true,
          endDayMinUtc:   true,
          subject: { select: { name: true } },
        },
      });

      for (const slot of classSlots) {
        const slotStart = slot.startDayMinUtc
          ?? toWeeklyUtcMin(dayOfWeek, slot.startTime, timezone);
        const slotEnd   = slot.endDayMinUtc
          ?? toWeeklyUtcMin(dayOfWeek, slot.endTime, timezone);

        if (overlaps(newStart, newEnd, slotStart, slotEnd)) {
          conflicts.push({
            type:    'class',
            slotId:  slot.id,
            message: `Sinf bu vaqtda ${slot.subject?.name ?? 'boshqa'} darsida (${slot.startTime}–${slot.endTime})`,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * checkClash ga o'xshash, lekin to'qnashuv topilsa ConflictException throw qiladi.
   */
  async assertNoClash(params: ClashParams): Promise<void> {
    const conflicts = await this.checkClash(params);
    if (conflicts.length > 0) {
      throw new ConflictException(conflicts.map((c) => c.message).join('; '));
    }
  }
}
