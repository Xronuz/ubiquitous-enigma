'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, Check, Settings2, Loader2, Trash2, X, ClipboardCheck, GraduationCap, CreditCard, BookMarked, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { notificationsApi } from '@/lib/api/notifications';
import { formatDate, cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useConfirm } from '@/store/confirm.store';

// ── Notification type → icon + color ──────────────────────────────────────
const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  attendance:  { icon: ClipboardCheck, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-950/40' },
  grade:       { icon: GraduationCap,  color: 'text-green-600',  bg: 'bg-green-100 dark:bg-green-950/40' },
  payment:     { icon: CreditCard,     color: 'text-red-600',    bg: 'bg-red-100 dark:bg-red-950/40' },
  homework:    { icon: BookMarked,     color: 'text-blue-600',   bg: 'bg-blue-100 dark:bg-blue-950/40' },
  in_app:      { icon: Bell,           color: 'text-primary',    bg: 'bg-primary/10' },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG['in_app'];
}

// ── Date grouping helpers ──────────────────────────────────────────────────
function getGroupLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 6 * 86400000);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (d.getTime() === today.getTime()) return 'Bugun';
  if (d.getTime() === yesterday.getTime()) return 'Kecha';
  if (d >= weekAgo) return 'Bu hafta';
  return 'Oldingi';
}

function groupNotifications(list: any[]) {
  const groups: Record<string, any[]> = {};
  const order = ['Bugun', 'Kecha', 'Bu hafta', 'Oldingi'];
  for (const n of list) {
    const label = getGroupLabel(n.createdAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }
  return order.filter(k => groups[k]?.length).map(k => ({ label: k, items: groups[k] }));
}

const PREF_LABELS: Record<string, { label: string; description: string }> = {
  sms_attendance: { label: 'SMS: Davomat', description: "Farzand darsga kelmasa SMS ko'rish" },
  sms_payment:    { label: 'SMS: To\'lov eslatmasi', description: "To'lov muddati kelganda SMS" },
  email_grades:   { label: 'Email: Yangi baholar', description: 'Yangi baho qo\'yilganda email' },
  email_homework: { label: 'Email: Uy vazifalari', description: 'Yangi vazifa berilganda email' },
  push_all:       { label: 'Push bildirishnomalar', description: 'Barcha turdagi push notifications' },
};

function PreferencesPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [localPrefs, setLocalPrefs] = useState<Record<string, boolean> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: notificationsApi.getPreferences,
    select: (d: { preferences: Record<string, boolean> }) => d.preferences,
  });

  useEffect(() => {
    if (data && !localPrefs) setLocalPrefs(data);
  }, [data, localPrefs]);

  const prefs: Record<string, boolean> = localPrefs ?? data ?? {};

  const saveMutation = useMutation({
    mutationFn: () => notificationsApi.updatePreferences(prefs),
    onSuccess: () => {
      toast({ title: '✅ Sozlamalar saqlandi' });
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
    onError: () => toast({ variant: 'destructive', title: 'Xato', description: 'Saqlab bo\'lmadi' }),
  });

  const toggle = (key: string) => {
    setLocalPrefs(p => ({ ...(p ?? prefs), [key]: !(p ?? prefs)[key] }));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings2 className="h-4 w-4" /> Bildirishnoma sozlamalari
        </CardTitle>
        <CardDescription className="text-xs">Qaysi turdagi bildirishnomalarni olishni tanlang</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <>
            {Object.entries(PREF_LABELS).map(([key, { label, description }]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <div>
                  <Label className="font-medium text-sm">{label}</Label>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Switch
                  checked={prefs[key] ?? false}
                  onCheckedChange={() => toggle(key)}
                />
              </div>
            ))}
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="w-full"
            >
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Saqlash
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function NotificationsPage() {
  const ask = useConfirm();
  const [showPrefs, setShowPrefs] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getMyNotifications({ limit: 50 }),
  });

  const { toast } = useToast();

  const readMutation = useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const readAllMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: notificationsApi.deleteOne,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteAllMutation = useMutation({
    mutationFn: notificationsApi.deleteAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: 'Barcha bildirishnomalar o\'chirildi' });
    },
  });

  const notifications = data?.data ?? [];
  const unread = data?.meta?.unreadCount ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bildirishnomalar</h1>
          {unread > 0 && (
            <p className="text-muted-foreground">{unread} ta o'qilmagan</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowPrefs(p => !p)} title="Sozlamalar">
            <Settings2 className="h-4 w-4" />
          </Button>
          {unread > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => readAllMutation.mutate()}
              disabled={readAllMutation.isPending}
            >
              <Check className="mr-2 h-4 w-4" />
              Barchasini o&apos;qildi
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={async () => {
                if (await ask({ title: "Barcha bildirishnomalarni o'chirasizmi?", variant: 'destructive', confirmText: "O'chirish" })) deleteAllMutation.mutate();
              }}
              disabled={deleteAllMutation.isPending}
            >
              {deleteAllMutation.isPending
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Trash2 className="mr-2 h-4 w-4" />}
              Barchasini o&apos;chirish
            </Button>
          )}
        </div>
      </div>

      {showPrefs && <PreferencesPanel />}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center text-muted-foreground">
            <BellOff className="mb-4 h-12 w-12" />
            <p>Bildirishnomalar yo'q</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupNotifications(notifications).map(({ label, items }) => (
            <div key={label} className="space-y-2">
              {/* Group header */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              {/* Items */}
              {items.map((n: any) => {
                const cfg = getTypeConfig(n.type);
                const Icon = cfg.icon;
                return (
                  <Card
                    key={n.id}
                    className={cn(!n.isRead && 'border-primary/40 bg-primary/5 dark:bg-primary/10')}
                  >
                    <CardContent className="flex items-start gap-3 p-4">
                      {/* Type icon */}
                      <div className={cn('rounded-lg p-2 shrink-0 mt-0.5', cfg.bg)}>
                        <Icon className={cn('h-4 w-4', cfg.color)} />
                      </div>
                      {/* Content */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => !n.isRead && readMutation.mutate(n.id)}
                      >
                        <div className="flex items-center gap-2">
                          <p className={cn('font-medium text-sm', !n.isRead && 'text-foreground')}>{n.title}</p>
                          {!n.isRead && (
                            <Badge variant="default" className="text-[10px] h-4 px-1.5">Yangi</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(n.createdAt)}</p>
                      </div>
                      {/* Actions */}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMutation.mutate(n.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
