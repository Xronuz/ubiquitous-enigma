import { Injectable } from '@nestjs/common';

/**
 * O'ZBEKISTON 2026 YIL MART HOLATIGA KO'RA
 * O'QITUVCHI TARIFIKATSIYA KALKULYATORI
 *
 * Asoslar:
 *  - Vazirlar Mahkamasining 2022-yil 13-iyundagi 315-son qarori
 *  - 2023–2026 yillar uchun pedagogik xodimlar mehnat haqi tizimi
 *  - Yagona Tarif Jadval (YTJ) koeffitsientlari
 *  - BHM (Bazaviy hisob miqdori): 2026 yanvar holatiga 1,155,000 UZS
 */

// ─── Konstantalar ─────────────────────────────────────────────────────────────

/** Bazaviy hisob miqdori (BHM) — 2026 yil yanvar */
export const BHM_2026 = 1_155_000; // UZS

/** Standart haftalik dars soati (18 soat/hafta × 4.3 hafta = oylik) */
export const STANDARD_WEEKLY_HOURS = 18;
export const WEEKS_PER_MONTH = 4.3;

/** Toifa koeffitsientlari */
export const GRADE_COEFFICIENTS: Record<string, number> = {
  none:    2.80,  // Toifasiz
  second:  3.20,  // 2-toifa
  first:   3.60,  // 1-toifa
  highest: 4.20,  // Oliy toifa
};

/** Ta'lim darajasi ustamasi (bazaga foiz) */
export const EDUCATION_BONUS: Record<string, number> = {
  secondary_specialized: 0.00,  // O'rta maxsus — ustama yo'q
  higher:               0.10,  // Oliy ta'lim — +10%
  master:               0.15,  // Magistr — +15%
  doctoral:             0.20,  // Doktorantura — +20%
};

/** Ish staji ustamasi (bazaga foiz) */
export const EXPERIENCE_BONUS = (years: number): number => {
  if (years >= 20) return 0.30;
  if (years >= 15) return 0.25;
  if (years >= 8)  return 0.20;
  if (years >= 3)  return 0.10;
  return 0.00;
};

/** Ilmiy daraja qo'shimchasi (bazaga foiz) */
export const DEGREE_BONUS: Record<string, number> = {
  none:      0.00,
  candidate: 0.30, // Fan nomzodi (PhD) — +30%
  doctor:    0.50, // Fan doktori — +50%
};

/** Unvon ustamasi (bazaga foiz) */
export const TITLE_BONUS: Record<string, number> = {
  none:                0.00,
  methodist:           0.15, // Metodist — +15%
  teacher_of_teachers: 0.20, // O'qituvchilar o'qituvchisi — +20%
};

/** Til sertifikati ustamasi (bazaga foiz) */
export const LANGUAGE_BONUS = (certs: LanguageCert[]): number => {
  if (!certs || certs.length === 0) return 0;
  // Eng yuqori sertifikat ustamasi hisoblanadi
  let maxBonus = 0;
  for (const cert of certs) {
    let bonus = 0;
    if (cert.level === 'C1' || cert.level === 'C2') bonus = 0.30;
    else if (cert.level === 'B2') bonus = 0.20;
    else if (cert.level === 'B1') bonus = 0.10;
    else if (cert.score) {
      // IELTS ball bo'yicha
      const score = parseFloat(cert.score);
      if (score >= 6.5) bonus = 0.30;
      else if (score >= 5.5) bonus = 0.20;
      else if (score >= 4.5) bonus = 0.10;
    }
    if (bonus > maxBonus) maxBonus = bonus;
  }
  return maxBonus;
};

// ─── Interfacelar ─────────────────────────────────────────────────────────────

export interface LanguageCert {
  type: string;   // IELTS | TOEFL | CEFR | DELF | ZD | ...
  level?: string; // A1 | A2 | B1 | B2 | C1 | C2
  score?: string; // IELTS ball (masalan "6.5")
  expiry?: string; // ISO date
}

export interface TariffInput {
  qualificationGrade:  string; // none | second | first | highest
  educationLevel?:     string; // secondary_specialized | higher | master | doctoral
  workExperienceYears: number;
  academicDegree?:     string; // none | candidate | doctor
  honorificTitle?:     string; // none | methodist | teacher_of_teachers
  languageCerts?:      LanguageCert[];
  weeklyLessonHours?:  number; // Default 18
  customBhm?:          number; // Override BHM (admin belgilagan)
}

export interface TariffBreakdownItem {
  label: string;
  amount: number;
  percent?: number;
}

export interface TariffResult {
  bhm: number;
  coefficient: number;
  weeklyLessonHours: number;
  baseMonthly: number;           // BHM × coefficient
  educationBonus: number;
  experienceBonus: number;
  degreeBonus: number;
  titleBonus: number;
  languageBonus: number;
  grossMonthly: number;          // Barcha ustamalar bilan
  hourlyRate: number;            // grossMonthly ÷ (weeklyHours × 4.3)
  breakdown: TariffBreakdownItem[];
}

// ─── Servis ───────────────────────────────────────────────────────────────────

@Injectable()
export class TariffCalculatorService {
  /**
   * Tarif asosida oylik maosh hisoblash
   */
  calculate(input: TariffInput): TariffResult {
    const bhm = input.customBhm ?? BHM_2026;
    const weeklyHours = input.weeklyLessonHours ?? STANDARD_WEEKLY_HOURS;
    const coefficient = GRADE_COEFFICIENTS[input.qualificationGrade] ?? GRADE_COEFFICIENTS.none;

    // 1. Asosiy oylik (BHM × toifa koeffitsienti)
    const baseMonthly = Math.round(bhm * coefficient);

    // 2. Ta'lim darajasi ustamasi
    const eduPct = EDUCATION_BONUS[input.educationLevel ?? 'higher'] ?? 0;
    const educationBonus = Math.round(baseMonthly * eduPct);

    // 3. Ish staji ustamasi
    const expPct = EXPERIENCE_BONUS(input.workExperienceYears);
    const experienceBonus = Math.round(baseMonthly * expPct);

    // 4. Ilmiy daraja
    const degPct = DEGREE_BONUS[input.academicDegree ?? 'none'] ?? 0;
    const degreeBonus = Math.round(baseMonthly * degPct);

    // 5. Unvon
    const titlePct = TITLE_BONUS[input.honorificTitle ?? 'none'] ?? 0;
    const titleBonus = Math.round(baseMonthly * titlePct);

    // 6. Til sertifikati
    const langPct = LANGUAGE_BONUS(input.languageCerts ?? []);
    const languageBonus = Math.round(baseMonthly * langPct);

    // 7. Jami oylik
    const grossMonthly = baseMonthly + educationBonus + experienceBonus
      + degreeBonus + titleBonus + languageBonus;

    // 8. Bir dars soati narxi
    const hourlyRate = Math.round(grossMonthly / (weeklyHours * WEEKS_PER_MONTH));

    // 9. Tafsilotli breakdown
    const breakdown: TariffBreakdownItem[] = [
      {
        label: `Asosiy stavka (BHM ${bhm.toLocaleString()} × ${coefficient})`,
        amount: baseMonthly,
      },
    ];
    if (educationBonus > 0) {
      breakdown.push({
        label: `Ta'lim darajasi ustamasi (${Math.round(eduPct * 100)}%)`,
        amount: educationBonus,
        percent: eduPct * 100,
      });
    }
    if (experienceBonus > 0) {
      breakdown.push({
        label: `Ish staji ustamasi (${input.workExperienceYears} yil — ${Math.round(expPct * 100)}%)`,
        amount: experienceBonus,
        percent: expPct * 100,
      });
    }
    if (degreeBonus > 0) {
      breakdown.push({
        label: `Ilmiy daraja qo'shimchasi (${Math.round(degPct * 100)}%)`,
        amount: degreeBonus,
        percent: degPct * 100,
      });
    }
    if (titleBonus > 0) {
      breakdown.push({
        label: `Unvon ustamasi (${Math.round(titlePct * 100)}%)`,
        amount: titleBonus,
        percent: titlePct * 100,
      });
    }
    if (languageBonus > 0) {
      breakdown.push({
        label: `Til sertifikati ustamasi (${Math.round(langPct * 100)}%)`,
        amount: languageBonus,
        percent: langPct * 100,
      });
    }
    breakdown.push({ label: 'Jami oylik maosh', amount: grossMonthly });

    return {
      bhm,
      coefficient,
      weeklyLessonHours: weeklyHours,
      baseMonthly,
      educationBonus,
      experienceBonus,
      degreeBonus,
      titleBonus,
      languageBonus,
      grossMonthly,
      hourlyRate,
      breakdown,
    };
  }

  /**
   * Frontend uchun reference ma'lumotlar (toifalar, ustamalar)
   */
  getReferenceData() {
    return {
      bhm: BHM_2026,
      standardWeeklyHours: STANDARD_WEEKLY_HOURS,
      gradeCoefficients: [
        { key: 'none',    label: 'Toifasiz',    coefficient: 2.80 },
        { key: 'second',  label: '2-toifa',     coefficient: 3.20 },
        { key: 'first',   label: '1-toifa',     coefficient: 3.60 },
        { key: 'highest', label: 'Oliy toifa',  coefficient: 4.20 },
      ],
      educationLevels: [
        { key: 'secondary_specialized', label: "O'rta maxsus",  bonusPct: 0 },
        { key: 'higher',                label: 'Oliy ta\'lim',  bonusPct: 10 },
        { key: 'master',                label: 'Magistr',       bonusPct: 15 },
        { key: 'doctoral',              label: 'Doktorantura',  bonusPct: 20 },
      ],
      experienceBonuses: [
        { years: '0–2',   bonusPct: 0  },
        { years: '3–7',   bonusPct: 10 },
        { years: '8–14',  bonusPct: 20 },
        { years: '15–19', bonusPct: 25 },
        { years: '20+',   bonusPct: 30 },
      ],
      academicDegrees: [
        { key: 'none',      label: 'Yo\'q',                    bonusPct: 0  },
        { key: 'candidate', label: 'Fan nomzodi (PhD)',         bonusPct: 30 },
        { key: 'doctor',    label: 'Fan doktori',               bonusPct: 50 },
      ],
      honorificTitles: [
        { key: 'none',                label: 'Yo\'q',                              bonusPct: 0  },
        { key: 'methodist',           label: 'Metodist',                           bonusPct: 15 },
        { key: 'teacher_of_teachers', label: "O'qituvchilar o'qituvchisi",         bonusPct: 20 },
      ],
      languageCertBonuses: [
        { level: 'B1',         bonusPct: 10 },
        { level: 'B2 / IELTS 5.5+', bonusPct: 20 },
        { level: 'C1 / IELTS 6.5+', bonusPct: 30 },
      ],
    };
  }
}
