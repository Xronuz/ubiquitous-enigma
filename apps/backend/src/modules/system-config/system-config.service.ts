import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { BHM_2026 } from '@/modules/payroll/tariff-calculator.service';

// ─── Kalit konstantalar ───────────────────────────────────────────────────────
export const CONFIG_KEYS = {
  BHM:           'bhm',           // Bazaviy hisob miqdori (UZS)
  ACADEMIC_YEAR: 'academic_year', // Joriy o'quv yili (masalan: "2025-2026")
  SCHOOL_NAME:   'school_name',   // Maktab nomi
  SCHOOL_PHONE:  'school_phone',  // Maktab telefoni
  SCHOOL_ADDRESS:'school_address',// Maktab manzili
  PASS_THRESHOLD:'pass_threshold',// O'tish chegarasi % (default 50)
  WORK_DAYS:     'work_days',     // Ish kunlari soni (default 22)
} as const;

export type ConfigKey = typeof CONFIG_KEYS[keyof typeof CONFIG_KEYS];

/** Maktab konfiguratsiyasi — kalit-qiymat juftlari */
export interface SystemConfigMap {
  bhm: number;
  academic_year: string;
  school_name: string;
  school_phone: string;
  school_address: string;
  pass_threshold: number;
  work_days: number;
}

/** Standart qiymatlar */
const DEFAULTS: SystemConfigMap = {
  bhm:           BHM_2026,
  academic_year: '2025-2026',
  school_name:   '',
  school_phone:  '',
  school_address:'',
  pass_threshold: 50,
  work_days:      22,
};

@Injectable()
export class SystemConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Bitta qiymat olish (topilmasa default qaytaradi)
   */
  async get<K extends ConfigKey>(schoolId: string, key: K): Promise<SystemConfigMap[K]> {
    const record = await this.prisma.systemConfig.findUnique({
      where: { schoolId_key: { schoolId, key } },
    });

    if (!record) return DEFAULTS[key] as SystemConfigMap[K];

    const raw = record.value;
    // Raqamli konstantalar
    if (key === 'bhm' || key === 'pass_threshold' || key === 'work_days') {
      return Number(raw) as SystemConfigMap[K];
    }
    return raw as SystemConfigMap[K];
  }

  /**
   * Barcha konfiguratsiya qiymatlarini olish
   */
  async getAll(schoolId: string): Promise<SystemConfigMap> {
    const records = await this.prisma.systemConfig.findMany({
      where: { schoolId },
    });

    const result = { ...DEFAULTS };
    for (const r of records) {
      if (r.key in result) {
        const k = r.key as ConfigKey;
        if (k === 'bhm' || k === 'pass_threshold' || k === 'work_days') {
          (result as any)[k] = Number(r.value);
        } else {
          (result as any)[k] = r.value;
        }
      }
    }
    return result;
  }

  /**
   * Qiymat o'rnatish (upsert)
   */
  async set(schoolId: string, key: ConfigKey, value: string | number): Promise<void> {
    await this.prisma.systemConfig.upsert({
      where: { schoolId_key: { schoolId, key } },
      create: { schoolId, key, value: String(value) },
      update: { value: String(value) },
    });
  }

  /**
   * Bir necha qiymat birdan o'rnatish
   */
  async setBulk(schoolId: string, payload: Partial<SystemConfigMap>): Promise<void> {
    const ops = Object.entries(payload).map(([key, value]) =>
      this.prisma.systemConfig.upsert({
        where: { schoolId_key: { schoolId, key } },
        create: { schoolId, key, value: String(value) },
        update: { value: String(value) },
      }),
    );
    await this.prisma.$transaction(ops);
  }

  /**
   * BHM qiymatini olish (TariffCalculator uchun)
   */
  async getBhm(schoolId: string): Promise<number> {
    return this.get(schoolId, 'bhm');
  }
}
