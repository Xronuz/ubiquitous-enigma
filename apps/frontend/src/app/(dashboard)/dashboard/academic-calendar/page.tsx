'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Plus, Loader2, Trash2, ChevronLeft, ChevronRight, Download, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { academicCalendarApi, type AcademicEventType } from '@/lib/api/academic-calendar';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/use-toast';

const EVENT_TYPES: { value: AcademicEventType; label: string; color: string }[] = [
  { value: 'holiday',       label: "Ta'til",              color: '#22c55e' },
  { value: 'exam_week',     label: 'Imtihon haftasi',     color: '#ef4444' },
  { value: 'quarter_start', label: 'Chorak boshlanishi',  color: '#3b82f6' },
  { value: 'quarter_end',   label: 'Chorak tugashi',      color: '#8b5cf6' },
  { value: 'school_event',  label: 'Maktab tadbirи',      color: '#f59e0b' },
  { value: 'meeting',       label: "Yig'ilish",           color: '#06b6d4' },
  { value: 'other',         label: 'Boshqa',              color: '#94a3b8' },
];

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const DAYS_SHORT = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

const EMPTY: {
  title: string; description: string; type: AcademicEventType;
  startDate: string; endDate: string; color: string;
} = {
  title: '', description: '', type: 'other',
  startDate: new Date().toISOString().slice(0, 10),
  endDate:   new Date().toISOString().slice(0, 10),
  color: '#3b82f6',
};

export default function AcademicCalendarPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canManage = ['director', 'vice_principal'].includes(user?.role ?? '');

  const now = new Date();
  const [viewYear, setViewYear]   = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [open, setOpen]           = useState(false);
  const [form, setForm]           = useState(EMPTY);

  // Fetch events for current month ±1 day buffer
  const from = new Date(viewYear, viewMonth, 1).toISOString().slice(0, 10);
  const to   = new Date(viewYear, viewMonth + 1, 0).toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ['academic-calendar', viewYear, viewMonth],
    queryFn: () => academicCalendarApi.getAll({ from, to }),
  });
  const events: any[] = Array.isArray(data) ? data : [];

  const createMutation = useMutation({
    mutationFn: () => academicCalendarApi.create({
      title:       form.title,
      description: form.description || undefined,
      type:        form.type,
      startDate:   form.startDate,
      endDate:     form.endDate,
      color:       form.color,
    }),
    onSuccess: () => {
      toast({ title: '✅ Tadbir qo\'shildi' });
      queryClient.invalidateQueries({ queryKey: ['academic-calendar'] });
      setOpen(false);
      setForm(EMPTY);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: academicCalendarApi.remove,
    onSuccess: () => {
      toast({ title: "Tadbir o'chirildi" });
      queryClient.invalidateQueries({ queryKey: ['academic-calendar'] });
    },
  });

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Mon=0
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const getEventsForDay = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => {
      const start = e.startDate.slice(0, 10);
      const end   = e.endDate.slice(0, 10);
      return dateStr >= start && dateStr <= end;
    });
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" /> Akademik kalendar
          </h1>
          <p className="text-muted-foreground">Ta'tillar, imtihonlar, tadbirlar</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => academicCalendarApi.exportPdf({ from: `${viewYear}-01-01`, to: `${viewYear}-12-31` })
              .catch(() => toast({ variant: 'destructive', title: 'PDF yuklab olishda xato' }))}
          >
            <Download className="mr-1.5 h-4 w-4" /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => academicCalendarApi.exportICal({ from: `${viewYear}-01-01`, to: `${viewYear}-12-31` })
              .catch(() => toast({ variant: 'destructive', title: 'iCal yuklab olishda xato' }))}
          >
            <Calendar className="mr-1.5 h-4 w-4" /> iCal
          </Button>
          {canManage && (
            <Button onClick={() => { setForm(EMPTY); setOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Tadbir qo'shish
            </Button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {EVENT_TYPES.map(t => (
          <div key={t.value} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
            {t.label}
          </div>
        ))}
      </div>

      <Card>
        {/* Month navigation */}
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-base">
            {MONTHS[viewMonth]} {viewYear}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-7 gap-1">
              {Array(35).fill(0).map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : (
            <>
              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS_SHORT.map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {Array.from({ length: totalCells }).map((_, idx) => {
                  const day = idx - startOffset + 1;
                  const isCurrentMonth = day >= 1 && day <= daysInMonth;
                  const dateStr = isCurrentMonth
                    ? `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    : '';
                  const isToday = dateStr === todayStr;
                  const dayEvents = isCurrentMonth ? getEventsForDay(day) : [];

                  return (
                    <div
                      key={idx}
                      className={`bg-background min-h-[80px] p-1 ${!isCurrentMonth ? 'opacity-30' : ''}`}
                    >
                      {isCurrentMonth && (
                        <>
                          <div className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium mb-1
                            ${isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                            {day}
                          </div>
                          <div className="space-y-0.5">
                            {dayEvents.slice(0, 3).map(e => {
                              const typeConf = EVENT_TYPES.find(t => t.value === e.type);
                              const bgColor  = e.color ?? typeConf?.color ?? '#94a3b8';
                              return (
                                <div
                                  key={e.id}
                                  className="group relative flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium text-white leading-tight truncate"
                                  style={{ background: bgColor }}
                                  title={e.title}
                                >
                                  <span className="truncate">{e.title}</span>
                                  {canManage && (
                                    <button
                                      onClick={() => deleteMutation.mutate(e.id)}
                                      className="ml-auto opacity-0 group-hover:opacity-100 shrink-0"
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            {dayEvents.length > 3 && (
                              <p className="text-[9px] text-muted-foreground pl-1">+{dayEvents.length - 3} ko'proq</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Upcoming events list */}
      {events.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Bu oyning tadbirlari</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {events.map(e => {
              const typeConf = EVENT_TYPES.find(t => t.value === e.type);
              return (
                <div key={e.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ background: e.color ?? typeConf?.color ?? '#94a3b8' }} />
                  <div className="flex-1">
                    <p className="font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.startDate).toLocaleDateString('uz-UZ')}
                      {e.startDate !== e.endDate && ` – ${new Date(e.endDate).toLocaleDateString('uz-UZ')}`}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">{typeConf?.label ?? e.type}</Badge>
                  {canManage && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(e.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tadbir qo'shish</DialogTitle>
            <DialogDescription>Akademik kalendarга yangi tadbir kiriting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nomi <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Tadbir nomi..."
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tur</Label>
              <Select value={form.type} onValueChange={v => {
                const t = EVENT_TYPES.find(et => et.value === v);
                setForm(f => ({ ...f, type: v as AcademicEventType, color: t?.color ?? f.color }));
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Boshlanish <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tugash <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tavsif</Label>
              <Textarea
                placeholder="Qo'shimcha ma'lumot..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Bekor qilish</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!form.title || !form.startDate || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Qo'shish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
