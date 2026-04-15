'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Calculator, ChevronDown, ChevronUp, Plus, Trash2, Loader2,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { payrollApi, TariffPayload, LanguageCert } from '@/lib/api/payroll';
import { formatCurrency } from '@/lib/utils';

// ─── Til sertifikati qo'shish komponent ───────────────────────────────────────

function LangCertRow({
  cert,
  onChange,
  onRemove,
}: {
  cert: LanguageCert;
  onChange: (updated: LanguageCert) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-2 items-center">
      <Input
        placeholder="Tur (IELTS, CEFR…)"
        value={cert.type}
        onChange={e => onChange({ ...cert, type: e.target.value })}
        className="w-28 text-sm"
      />
      <Select value={cert.level ?? ''} onValueChange={v => onChange({ ...cert, level: v })}>
        <SelectTrigger className="w-24 text-sm">
          <SelectValue placeholder="Daraja" />
        </SelectTrigger>
        <SelectContent>
          {['A1','A2','B1','B2','C1','C2'].map(l => (
            <SelectItem key={l} value={l}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder="Ball (masalan 6.5)"
        value={cert.score ?? ''}
        onChange={e => onChange({ ...cert, score: e.target.value })}
        className="w-24 text-sm"
      />
      <Input
        type="date"
        value={cert.expiry ?? ''}
        onChange={e => onChange({ ...cert, expiry: e.target.value })}
        className="w-36 text-sm"
      />
      <Button variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8 text-red-500">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Asosiy dialog ─────────────────────────────────────────────────────────────

interface TariffCalculatorDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Hisoblab bo'lgach, natijaini qaytarish (maosh formiga qo'shish uchun) */
  onApply?: (result: { baseSalary: number; hourlyRate: number; breakdown: any[] } & TariffPayload) => void;
  /** Mavjud konfiguratsiya (edit rejimi uchun) */
  initialValues?: Partial<TariffPayload>;
}

export function TariffCalculatorDialog({
  open, onOpenChange, onApply, initialValues,
}: TariffCalculatorDialogProps) {
  const [form, setForm] = useState<TariffPayload>({
    calculationType: 'tariff_based',
    qualificationGrade: 'none',
    educationLevel: 'higher',
    workExperienceYears: 0,
    academicDegree: 'none',
    honorificTitle: 'none',
    weeklyLessonHours: 18,
    languageCerts: [],
    ...initialValues,
  });
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [certs, setCerts] = useState<LanguageCert[]>(initialValues?.languageCerts ?? []);

  // Reference data (bir marta load bo'ladi)
  const { data: ref } = useQuery({
    queryKey: ['tariff-reference'],
    queryFn: payrollApi.getTariffReference,
    staleTime: Infinity,
  });

  // Real-time preview
  const previewMutation = useMutation({
    mutationFn: payrollApi.previewTariff,
  });

  // Debounce bilan preview chaqirish
  const triggerPreview = useCallback(() => {
    previewMutation.mutate({ ...form, languageCerts: certs });
  }, [form, certs]); // eslint-disable-line

  useEffect(() => {
    const timer = setTimeout(triggerPreview, 300);
    return () => clearTimeout(timer);
  }, [form, certs]); // eslint-disable-line

  const result = previewMutation.data;
  const loading = previewMutation.isPending;

  function handleApply() {
    if (!result) return;
    onApply?.({
      ...form,
      languageCerts: certs,
      baseSalary: result.grossMonthly,
      hourlyRate: result.hourlyRate,
      breakdown: result.breakdown,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            UZ 2026 — O&apos;qituvchi Tarifikatsiya Kalkulyatori
          </DialogTitle>
          <DialogDescription>
            Vazirlar Mahkamasining qaroriga asosan 2026-yil mart holatidagi stavkalar.
            BHM = {ref ? (ref.bhm as number)?.toLocaleString() : '1,155,000'} UZS
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          {/* ─── Toifa ────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Malakaviy toifa</Label>
            <Select
              value={form.qualificationGrade}
              onValueChange={v => setForm(f => ({ ...f, qualificationGrade: v as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(ref?.gradeCoefficients ?? [
                  { key: 'none', label: 'Toifasiz', coefficient: 2.80 },
                  { key: 'second', label: '2-toifa', coefficient: 3.20 },
                  { key: 'first', label: '1-toifa', coefficient: 3.60 },
                  { key: 'highest', label: 'Oliy toifa', coefficient: 4.20 },
                ]).map((g: any) => (
                  <SelectItem key={g.key} value={g.key}>
                    {g.label} <span className="text-muted-foreground ml-1">(×{g.coefficient})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ─── Ta'lim darajasi ───────────────── */}
          <div className="space-y-1.5">
            <Label>Ta&apos;lim darajasi</Label>
            <Select
              value={form.educationLevel ?? 'higher'}
              onValueChange={v => setForm(f => ({ ...f, educationLevel: v as any }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(ref?.educationLevels ?? [
                  { key: 'secondary_specialized', label: "O'rta maxsus", bonusPct: 0 },
                  { key: 'higher', label: "Oliy ta'lim", bonusPct: 10 },
                  { key: 'master', label: 'Magistr', bonusPct: 15 },
                  { key: 'doctoral', label: 'Doktorantura', bonusPct: 20 },
                ]).map((e: any) => (
                  <SelectItem key={e.key} value={e.key}>
                    {e.label} {e.bonusPct > 0 && <span className="text-green-600 ml-1">+{e.bonusPct}%</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ─── Ish staji ────────────────────── */}
          <div className="space-y-1.5">
            <Label>Ish staji (yil)</Label>
            <Input
              type="number"
              min={0}
              max={50}
              value={form.workExperienceYears ?? 0}
              onChange={e => setForm(f => ({ ...f, workExperienceYears: Number(e.target.value) }))}
            />
            {(() => {
              const y = form.workExperienceYears ?? 0;
              const pct = y >= 20 ? 30 : y >= 15 ? 25 : y >= 8 ? 20 : y >= 3 ? 10 : 0;
              return pct > 0
                ? <p className="text-xs text-green-600">+{pct}% staj ustamasi</p>
                : <p className="text-xs text-muted-foreground">Ustama yo&apos;q (0–2 yil)</p>;
            })()}
          </div>

          {/* ─── Haftalik soat ────────────────── */}
          <div className="space-y-1.5">
            <Label>Haftalik dars soati</Label>
            <Input
              type="number"
              min={1}
              max={40}
              value={form.weeklyLessonHours ?? 18}
              onChange={e => setForm(f => ({ ...f, weeklyLessonHours: Number(e.target.value) }))}
            />
            <p className="text-xs text-muted-foreground">Standart: 18 soat/hafta</p>
          </div>

          {/* ─── Ilmiy daraja ─────────────────── */}
          <div className="space-y-1.5">
            <Label>Ilmiy daraja</Label>
            <Select
              value={form.academicDegree ?? 'none'}
              onValueChange={v => setForm(f => ({ ...f, academicDegree: v as any }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(ref?.academicDegrees ?? [
                  { key: 'none', label: "Yo'q", bonusPct: 0 },
                  { key: 'candidate', label: 'Fan nomzodi (PhD)', bonusPct: 30 },
                  { key: 'doctor', label: 'Fan doktori', bonusPct: 50 },
                ]).map((d: any) => (
                  <SelectItem key={d.key} value={d.key}>
                    {d.label} {d.bonusPct > 0 && <span className="text-green-600 ml-1">+{d.bonusPct}%</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ─── Unvon ────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Faxriy unvon</Label>
            <Select
              value={form.honorificTitle ?? 'none'}
              onValueChange={v => setForm(f => ({ ...f, honorificTitle: v as any }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(ref?.honorificTitles ?? [
                  { key: 'none', label: "Yo'q", bonusPct: 0 },
                  { key: 'methodist', label: 'Metodist', bonusPct: 15 },
                  { key: 'teacher_of_teachers', label: "O'qituvchilar o'qituvchisi", bonusPct: 20 },
                ]).map((t: any) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.label} {t.bonusPct > 0 && <span className="text-green-600 ml-1">+{t.bonusPct}%</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ─── Til sertifikatlari ───────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Til sertifikatlari</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCerts(c => [...c, { type: '', level: 'B2' }])}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Qo&apos;shish
            </Button>
          </div>
          {certs.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Sertifikat qo&apos;shilmagan. IELTS, CEFR va boshqalar qo&apos;shishingiz mumkin.
            </p>
          )}
          <div className="space-y-2">
            {certs.map((cert, i) => (
              <LangCertRow
                key={i}
                cert={cert}
                onChange={updated => setCerts(c => c.map((x, j) => j === i ? updated : x))}
                onRemove={() => setCerts(c => c.filter((_, j) => j !== i))}
              />
            ))}
          </div>
        </div>

        <Separator />

        {/* ─── Hisoblangan natija ───────────────────────────────────────────── */}
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">Hisoblangan oylik maosh</span>
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              : (
                <span className="text-2xl font-bold text-primary">
                  {result ? formatCurrency(result.grossMonthly, 'UZS') : '—'}
                </span>
              )}
          </div>
          {result && (
            <div className="text-sm text-muted-foreground">
              1 dars soati narxi: <strong>{formatCurrency(result.hourlyRate, 'UZS')}</strong>
              <span className="ml-2 text-xs">
                ({form.weeklyLessonHours ?? 18} soat/hafta × 4.3 hafta)
              </span>
            </div>
          )}

          {/* Breakdown accordion */}
          {result?.breakdown && result.breakdown.length > 1 && (
            <div>
              <button
                className="flex items-center gap-1 text-xs text-primary font-medium"
                onClick={() => setShowBreakdown(v => !v)}
              >
                {showBreakdown ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                Batafsil hisob-kitob
              </button>
              {showBreakdown && (
                <div className="mt-2 space-y-1">
                  {result.breakdown.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className={i === result.breakdown.length - 1 ? 'font-bold text-foreground' : ''}>
                        {formatCurrency(item.amount, 'UZS')}
                        {item.percent && <span className="text-green-600 ml-1">(+{item.percent}%)</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Tugmalar ─────────────────────────────────────────────────────── */}
        {onApply && (
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Bekor</Button>
            <Button onClick={handleApply} disabled={!result}>
              <Calculator className="h-4 w-4 mr-2" />
              Maoshga qo&apos;llash
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
