'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Send, Users, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { notificationsApi } from '@/lib/api/notifications';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';

const TARGET_GROUPS = [
  { value: 'all_staff',      label: 'Barcha xodimlar' },
  { value: 'all_teachers',   label: "Barcha o'qituvchilar" },
  { value: 'class_teachers', label: 'Sinf rahbarlari' },
  { value: 'all_parents',    label: 'Barcha ota-onalar' },
  { value: 'all_students',   label: "Barcha o'quvchilar" },
  { value: 'vice_principal', label: "O'rinbosarlar" },
  { value: 'accountant',     label: 'Moliya bo\'limi' },
  { value: 'librarian',      label: 'Kutubxonachilar' },
];

export default function AnnouncementsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState('all_staff');
  const [sentHistory, setSentHistory] = useState<{ title: string; target: string; count: number; time: string }[]>([]);

  // My recent notifications (to show what was sent)
  const { data: myNotifs } = useQuery({
    queryKey: ['notifications', 'my'],
    queryFn: () => notificationsApi.getMyNotifications({ limit: 10 }),
  });

  const broadcastMutation = useMutation({
    mutationFn: () => notificationsApi.broadcast({ targetGroup: target, title: title.trim(), body: body.trim() }),
    onSuccess: (data: any) => {
      toast({ title: "E'lon yuborildi ✓", description: `${data.sent ?? 0} ta foydalanuvchiga yetkazildi` });
      setSentHistory(prev => [{
        title: title.trim(),
        target: TARGET_GROUPS.find(g => g.value === target)?.label ?? target,
        count: data.sent ?? 0,
        time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      }, ...prev.slice(0, 9)]);
      setTitle('');
      setBody('');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
      toast({ title: 'Xato', description: "E'lon yuborishda xato yuz berdi", variant: 'destructive' });
    },
  });

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !broadcastMutation.isPending;
  const targetLabel = TARGET_GROUPS.find(g => g.value === target)?.label ?? target;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" /> E&apos;lonlar
        </h1>
        <p className="text-muted-foreground">Maktab xodimlari va ota-onalarga toplu xabar yuborish</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Compose */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" /> Yangi e&apos;lon
            </CardTitle>
            <CardDescription>Tanlangan guruhga darhol bildirishnoma sifatida yetkaziladi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Maqsadli guruh</label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_GROUPS.map(g => (
                    <SelectItem key={g.value} value={g.value}>
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {g.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Sarlavha *</label>
              <Input
                placeholder="E'lon sarlavhasi..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground text-right">{title.length}/100</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Matn *</label>
              <Textarea
                placeholder="E'lon matni..."
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={5}
                maxLength={500}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{body.length}/500</p>
            </div>

            {/* Preview */}
            {(title || body) && (
              <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Ko&apos;rinishi:</p>
                <p className="text-sm font-semibold">{title || '...'}</p>
                <p className="text-sm text-muted-foreground">{body || '...'}</p>
                <Badge variant="secondary" className="text-xs">{targetLabel}</Badge>
              </div>
            )}

            <Button
              className="w-full gap-2"
              onClick={() => broadcastMutation.mutate()}
              disabled={!canSend}
            >
              {broadcastMutation.isPending ? (
                <>Yuborilmoqda...</>
              ) : (
                <><Send className="h-4 w-4" /> E&apos;lon yuborish → {targetLabel}</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Sent history */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> Yuborilgan e&apos;lonlar (bu sessiya)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sentHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm gap-2">
                <Bell className="h-10 w-10 opacity-20" />
                <p>Hali e&apos;lon yuborilmagan</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sentHistory.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.target} · {item.count} ta foydalanuvchi · {item.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
