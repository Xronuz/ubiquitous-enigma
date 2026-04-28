'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, UserCheck, Phone, MessageSquare, RefreshCw,
  TrendingUp, Users, Star, BarChart3, X, ChevronDown, Loader2,
  Instagram, Send, Globe, Share2, PhoneCall, Footprints,
  GraduationCap, ArrowRight, AlertTriangle, Copy, CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { classesApi } from '@/lib/api/classes';
import {
  leadsApi, KANBAN_COLUMNS, LEAD_STATUS_CONFIG, LEAD_SOURCE_CONFIG,
  type Lead, type LeadStatus, type LeadSource, type LeadAnalytics,
} from '@/lib/api/leads';

// ─── Source Icon ──────────────────────────────────────────────────────────────
function SourceIcon({ source }: { source: LeadSource }) {
  const icons: Record<LeadSource, React.ReactNode> = {
    INSTAGRAM: <Instagram className="h-3 w-3" />,
    TELEGRAM:  <Send       className="h-3 w-3" />,
    FACEBOOK:  <Share2     className="h-3 w-3" />,
    WEBSITE:   <Globe      className="h-3 w-3" />,
    REFERRAL:  <Users      className="h-3 w-3" />,
    CALL:      <PhoneCall  className="h-3 w-3" />,
    WALK_IN:   <Footprints className="h-3 w-3" />,
    OTHER:     <Star       className="h-3 w-3" />,
  };
  const cfg = LEAD_SOURCE_CONFIG[source];
  return (
    <span title={cfg.label} className={cfg.color}>
      {icons[source]}
    </span>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────
function LeadCard({
  lead, onStatusChange, onConvert, onOpenDetail,
}: {
  lead: Lead;
  onStatusChange: (id: string, status: LeadStatus) => void;
  onConvert:      (lead: Lead) => void;
  onOpenDetail:   (lead: Lead) => void;
}) {
  const cfg  = LEAD_STATUS_CONFIG[lead.status];
  const isConverted = lead.status === 'CONVERTED';

  return (
    <div
      className={`rounded-xl border bg-card p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group ${
        isConverted ? 'opacity-70' : ''
      }`}
      onClick={() => onOpenDetail(lead)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">
            {lead.firstName} {lead.lastName}
          </p>
          <a
            href={`tel:${lead.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mt-0.5"
          >
            <Phone className="h-3 w-3" />
            {lead.phone}
          </a>
        </div>
        <SourceIcon source={lead.source} />
      </div>

      {/* Class expectation */}
      {lead.expectedClass && (
        <div className="text-xs text-muted-foreground mb-2">
          📚 {lead.expectedClass.name}
        </div>
      )}

      {/* Note preview */}
      {lead.note && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2 italic">
          "{lead.note}"
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          {(lead._count?.comments ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <MessageSquare className="h-2.5 w-2.5" />
              {lead._count!.comments}
            </span>
          )}
          {lead.assignedTo && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
              👤 {lead.assignedTo.firstName}
            </span>
          )}
        </div>

        {!isConverted && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            {lead.status === 'WAITING_PAYMENT' && (
              <Button
                size="sm"
                variant="default"
                className="h-6 text-[10px] px-2 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => onConvert(lead)}
              >
                <GraduationCap className="h-3 w-3 mr-1" /> Convert
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-1.5">
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {KANBAN_COLUMNS.filter(s => s !== lead.status && s !== 'CONVERTED').map(s => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => onStatusChange(lead.id, s)}
                    className="text-xs"
                  >
                    <ArrowRight className="h-3 w-3 mr-2" />
                    {LEAD_STATUS_CONFIG[s].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {isConverted && (
          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
        )}
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────
function KanbanColumn({
  status, leads, onStatusChange, onConvert, onOpenDetail, onAddLead,
}: {
  status:        LeadStatus;
  leads:         Lead[];
  onStatusChange: (id: string, status: LeadStatus) => void;
  onConvert:     (lead: Lead) => void;
  onOpenDetail:  (lead: Lead) => void;
  onAddLead:     (status: LeadStatus) => void;
}) {
  const cfg = LEAD_STATUS_CONFIG[status];

  return (
    <div className={`flex flex-col rounded-xl border ${cfg.borderColor} ${cfg.bgColor} min-w-[240px] max-w-[280px] flex-shrink-0`}>
      {/* Column header */}
      <div className={`flex items-center justify-between px-3 py-2.5 border-b ${cfg.borderColor}`}>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${cfg.dotColor}`} />
          <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
        </div>
        <Badge variant="secondary" className="h-4 text-[10px] px-1.5">{leads.length}</Badge>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2 flex-1 min-h-[80px] overflow-y-auto max-h-[calc(100vh-260px)]">
        {leads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onStatusChange={onStatusChange}
            onConvert={onConvert}
            onOpenDetail={onOpenDetail}
          />
        ))}

        {leads.length === 0 && (
          <p className="text-[11px] text-muted-foreground text-center py-4 opacity-60">Bo'sh</p>
        )}
      </div>

      {/* Add button (faqat NEW kolonnada) */}
      {status === 'NEW' && (
        <button
          onClick={() => onAddLead(status)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-t border-border/40 rounded-b-xl"
        >
          <Plus className="h-3 w-3" /> Lead qo'shish
        </button>
      )}
    </div>
  );
}

// ─── Analytics Panel ──────────────────────────────────────────────────────────
function AnalyticsPanel({ analytics }: { analytics: LeadAnalytics }) {
  const total = analytics.totalLeads;

  return (
    <div className="space-y-4">
      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Jami leadlar", value: total, icon: Users,       color: 'text-blue-600' },
          { label: 'Konversiya',   value: `${analytics.conversionRate}%`, icon: TrendingUp, color: 'text-green-600' },
          { label: 'Bu oy convert', value: analytics.convertedThisMonth, icon: UserCheck, color: 'text-purple-600' },
          { label: 'Bu hafta yangi', value: analytics.newThisWeek, icon: Star,       color: 'text-amber-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border/60">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Source breakdown */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Manbalar bo'yicha (qaysi reklama ishlayapti?)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {analytics.bySource.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ma'lumot yo'q</p>
          ) : (
            <div className="space-y-2">
              {analytics.bySource.map(({ source, count }) => {
                const cfg = LEAD_SOURCE_CONFIG[source as LeadSource];
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={source} className="flex items-center gap-3">
                    <span className={`text-sm shrink-0 w-5 ${cfg.color}`}>{cfg.emoji}</span>
                    <span className="text-sm shrink-0 w-24 truncate">{cfg.label}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 w-10 text-right">
                      {count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Create Lead Dialog ───────────────────────────────────────────────────────
const EMPTY_FORM = {
  firstName: '', lastName: '', phone: '', source: 'INSTAGRAM' as LeadSource,
  note: '', branchId: '', expectedClassId: '',
};

function CreateLeadDialog({
  open, onOpenChange, defaultStatus, onSuccess,
}: {
  open:          boolean;
  onOpenChange:  (v: boolean) => void;
  defaultStatus: LeadStatus;
  onSuccess:     () => void;
}) {
  const { toast }   = useToast();
  const { activeBranchId } = useAuthStore();
  const [form, setForm] = useState(EMPTY_FORM);
  const [dupError, setDupError] = useState<any>(null);

  const { data: classesData } = useQuery({
    queryKey: ['classes', activeBranchId],
    queryFn:  classesApi.getAll,
    enabled:  open,
    select:   (d: any) => (Array.isArray(d) ? d : d?.data ?? []),
  });

  const mutation = useMutation({
    mutationFn: leadsApi.create,
    onSuccess: () => {
      toast({ title: '✅ Lead qo\'shildi' });
      setForm(EMPTY_FORM);
      setDupError(null);
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: any) => {
      const body = err?.response?.data;
      if (body?.isDuplicate) {
        setDupError(body);
      } else {
        toast({ variant: 'destructive', title: 'Xato', description: body?.message ?? 'Xatolik yuz berdi' });
      }
    },
  });

  const set = (k: string) => (v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    if (k === 'phone') setDupError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Yangi lead</DialogTitle>
          <DialogDescription>Potensial o'quvchi ma'lumotlarini kiriting</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ism <span className="text-destructive">*</span></Label>
              <Input value={form.firstName} onChange={e => set('firstName')(e.target.value)} placeholder="Jasur" />
            </div>
            <div className="space-y-1.5">
              <Label>Familiya <span className="text-destructive">*</span></Label>
              <Input value={form.lastName} onChange={e => set('lastName')(e.target.value)} placeholder="Toshmatov" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Telefon <span className="text-destructive">*</span></Label>
            <Input
              value={form.phone}
              onChange={e => set('phone')(e.target.value)}
              placeholder="+998901234567"
              className={dupError ? 'border-amber-500' : ''}
            />
            {dupError && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-2.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Duplicate aniqlandi
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  <strong>{dupError.existingLead.firstName} {dupError.existingLead.lastName}</strong> —{' '}
                  {LEAD_STATUS_CONFIG[dupError.existingLead.status as LeadStatus]?.label}
                  {dupError.existingLead.assignedTo && <> · {dupError.existingLead.assignedTo}</>}
                </p>
                <p className="text-[10px] text-amber-500">Bu telefon allaqachon bazada. Mavjud leadni tahrirlang.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Manba</Label>
              <Select value={form.source} onValueChange={set('source')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAD_SOURCE_CONFIG).map(([src, cfg]) => (
                    <SelectItem key={src} value={src}>
                      {cfg.emoji} {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sinf/Guruh</Label>
              <Select value={form.expectedClassId} onValueChange={set('expectedClassId')}>
                <SelectTrigger><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {((classesData as any[]) ?? []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Izoh</Label>
            <Textarea
              value={form.note}
              onChange={e => set('note')(e.target.value)}
              placeholder="Qo'shimcha ma'lumot..."
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Bekor qilish</Button>
          <Button
            onClick={() => mutation.mutate({
              firstName:       form.firstName,
              lastName:        form.lastName,
              phone:           form.phone,
              source:          form.source,
              note:            form.note || undefined,
              expectedClassId: (form.expectedClassId && form.expectedClassId !== '__none__') ? form.expectedClassId : undefined,
            })}
            disabled={mutation.isPending || !form.firstName || !form.lastName || !form.phone || !!dupError}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Qo'shish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Convert to Student Dialog ────────────────────────────────────────────────
function ConvertDialog({
  lead, open, onOpenChange, onSuccess,
}: {
  lead:         Lead | null;
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess:    () => void;
}) {
  const { toast } = useToast();
  const { activeBranchId } = useAuthStore();
  const [classId, setClassId] = useState('');
  const [email,   setEmail]   = useState('');
  const [result,  setResult]  = useState<any>(null);
  const [copied,  setCopied]  = useState(false);

  const { data: classesData } = useQuery({
    queryKey: ['classes', activeBranchId],
    queryFn:  classesApi.getAll,
    enabled:  open,
    select:   (d: any) => (Array.isArray(d) ? d : d?.data ?? []),
  });

  const mutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      leadsApi.convertToStudent(id, payload),
    onSuccess: (data) => {
      setResult(data);
      onSuccess();
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Xato', description: err?.response?.data?.message ?? 'Xatolik' });
    },
  });

  const handleClose = () => {
    setClassId(''); setEmail(''); setResult(null); setCopied(false);
    onOpenChange(false);
  };

  const copyPassword = () => {
    if (result?.rawPassword) {
      navigator.clipboard.writeText(result.rawPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-green-600" />
            O'quvchiga aylantirish
          </DialogTitle>
          <DialogDescription>
            <strong>{lead.firstName} {lead.lastName}</strong> ({lead.phone}) ni o'quvchiga aylantirish
          </DialogDescription>
        </DialogHeader>

        {result ? (
          /* ── SUCCESS STATE ── */
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 rounded-xl border border-green-300 bg-green-50 dark:bg-green-950/30 p-4">
              <CheckCircle className="h-8 w-8 text-green-500 shrink-0" />
              <div>
                <p className="font-semibold text-green-700 dark:text-green-300">{result.message}</p>
                <p className="text-sm text-green-600 dark:text-green-400">Sinf: {result.className}</p>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
              <p><span className="text-muted-foreground">Email:</span> <strong>{result.student.email}</strong></p>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Parol:</span>
                <code className="rounded bg-muted px-2 py-0.5 font-mono text-sm">{result.rawPassword}</code>
                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={copyPassword}>
                  {copied ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Bu parolni o'quvchiga yuboring. Keyinroq ko'rinmaydi.
              </p>
            </div>
            <Button className="w-full" onClick={handleClose}>Yopish</Button>
          </div>
        ) : (
          /* ── FORM STATE ── */
          <>
            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <Label>Sinf / Guruh <span className="text-destructive">*</span></Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sinf tanlang..." />
                  </SelectTrigger>
                  <SelectContent>
                    {((classesData as any[]) ?? []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.gradeLevel && `(${c.gradeLevel}-sinf)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Email <span className="text-muted-foreground text-xs">(ixtiyoriy — yo'q bo'lsa telefon asosida)</span></Label>
                <Input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={`student${lead.phone.replace(/[^\d]/g, '')}@school.local`}
                  type="email"
                />
              </div>

              <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <p className="font-semibold">Bu operatsiya nima qiladi?</p>
                <ul className="space-y-0.5 pl-3 list-disc">
                  <li>Yangi o'quvchi (User) yaratadi</li>
                  <li>Tanlangan sinfga qo'shadi</li>
                  <li>Lead statusini CONVERTED ga o'tkazadi</li>
                  <li>Vaqtinchalik parol generatsiya qiladi</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Bekor qilish</Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={!classId || mutation.isPending}
                onClick={() => mutation.mutate({
                  id: lead.id,
                  payload: { classId, email: email || undefined },
                })}
              >
                {mutation.isPending
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Aylantirilmoqda...</>
                  : <><GraduationCap className="mr-2 h-4 w-4" /> O'quvchiga aylantir</>}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Lead Detail Drawer ───────────────────────────────────────────────────────
function LeadDetailDialog({
  lead, open, onOpenChange, onStatusChange, onConvert, onCommentAdd,
}: {
  lead:           Lead | null;
  open:           boolean;
  onOpenChange:   (v: boolean) => void;
  onStatusChange: (id: string, status: LeadStatus) => void;
  onConvert:      (lead: Lead) => void;
  onCommentAdd:   (leadId: string, text: string) => void;
}) {
  const [commentText, setCommentText] = useState('');
  const { user } = useAuthStore();

  const { data: fullLead, isLoading } = useQuery({
    queryKey: ['lead', lead?.id],
    queryFn:  () => leadsApi.getOne(lead!.id),
    enabled:  open && !!lead?.id,
  });

  const displayLead = fullLead ?? lead;
  if (!displayLead) return null;
  const cfg = LEAD_STATUS_CONFIG[displayLead.status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div>
              <p>{displayLead.firstName} {displayLead.lastName}</p>
              <p className="text-sm font-normal text-muted-foreground">{displayLead.phone}</p>
            </div>
            <Badge className={`ml-auto shrink-0 ${cfg.color} ${cfg.bgColor} border ${cfg.borderColor}`}>
              {cfg.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted/30 p-2.5">
              <p className="text-xs text-muted-foreground mb-0.5">Manba</p>
              <div className="flex items-center gap-1.5">
                <SourceIcon source={displayLead.source} />
                <span>{LEAD_SOURCE_CONFIG[displayLead.source].label}</span>
              </div>
            </div>
            {displayLead.expectedClass && (
              <div className="rounded-lg bg-muted/30 p-2.5">
                <p className="text-xs text-muted-foreground mb-0.5">Mo'ljallangan sinf</p>
                <p>{displayLead.expectedClass.name}</p>
              </div>
            )}
            {displayLead.assignedTo && (
              <div className="rounded-lg bg-muted/30 p-2.5">
                <p className="text-xs text-muted-foreground mb-0.5">Mas'ul xodim</p>
                <p>{displayLead.assignedTo.firstName} {displayLead.assignedTo.lastName}</p>
              </div>
            )}
            {displayLead.branch && (
              <div className="rounded-lg bg-muted/30 p-2.5">
                <p className="text-xs text-muted-foreground mb-0.5">Filial</p>
                <p>{displayLead.branch.name}</p>
              </div>
            )}
          </div>

          {/* Note */}
          {displayLead.note && (
            <div className="rounded-lg border bg-muted/20 p-3 text-sm">
              <p className="text-xs text-muted-foreground mb-1">Izoh</p>
              <p className="italic">"{displayLead.note}"</p>
            </div>
          )}

          {/* Status change */}
          {displayLead.status !== 'CONVERTED' && (
            <div className="flex flex-wrap gap-2">
              {KANBAN_COLUMNS.filter(s => s !== displayLead.status && s !== 'CONVERTED').map(s => {
                const c = LEAD_STATUS_CONFIG[s];
                return (
                  <Button
                    key={s}
                    size="sm"
                    variant="outline"
                    className={`text-xs h-7 ${c.color} border ${c.borderColor} ${c.bgColor} hover:opacity-80`}
                    onClick={() => { onStatusChange(displayLead.id, s); onOpenChange(false); }}
                  >
                    → {c.label}
                  </Button>
                );
              })}
            </div>
          )}

          {/* Convert button */}
          {(displayLead.status === 'WAITING_PAYMENT' || displayLead.status === 'TEST_LESSON') && (
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={() => { onConvert(displayLead); onOpenChange(false); }}
            >
              <GraduationCap className="mr-2 h-4 w-4" />
              O'quvchiga aylantirish
            </Button>
          )}

          {/* Comments */}
          <div>
            <p className="text-sm font-semibold mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Muloqot tarixi
            </p>
            {isLoading ? (
              <div className="space-y-2">
                {[1,2].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : (fullLead?.comments ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">Hali izoh yo'q</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(fullLead?.comments ?? []).map((c: any) => (
                  <div key={c.id} className="rounded-lg bg-muted/30 p-2.5 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">
                        {c.author ? `${c.author.firstName} ${c.author.lastName}` : 'Tizim'}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString('uz-UZ')}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{c.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add comment */}
            <div className="flex gap-2 mt-2">
              <Input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Izoh yozing..."
                className="text-xs h-8"
                onKeyDown={e => {
                  if (e.key === 'Enter' && commentText.trim()) {
                    onCommentAdd(displayLead.id, commentText.trim());
                    setCommentText('');
                  }
                }}
              />
              <Button
                size="sm"
                className="h-8 px-3"
                disabled={!commentText.trim()}
                onClick={() => {
                  onCommentAdd(displayLead.id, commentText.trim());
                  setCommentText('');
                }}
              >
                Yuborish
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CrmPage() {
  const { toast }       = useToast();
  const queryClient     = useQueryClient();
  const { user, activeBranchId } = useAuthStore();
  const [search,        setSearch]        = useState('');
  const [activeSource,  setActiveSource]  = useState<string>('');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [createOpen,    setCreateOpen]    = useState(false);
  const [createStatus,  setCreateStatus]  = useState<LeadStatus>('NEW');
  const [convertLead,   setConvertLead]   = useState<Lead | null>(null);
  const [detailLead,    setDetailLead]    = useState<Lead | null>(null);

  // ── Queries ─────────────────────────────────────────────────────────────
  const { data: listData, isLoading } = useQuery({
    queryKey: ['leads', { search, source: activeSource, branchId: activeBranchId }],
    queryFn:  () => leadsApi.getAll({ search: search || undefined, source: activeSource || undefined, limit: 200 }),
  });

  const { data: analytics } = useQuery({
    queryKey: ['leads-analytics', activeBranchId],
    queryFn:  () => leadsApi.getAnalytics(),
    enabled:  showAnalytics,
  });

  // ── Mutations ────────────────────────────────────────────────────────────
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    queryClient.invalidateQueries({ queryKey: ['leads-analytics'] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
      leadsApi.updateStatus(id, status),
    onSuccess: () => { toast({ title: 'Status yangilandi' }); invalidate(); },
    onError:   () => toast({ variant: 'destructive', title: 'Xato', description: 'Status yangilanmadi' }),
  });

  const commentMutation = useMutation({
    mutationFn: ({ leadId, text }: { leadId: string; text: string }) =>
      leadsApi.addComment(leadId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead'] });
      toast({ title: 'Izoh qo\'shildi' });
    },
  });

  // ── Derived ──────────────────────────────────────────────────────────────
  const allLeads: Lead[] = listData?.data ?? [];

  const grouped = useMemo(() => {
    const map: Record<LeadStatus, Lead[]> = {
      NEW: [], CONTACTED: [], TEST_LESSON: [], WAITING_PAYMENT: [], CONVERTED: [], CLOSED: [],
    };
    allLeads.forEach(lead => {
      if (map[lead.status]) map[lead.status].push(lead);
    });
    return map;
  }, [allLeads]);

  const canManage = ['school_admin', 'director', 'branch_admin', 'vice_principal', 'accountant'].includes(user?.role ?? '');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">CRM — Leadlar</h1>
          <p className="text-muted-foreground text-sm">
            Jami {listData?.total ?? 0} ta lead
            {allLeads.filter(l => l.status === 'CONVERTED').length > 0 && (
              <> · <span className="text-green-600 font-medium">
                {allLeads.filter(l => l.status === 'CONVERTED').length} ta converted
              </span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowAnalytics(v => !v)}>
            <BarChart3 className="mr-2 h-4 w-4" />
            {showAnalytics ? 'Kanban' : 'Tahlil'}
          </Button>
          <Button variant="ghost" size="sm" onClick={invalidate}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canManage && (
            <Button onClick={() => { setCreateStatus('NEW'); setCreateOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Lead qo'shish
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Ism, telefon..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 w-56 text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          <Button
            variant={activeSource === '' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setActiveSource('')}
          >
            Barchasi
          </Button>
          {Object.entries(LEAD_SOURCE_CONFIG).map(([src, cfg]) => (
            <Button
              key={src}
              variant={activeSource === src ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setActiveSource(activeSource === src ? '' : src)}
            >
              {cfg.emoji} {cfg.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Analytics or Kanban */}
      {showAnalytics ? (
        analytics != null
          ? <AnalyticsPanel analytics={analytics} />
          : <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
      ) : (
        /* ── KANBAN BOARD ── */
        isLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {KANBAN_COLUMNS.map(s => (
              <div key={s} className="min-w-[240px] space-y-2">
                <Skeleton className="h-8 rounded-xl" />
                {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-3">
            {KANBAN_COLUMNS.map(status => (
              <KanbanColumn
                key={status}
                status={status}
                leads={grouped[status]}
                onStatusChange={(id, s) => statusMutation.mutate({ id, status: s })}
                onConvert={setConvertLead}
                onOpenDetail={setDetailLead}
                onAddLead={(s) => { setCreateStatus(s); setCreateOpen(true); }}
              />
            ))}
          </div>
        )
      )}

      {/* Dialogs */}
      <CreateLeadDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultStatus={createStatus}
        onSuccess={invalidate}
      />

      <ConvertDialog
        lead={convertLead}
        open={!!convertLead}
        onOpenChange={(v) => { if (!v) setConvertLead(null); }}
        onSuccess={invalidate}
      />

      <LeadDetailDialog
        lead={detailLead}
        open={!!detailLead}
        onOpenChange={(v) => { if (!v) setDetailLead(null); }}
        onStatusChange={(id, s) => statusMutation.mutate({ id, status: s })}
        onConvert={(l) => { setDetailLead(null); setConvertLead(l); }}
        onCommentAdd={(leadId, text) => commentMutation.mutate({ leadId, text })}
      />
    </div>
  );
}
