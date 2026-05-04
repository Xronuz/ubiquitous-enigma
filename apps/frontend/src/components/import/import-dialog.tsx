'use client';

import { useState, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle,
  Loader2, Download, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  importApi, ImportType, ImportResult, ImportRow, CommitResult,
} from '@/lib/api/import';
import { branchesApi } from '@/lib/api/branches';
import { useAuthStore } from '@/store/auth.store';
import { useQuery } from '@tanstack/react-query';

// ─── Config ────────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ImportType, {
  title: string;
  description: string;
  columns: string[];
}> = {
  students: {
    title: "O'quvchilar import",
    description: "O'quvchilarni Excel fayl orqali ommaviy qo'shish",
    columns: ['Ism', 'Familiya', 'Email', 'Telefon', 'Parol', 'Sinf ID'],
  },
  users: {
    title: 'Xodimlar import',
    description: "O'qituvchi va boshqa xodimlarni ommaviy qo'shish",
    columns: ['Ism', 'Familiya', 'Email', 'Telefon', 'Rol', 'Parol'],
  },
  schedule: {
    title: 'Jadval import',
    description: "Dars jadvalini Excel fayl orqali yuklash",
    columns: ['Sinf ID', 'Fan ID', "O'qituvchi ID", 'Kun', 'Slot', 'Boshlanish', 'Tugash', 'Xona'],
  },
  grades: {
    title: 'Baholar import',
    description: "Baholarni Excel fayl orqali ommaviy kiritish",
    columns: ["O'quvchi ID", 'Fan ID', 'Sinf ID', 'Tur', 'Baho', 'Maks', 'Sana', 'Izoh'],
  },
  attendance: {
    title: 'Davomat import',
    description: "Davomatni Excel fayl orqali ommaviy kiritish",
    columns: ["O'quvchi ID", 'Sana (YYYY-MM-DD)', 'Holat (present/absent/late/excused)', 'Izoh'],
  },
};

const PARSE_FUNS: Record<ImportType, (f: File) => Promise<ImportResult>> = {
  students:   importApi.parseStudents,
  users:      importApi.parseUsers,
  schedule:   importApi.parseSchedule,
  grades:     importApi.parseGrades,
  attendance: importApi.parseAttendance,
};

const COMMIT_FUNS: Record<ImportType, (rows: ImportRow[], branchId?: string) => Promise<CommitResult>> = {
  students:   importApi.commitStudents,
  users:      importApi.commitUsers,
  schedule:   importApi.commitSchedule,
  grades:     importApi.commitGrades,
  attendance: importApi.commitAttendance,
};

// ─── Component ─────────────────────────────────────────────────────────────────

type Step = 'upload' | 'preview' | 'result';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  type: ImportType;
  onSuccess?: () => void;
}

export function ImportDialog({ open, onOpenChange, type, onSuccess }: ImportDialogProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const config = TYPE_CONFIG[type];
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [parseResult, setParseResult] = useState<ImportResult | null>(null);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [branchId, setBranchId] = useState('');

  const { data: branchesData } = useQuery({
    queryKey: ['branches', user?.schoolId],
    queryFn: () => branchesApi.getAll(),
    enabled: open && !!user?.schoolId && ['super_admin', 'director'].includes(user?.role ?? ''),
  });
  const branchesList = Array.isArray(branchesData) ? branchesData : (branchesData as any)?.data ?? [];
  const canSelectBranch = branchesList.length > 0;

  function reset() {
    setStep('upload');
    setParseResult(null);
    setCommitResult(null);
    setShowErrors(false);
    setBranchId('');
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  // ── Parse mutation ──────────────────────────────────────────────────────────

  const parseMutation = useMutation({
    mutationFn: (file: File) => PARSE_FUNS[type](file),
    onSuccess: (result) => {
      setParseResult(result);
      setStep('preview');
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Xato', description: err?.response?.data?.message ?? 'Fayl o\'qilmadi' });
    },
  });

  // ── Commit mutation ─────────────────────────────────────────────────────────

  const commitMutation = useMutation({
    mutationFn: (rows: ImportRow[]) => COMMIT_FUNS[type](rows, branchId || undefined),
    onSuccess: (result) => {
      setCommitResult(result);
      setStep('result');
      if (result.created > 0) {
        toast({ title: `✅ ${result.created} ta yozuv saqlandi` });
        onSuccess?.();
      }
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Saqlashda xato', description: err?.response?.data?.message ?? 'Xatolik' });
    },
  });

  // ── File handlers ───────────────────────────────────────────────────────────

  function handleFile(file: File) {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({ variant: 'destructive', title: 'Xato', description: 'Faqat .xlsx yoki .xls fayl yuklang' });
      return;
    }
    parseMutation.mutate(file);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []); // eslint-disable-line

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  // ── Preview table ───────────────────────────────────────────────────────────

  const invalidRows = parseResult?.rows.filter(r => !r.valid) ?? [];
  const validRows   = parseResult?.rows.filter(r => r.valid)  ?? [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {config.title}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        {/* ── STEP 1: UPLOAD ────────────────────────────────────────────── */}
        {step === 'upload' && (
          <div className="space-y-4 py-2">
            {/* Namuna fayl */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div className="text-sm">
                <div className="font-medium">Namuna fayl yuklab oling</div>
                <div className="text-muted-foreground text-xs mt-0.5">
                  Ustunlar: {config.columns.join(' • ')}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => importApi.downloadTemplate(type)}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" /> Namuna
              </Button>
            </div>

            {/* Drag & drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
                ${dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30'}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              {parseMutation.isPending
                ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Fayl tahlil qilinmoqda…</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="h-10 w-10 text-muted-foreground/50" />
                    <div>
                      <p className="font-medium">Excel faylni bu yerga tashlang</p>
                      <p className="text-sm text-muted-foreground mt-1">yoki bosib faylni tanlang (.xlsx, .xls)</p>
                    </div>
                  </div>
                )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>
        )}

        {/* ── STEP 2: PREVIEW ───────────────────────────────────────────── */}
        {step === 'preview' && parseResult && (
          <div className="space-y-4 py-2">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-muted/40 border">
                <div className="text-2xl font-bold">{parseResult.total}</div>
                <div className="text-xs text-muted-foreground">Jami qator</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
                <div className="text-2xl font-bold text-green-600">{parseResult.valid}</div>
                <div className="text-xs text-muted-foreground">Yaroqli</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200">
                <div className="text-2xl font-bold text-red-600">{parseResult.invalid}</div>
                <div className="text-xs text-muted-foreground">Xatolik bor</div>
              </div>
            </div>

            {/* Xatolar */}
            {invalidRows.length > 0 && (
              <div className="border border-red-200 rounded-lg overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-3 bg-red-50 text-sm font-medium text-red-700"
                  onClick={() => setShowErrors(v => !v)}
                >
                  <span className="flex items-center gap-1.5">
                    <XCircle className="h-4 w-4" />
                    {invalidRows.length} ta qatorda xatolik
                  </span>
                  {showErrors ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showErrors && (
                  <ScrollArea className="max-h-40">
                    <div className="p-2 space-y-1">
                      {invalidRows.map((row) => (
                        <div key={row.row} className="flex gap-2 text-xs p-1.5 rounded bg-red-50/50">
                          <span className="font-mono text-muted-foreground w-12 shrink-0">Qator {row.row}:</span>
                          <span className="text-red-600">{row.errors.join(', ')}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}

            {/* Yaroqli qatorlar preview */}
            {validRows.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="p-2 bg-muted/50 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  Quyidagi {Math.min(validRows.length, 5)} ta yozuv saqlanadi (jami {validRows.length}):
                </div>
                <ScrollArea className="max-h-48">
                  <div className="divide-y">
                    {validRows.slice(0, 5).map((row) => (
                      <div key={row.row} className="px-3 py-2 text-xs font-mono">
                        {Object.entries(row.data)
                          .filter(([, v]) => v)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' | ')}
                      </div>
                    ))}
                    {validRows.length > 5 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        … va yana {validRows.length - 5} ta
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {canSelectBranch && parseResult.valid > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Filial (ixtiyoriy)</label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Joriy filial (avtomatik)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Joriy filial (avtomatik)</SelectItem>
                    {branchesList.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Agar tanlanmasa, import joriy filialga amalga oshiriladi
                </p>
              </div>
            )}

            {parseResult.valid === 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Saqlash mumkin emas — barcha qatorlarda xatolik bor.
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: RESULT ────────────────────────────────────────────── */}
        {step === 'result' && commitResult && (
          <div className="py-6 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <p className="text-xl font-bold">{commitResult.created} ta yozuv saqlandi!</p>
              {commitResult.skipped > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {commitResult.skipped} ta o&apos;tkazib yuborildi (allaqachon mavjud)
                </p>
              )}
            </div>
            {commitResult.errors.length > 0 && (
              <div className="text-left p-3 rounded-lg bg-red-50 border border-red-200 text-xs">
                <p className="font-medium text-red-700 mb-1">Xatolar:</p>
                {commitResult.errors.map((e, i) => <p key={i} className="text-red-600">{e}</p>)}
              </div>
            )}
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <DialogFooter className="gap-2">
          {step === 'upload' && (
            <Button variant="outline" onClick={() => handleClose(false)}>Bekor</Button>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                ← Qayta yuklash
              </Button>
              <Button
                onClick={() => commitMutation.mutate(validRows)}
                disabled={parseResult!.valid === 0 || commitMutation.isPending}
              >
                {commitMutation.isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saqlanmoqda…</>
                  : <><CheckCircle2 className="h-4 w-4 mr-2" />{parseResult!.valid} ta yozuvni saqlash</>
                }
              </Button>
            </>
          )}

          {step === 'result' && (
            <>
              <Button variant="outline" onClick={reset}>Yana import</Button>
              <Button onClick={() => handleClose(false)}>Yopish</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
