'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, CheckCheck, ExternalLink, Loader2,
  AlertCircle, BookOpen, CreditCard, ClipboardCheck, Info, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { notificationsApi } from '@/lib/api/notifications';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

/* ── notification type helpers ───────────────────────────────────────── */
const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  attendance:  { icon: ClipboardCheck, color: 'text-green-600',  bg: 'bg-green-100 dark:bg-green-900/30' },
  grade:       { icon: BookOpen,       color: 'text-blue-600',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
  payment:     { icon: CreditCard,     color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  homework:    { icon: BookOpen,       color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/30' },
  in_app:      { icon: Info,           color: 'text-primary',    bg: 'bg-primary/10' },
  default:     { icon: AlertCircle,    color: 'text-muted-foreground', bg: 'bg-muted' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)   return 'Hozir';
  if (mins  < 60)  return `${mins} daqiqa oldin`;
  if (hours < 24)  return `${hours} soat oldin`;
  if (days  < 7)   return `${days} kun oldin`;
  return new Date(dateStr).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
}

/* ── single notification row ─────────────────────────────────────────── */
function NotifRow({
  notif,
  onRead,
}: {
  notif: any;
  onRead: (id: string) => void;
}) {
  const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.default;
  const Icon = cfg.icon;

  return (
    <button
      onClick={() => !notif.isRead && onRead(notif.id)}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50',
        !notif.isRead && 'bg-primary/5',
      )}
    >
      {/* icon */}
      <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', cfg.bg)}>
        <Icon className={cn('h-4 w-4', cfg.color)} />
      </span>

      {/* content */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm leading-snug', !notif.isRead && 'font-semibold')}>{notif.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{timeAgo(notif.createdAt)}</p>
      </div>

      {/* unread dot */}
      {!notif.isRead && (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </button>
  );
}

/* ── main component ──────────────────────────────────────────────────── */
export function NotificationDrawer() {
  const router      = useRouter();
  const { user }    = useAuthStore();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  /* fetch recent 10 notifications when drawer opens */
  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'drawer'],
    queryFn:  () => notificationsApi.getMyNotifications({ limit: 10 }),
    enabled:  !!user && open,
    staleTime: 30_000,
  });

  /* unread count — Socket.IO 'notification:new' eventi avtomatik invalidate qiladi,
     shuning uchun polling kerak emas. Faqat birinchi yuklashda so'rov ketadi. */
  const { data: countData } = useQuery({
    queryKey: ['notifications'],
    queryFn:  () => notificationsApi.getMyNotifications({ limit: 1 }),
    enabled:  !!user,
    staleTime: 5 * 60_000, // Socket event invalidate qilgunicha 5 daqiqa cache
  });
  const unreadCount: number = countData?.meta?.unreadCount ?? countData?.meta?.unread ?? 0;

  const notifications: any[] = data?.data ?? [];
  const unreadInList = notifications.filter((n: any) => !n.isRead).length;

  /* mark single read */
  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  /* mark all read */
  const markAllMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-pill text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:shadow-md transition-all duration-150"
          aria-label="Bildirishnomalar"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col" hideClose>
        {/* header */}
        <SheetHeader className="flex flex-row items-center justify-between px-4 py-3 border-b shrink-0">
          <SheetTitle className="text-base font-semibold flex items-center gap-2">
            Bildirishnomalar
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </SheetTitle>
          <div className="flex items-center gap-1">
            {unreadInList > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5 text-muted-foreground"
                disabled={markAllMutation.isPending}
                onClick={() => markAllMutation.mutate()}
              >
                {markAllMutation.isPending
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <CheckCheck className="h-3.5 w-3.5" />
                }
                Hammasini o&apos;qildi
              </Button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Yopish"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </SheetHeader>

        {/* body */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-center px-6">
              <Bell className="h-10 w-10 text-muted-foreground opacity-30" />
              <p className="text-sm font-medium text-muted-foreground">Bildirishnomalar yo'q</p>
              <p className="text-xs text-muted-foreground">Yangi bildirishnomalar shu yerda ko'rinadi</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif: any) => (
                <NotifRow
                  key={notif.id}
                  notif={notif}
                  onRead={(id) => markReadMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* footer — see all */}
        <div className="shrink-0 border-t px-4 py-3">
          <Button
            variant="outline"
            className="w-full gap-2 text-sm"
            onClick={() => { setOpen(false); router.push('/dashboard/notifications'); }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Barcha bildirishnomalarni ko'rish
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
