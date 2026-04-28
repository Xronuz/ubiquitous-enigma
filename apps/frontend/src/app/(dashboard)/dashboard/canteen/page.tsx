'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UtensilsCrossed, Plus, ChevronLeft, ChevronRight,
  Coffee, Sun, Sunset, Apple, Trash2, Loader2,
  LayoutGrid, CalendarDays, Flame, Banknote,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { canteenApi, MenuItem } from '@/lib/api/canteen';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/use-toast';

// ── Constants ─────────────────────────────────────────────────────────────────

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Nonushta', icon: Coffee, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { value: 'lunch', label: 'Tushlik', icon: Sun, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { value: 'snack', label: 'Oraliq ovqat', icon: Apple, color: 'text-green-500', bg: 'bg-green-500/10' },
  { value: 'dinner', label: 'Kechki ovqat', icon: Sunset, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
];

const DAYS_UZ = ['Yak', 'Du', 'Se', 'Cho', 'Pay', 'Ju', 'Sha'];
const MONTHS_UZ = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDateUz(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${MONTHS_UZ[d.getMonth()]}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CanteenPage() {
  const { user, activeBranchId } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canManage = ['school_admin', 'vice_principal'].includes(user?.role ?? '');

  // Week navigation
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const from = toDateStr(weekStart);
  const to = toDateStr(weekEnd);

  // Selected day
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));

  // View toggle: day | week
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  // Create menu dialog
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    mealType: 'lunch',
    price: '',
    items: [{ name: '', description: '', calories: '' }] as { name: string; description: string; calories: string }[],
  });

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: weekMenu = [], isLoading } = useQuery({
    queryKey: ['canteen', 'week', from, to, activeBranchId],
    queryFn: () => canteenApi.getWeekMenu({ from, to }),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const upsertMutation = useMutation({
    mutationFn: canteenApi.upsert,
    onSuccess: () => {
      toast({ title: '✅ Menyu saqlandi' });
      queryClient.invalidateQueries({ queryKey: ['canteen'] });
      setOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: canteenApi.remove,
    onSuccess: () => {
      toast({ title: 'Menyu o\'chirildi' });
      queryClient.invalidateQueries({ queryKey: ['canteen'] });
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  const resetForm = () => {
    setForm({ mealType: 'lunch', price: '', items: [{ name: '', description: '', calories: '' }] });
  };

  const addItem = () => {
    setForm(f => ({ ...f, items: [...f.items, { name: '', description: '', calories: '' }] }));
  };

  const updateItem = (i: number, field: string, value: string) => {
    setForm(f => {
      const items = [...f.items];
      items[i] = { ...items[i], [field]: value };
      return { ...f, items };
    });
  };

  const removeItem = (i: number) => {
    setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  };

  const handleSave = () => {
    const validItems = form.items.filter(it => it.name.trim());
    if (validItems.length === 0) {
      toast({ variant: 'destructive', title: 'Xato', description: 'Kamida bitta taom nomi kiriting' });
      return;
    }
    upsertMutation.mutate({
      date: selectedDate,
      mealType: form.mealType,
      price: form.price ? Number(form.price) : undefined,
      itemsJson: validItems.map(it => ({
        name: it.name.trim(),
        description: it.description || undefined,
        calories: it.calories ? Number(it.calories) : undefined,
      })),
    });
  };

  // ── Build week days ────────────────────────────────────────────────────────

  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    weekDays.push(d);
  }

  // Filter menu for selected day
  const dayMenu = weekMenu.filter(m => m.date?.startsWith(selectedDate));

  const getMealType = (value: string) => MEAL_TYPES.find(m => m.value === value) ?? MEAL_TYPES[1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UtensilsCrossed className="h-6 w-6 text-primary" />
            Ovqatxona
          </h1>
          <p className="text-muted-foreground">Haftalik ovqatxona menyusi</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setViewMode('day')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'day' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Kunlik
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'week' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Haftalik
            </button>
          </div>
          {canManage && (
            <Button onClick={() => { resetForm(); setOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Menyu qo'shish
            </Button>
          )}
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => {
          const prev = new Date(weekStart);
          prev.setDate(prev.getDate() - 7);
          setWeekStart(prev);
        }}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 flex gap-1.5 overflow-x-auto pb-1">
          {weekDays.map((day, i) => {
            const dateStr = toDateStr(day);
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === toDateStr(new Date());
            const hasMenu = weekMenu.some(m => m.date?.startsWith(dateStr));

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(dateStr)}
                className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2.5 min-w-[52px] text-center transition-all border ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : isToday
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-transparent hover:bg-accent'
                }`}
              >
                <span className="text-[10px] font-medium opacity-70">{DAYS_UZ[day.getDay()]}</span>
                <span className="text-base font-bold">{day.getDate()}</span>
                {hasMenu && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/60' : 'bg-primary'}`} />
                )}
              </button>
            );
          })}
        </div>

        <Button variant="outline" size="icon" onClick={() => {
          const next = new Date(weekStart);
          next.setDate(next.getDate() + 7);
          setWeekStart(next);
        }}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Day view ──────────────────────────────────────────────────────────── */}
      {viewMode === 'day' && (
        <>
          {/* Selected day info + stats */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {formatDateUz(selectedDate)} uchun menyu
            </p>
            {dayMenu.length > 0 && (() => {
              const totalCal = dayMenu.flatMap(m => Array.isArray(m.itemsJson) ? m.itemsJson : [])
                .reduce((sum, it) => sum + (it.calories ?? 0), 0);
              const totalPrice = dayMenu.reduce((sum, m) => sum + (m.price ?? 0), 0);
              return (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {totalCal > 0 && (
                    <span className="flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5 text-orange-500" />
                      {totalCal} kkal
                    </span>
                  )}
                  {totalPrice > 0 && (
                    <span className="flex items-center gap-1">
                      <Banknote className="h-3.5 w-3.5 text-green-600" />
                      {formatCurrency(totalPrice)}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Menu cards */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
          ) : dayMenu.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <UtensilsCrossed className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground">Bu kun uchun menyu kiritilmagan</p>
                {canManage && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => { resetForm(); setOpen(true); }}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Menyu qo'shish
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {dayMenu.map(menu => {
                const mealType = getMealType(menu.mealType);
                const MealIcon = mealType.icon;
                const items: MenuItem[] = Array.isArray(menu.itemsJson) ? menu.itemsJson : [];
                const totalCal = items.reduce((s, it) => s + (it.calories ?? 0), 0);

                return (
                  <Card key={menu.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl ${mealType.bg}`}>
                            <MealIcon className={`h-5 w-5 ${mealType.color}`} />
                          </div>
                          <div>
                            <CardTitle className="text-base">{mealType.label}</CardTitle>
                            <div className="flex items-center gap-2 mt-0.5">
                              {menu.price && (
                                <CardDescription>{formatCurrency(menu.price)}</CardDescription>
                              )}
                              {totalCal > 0 && (
                                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                  <Flame className="h-3 w-3 text-orange-400" />
                                  {totalCal} kkal
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeMutation.mutate(menu.id)}
                            disabled={removeMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {items.map((item, i) => (
                          <div key={i} className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">{item.name}</p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                              )}
                            </div>
                            {item.calories && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                {item.calories} kkal
                              </Badge>
                            )}
                          </div>
                        ))}
                        {items.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">Taomlar kiritilmagan</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Week view ─────────────────────────────────────────────────────────── */}
      {viewMode === 'week' && (
        <>
          {/* Week stats bar */}
          {weekMenu.length > 0 && (() => {
            const totalMeals = weekMenu.length;
            const totalCal = weekMenu.flatMap(m => Array.isArray(m.itemsJson) ? m.itemsJson : [])
              .reduce((s, it) => s + (it.calories ?? 0), 0);
            const totalCost = weekMenu.reduce((s, m) => s + (m.price ?? 0), 0);
            const daysWithMenu = new Set(weekMenu.map(m => m.date?.split('T')[0])).size;
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Jami ovqat', value: `${totalMeals} ta`, icon: UtensilsCrossed, color: 'text-primary' },
                  { label: 'Faol kunlar', value: `${daysWithMenu}/7`, icon: CalendarDays, color: 'text-blue-500' },
                  { label: 'Jami kaloriya', value: totalCal > 0 ? `${totalCal} kkal` : '—', icon: Flame, color: 'text-orange-500' },
                  { label: 'Haftalik narx', value: totalCost > 0 ? formatCurrency(totalCost) : '—', icon: Banknote, color: 'text-green-600' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <Card key={label}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <Icon className={`h-8 w-8 ${color} shrink-0 opacity-80`} />
                      <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-bold">{value}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()}

          {/* Full week grid: rows = meal types, cols = days */}
          {isLoading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : (
            <Card className="overflow-x-auto">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Haftalik menyu jadvali</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left p-3 font-medium text-muted-foreground w-32">Ovqat turi</th>
                      {weekDays.map((day, i) => {
                        const dateStr = toDateStr(day);
                        const isToday = dateStr === toDateStr(new Date());
                        return (
                          <th
                            key={i}
                            className={`p-3 text-center font-medium min-w-[110px] cursor-pointer hover:bg-accent transition-colors ${
                              isToday ? 'text-primary' : 'text-muted-foreground'
                            }`}
                            onClick={() => { setSelectedDate(dateStr); setViewMode('day'); }}
                          >
                            <div className="text-xs opacity-70">{DAYS_UZ[day.getDay()]}</div>
                            <div className={`text-base font-bold ${isToday ? 'text-primary' : ''}`}>{day.getDate()}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {MEAL_TYPES.map(mealType => {
                      const MealIcon = mealType.icon;
                      return (
                        <tr key={mealType.value} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg ${mealType.bg}`}>
                                <MealIcon className={`h-3.5 w-3.5 ${mealType.color}`} />
                              </div>
                              <span className="text-xs font-medium">{mealType.label}</span>
                            </div>
                          </td>
                          {weekDays.map((day, i) => {
                            const dateStr = toDateStr(day);
                            const menu = weekMenu.find(
                              m => m.date?.startsWith(dateStr) && m.mealType === mealType.value
                            );
                            const items: MenuItem[] = menu && Array.isArray(menu.itemsJson) ? menu.itemsJson : [];
                            return (
                              <td key={i} className="p-2 align-top">
                                {menu ? (
                                  <div className={`rounded-lg p-2 ${mealType.bg} space-y-1`}>
                                    {items.slice(0, 3).map((item, j) => (
                                      <p key={j} className="text-xs font-medium leading-tight truncate" title={item.name}>
                                        {item.name}
                                      </p>
                                    ))}
                                    {items.length > 3 && (
                                      <p className="text-xs text-muted-foreground">+{items.length - 3} ta</p>
                                    )}
                                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-black/5">
                                      {menu.price ? (
                                        <span className="text-xs opacity-60">{formatCurrency(menu.price)}</span>
                                      ) : <span />}
                                      {canManage && (
                                        <button
                                          onClick={() => removeMutation.mutate(menu.id)}
                                          className="text-muted-foreground hover:text-destructive"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="rounded-lg border border-dashed border-muted p-2 text-center">
                                    {canManage ? (
                                      <button
                                        onClick={() => { setSelectedDate(dateStr); resetForm(); setForm(f => ({ ...f, mealType: mealType.value })); setOpen(true); }}
                                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                                      >
                                        <Plus className="h-3 w-3 mx-auto mb-0.5" />
                                        Qo'shish
                                      </button>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {weekMenu.length === 0 && !isLoading && (
            <Card>
              <CardContent className="py-16 text-center">
                <UtensilsCrossed className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground">Bu hafta uchun menyu kiritilmagan</p>
                {canManage && (
                  <Button variant="outline" className="mt-4" onClick={() => { resetForm(); setOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Menyu qo'shish
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Create menu dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Menyu qo'shish</DialogTitle>
            <DialogDescription>
              {formatDateUz(selectedDate)} — ovqatxona menyusi
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Meal type */}
            <div className="space-y-1.5">
              <Label>Ovqat turi <span className="text-destructive">*</span></Label>
              <Select value={form.mealType} onValueChange={v => setForm(f => ({ ...f, mealType: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      <span className="flex items-center gap-2">
                        <m.icon className={`h-4 w-4 ${m.color}`} />
                        {m.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price */}
            <div className="space-y-1.5">
              <Label>Narxi (ixtiyoriy)</Label>
              <Input
                type="number"
                placeholder="Masalan: 15000"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              />
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Taomlar <span className="text-destructive">*</span></Label>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addItem}>
                  <Plus className="mr-1 h-3 w-3" /> Qo'shish
                </Button>
              </div>
              <div className="space-y-3">
                {form.items.map((item, i) => (
                  <div key={i} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">{i + 1}-taom</p>
                      {form.items.length > 1 && (
                        <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <Input
                      placeholder="Taom nomi *"
                      value={item.name}
                      onChange={e => updateItem(i, 'name', e.target.value)}
                      className="h-8 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Tavsif"
                        value={item.description}
                        onChange={e => updateItem(i, 'description', e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Input
                        type="number"
                        placeholder="Kaloriya"
                        value={item.calories}
                        onChange={e => updateItem(i, 'calories', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Bekor</Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
