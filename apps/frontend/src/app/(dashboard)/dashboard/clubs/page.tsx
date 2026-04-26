'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { clubsApi, ClubCategory, ClubJoinRequest } from '@/lib/api/clubs';
import { useConfirm } from '@/store/confirm.store';
import { usersApi } from '@/lib/api/users';
import {
  Puzzle, Plus, Users, Calendar, Search, Loader2,
  UserPlus, UserMinus, Trash2, Edit3, Trophy,
  Music, BookOpen, Cpu, Languages, Palette, CheckCircle2,
  Clock, X, Check, Bell,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES: { value: ClubCategory | 'all'; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'all',      label: 'Hammasi',    icon: Puzzle,    color: 'text-gray-500' },
  { value: 'sport',    label: 'Sport',      icon: Trophy,    color: 'text-orange-500' },
  { value: 'art',      label: 'San\'at',    icon: Palette,   color: 'text-pink-500' },
  { value: 'science',  label: 'Fan',        icon: BookOpen,  color: 'text-blue-500' },
  { value: 'music',    label: 'Musiqa',     icon: Music,     color: 'text-purple-500' },
  { value: 'tech',     label: 'Texno',      icon: Cpu,       color: 'text-green-500' },
  { value: 'language', label: 'Til',        icon: Languages, color: 'text-yellow-600' },
  { value: 'other',    label: 'Boshqa',     icon: Puzzle,    color: 'text-gray-400' },
];

const CATEGORY_BG: Record<ClubCategory, string> = {
  sport:    'bg-orange-100 dark:bg-orange-900/20',
  art:      'bg-pink-100 dark:bg-pink-900/20',
  science:  'bg-blue-100 dark:bg-blue-900/20',
  music:    'bg-purple-100 dark:bg-purple-900/20',
  tech:     'bg-green-100 dark:bg-green-900/20',
  language: 'bg-yellow-100 dark:bg-yellow-900/20',
  other:    'bg-gray-100 dark:bg-gray-800/30',
};

function getCatConfig(cat: ClubCategory) {
  return CATEGORIES.find(c => c.value === cat) ?? CATEGORIES[CATEGORIES.length - 1];
}

// ─── Create/Edit Dialog ───────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '', description: '', category: 'other' as ClubCategory,
  leaderId: '', schedule: '', maxMembers: '',
};

function ClubFormDialog({ open, onClose, editData }: { open: boolean; onClose: () => void; editData?: any }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [form, setForm] = useState(() => editData
    ? { name: editData.name, description: editData.description ?? '', category: editData.category as ClubCategory, leaderId: editData.leaderId, schedule: editData.schedule ?? '', maxMembers: editData.maxMembers?.toString() ?? '' }
    : EMPTY_FORM,
  );

  const { data: usersData } = useQuery({
    queryKey: ['users', { role: 'teacher' }],
    queryFn: () => usersApi.getAll({ limit: 200 }),
    enabled: open,
    staleTime: 5 * 60_000,
  });
  const teachers = (usersData?.data ?? []).filter((u: any) => ['teacher', 'class_teacher'].includes(u.role));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, maxMembers: form.maxMembers ? Number(form.maxMembers) : undefined };
      return editData ? clubsApi.update(editData.id, payload) : clubsApi.create(payload as any);
    },
    onSuccess: () => {
      toast({ title: editData ? 'To\'garak yangilandi ✓' : 'To\'garak yaratildi ✓' });
      qc.invalidateQueries({ queryKey: ['clubs'] });
      onClose();
      setForm(EMPTY_FORM);
    },
    onError: (err: any) => {
      toast({ title: 'Xatolik', description: err?.response?.data?.message ?? 'Xatolik yuz berdi', variant: 'destructive' });
    },
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editData ? 'To\'garakni tahrirlash' : 'Yangi to\'garak'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Nomi *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Masalan: Robototexnika to\'garagi" />
          </div>
          <div className="space-y-1">
            <Label>Tavsif</Label>
            <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Qisqacha tavsif..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Kategoriya *</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Maks. a\'zo soni</Label>
              <Input type="number" min="1" value={form.maxMembers} onChange={e => set('maxMembers', e.target.value)} placeholder="Cheksiz" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Rahbar o'qituvchi *</Label>
            <Select value={form.leaderId} onValueChange={v => set('leaderId', v)}>
              <SelectTrigger><SelectValue placeholder="O'qituvchini tanlang" /></SelectTrigger>
              <SelectContent>
                {teachers.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Dars vaqti</Label>
            <Input value={form.schedule} onChange={e => set('schedule', e.target.value)} placeholder="Masalan: Chorshanba 15:00-16:00" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name || !form.leaderId}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {editData ? 'Saqlash' : 'Yaratish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Join Request Dialog ──────────────────────────────────────────────────────

function JoinRequestDialog({
  club, open, onClose, onSubmit, loading,
}: {
  club: any; open: boolean; onClose: () => void;
  onSubmit: (message?: string) => void; loading: boolean;
}) {
  const [message, setMessage] = useState('');
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>"{club?.name}" to'garagiga ariza</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Arizangiz to'garak rahbariga yuboriladi. Rahbar tasdiqlashidan keyin a'zo bo'lasiz.
          </p>
          <div className="space-y-1">
            <Label>Xabar (ixtiyoriy)</Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Nega bu to'garakka qo'shilmoqchisiz?"
              rows={3}
              maxLength={300}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button onClick={() => onSubmit(message || undefined)} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Ariza yuborish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Join Requests Panel (leader view) ───────────────────────────────────────

function JoinRequestsPanel({ clubId }: { clubId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['clubs', clubId, 'requests', 'PENDING'],
    queryFn: () => clubsApi.getJoinRequests(clubId, 'PENDING'),
    staleTime: 30_000,
  });

  const approveMut = useMutation({
    mutationFn: (requestId: string) => clubsApi.approveRequest(clubId, requestId),
    onSuccess: () => {
      toast({ title: 'Ariza tasdiqlandi ✓' });
      qc.invalidateQueries({ queryKey: ['clubs'] });
    },
    onError: (err: any) => toast({ title: 'Xatolik', description: err?.response?.data?.message, variant: 'destructive' }),
  });

  const rejectMut = useMutation({
    mutationFn: (requestId: string) => clubsApi.rejectRequest(clubId, requestId),
    onSuccess: () => {
      toast({ title: 'Ariza rad etildi' });
      qc.invalidateQueries({ queryKey: ['clubs', clubId, 'requests', 'PENDING'] });
    },
    onError: (err: any) => toast({ title: 'Xatolik', description: err?.response?.data?.message, variant: 'destructive' }),
  });

  if (isLoading) return <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const pending = requests as ClubJoinRequest[];
  if (pending.length === 0) return (
    <p className="text-sm text-muted-foreground text-center py-4">Kutilayotgan arizalar yo'q</p>
  );

  return (
    <div className="space-y-2">
      {pending.map((req) => (
        <div key={req.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={req.student?.avatarUrl} />
            <AvatarFallback>{req.student?.firstName?.[0]}{req.student?.lastName?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {req.student?.firstName} {req.student?.lastName}
            </p>
            {req.message && <p className="text-xs text-muted-foreground truncate">{req.message}</p>}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              size="icon" variant="ghost"
              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
              onClick={() => approveMut.mutate(req.id)}
              disabled={approveMut.isPending || rejectMut.isPending}
              title="Tasdiqlash"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon" variant="ghost"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => rejectMut.mutate(req.id)}
              disabled={approveMut.isPending || rejectMut.isPending}
              title="Rad etish"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Club Card ────────────────────────────────────────────────────────────────

type JoinStatus = 'none' | 'pending' | 'member';

function ClubCard({
  club, isAdmin, isStudent, joinStatus,
  onRequestJoin, onLeave, onEdit, onDelete, actioning,
}: {
  club: any; isAdmin: boolean; isStudent: boolean; joinStatus: JoinStatus;
  onRequestJoin: () => void; onLeave: () => void;
  onEdit: () => void; onDelete: () => void; actioning: boolean;
}) {
  const cat = getCatConfig(club.category as ClubCategory);
  const CatIcon = cat.icon;
  const memberCount = club._count?.members ?? 0;
  const isFull = club.maxMembers && memberCount >= club.maxMembers;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight truncate">{club.name}</h3>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge variant="outline" className={cn('text-[11px] px-1.5 py-0', cat.color)}>
                <CatIcon className="h-3 w-3 mr-1" />
                {cat.label}
              </Badge>
              {joinStatus === 'member' && (
                <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
                  <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />A'zo
                </Badge>
              )}
              {joinStatus === 'pending' && (
                <Badge variant="outline" className="text-[11px] px-1.5 py-0 text-amber-600 border-amber-400">
                  <Clock className="h-3 w-3 mr-1" />Kutilmoqda
                </Badge>
              )}
            </div>
          </div>
          <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', CATEGORY_BG[club.category as ClubCategory] ?? 'bg-muted')}>
            <CatIcon className={cn('h-5 w-5', cat.color)} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {club.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{club.description}</p>
        )}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {club.leader && (
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span>Rahbar: {club.leader.firstName} {club.leader.lastName}</span>
            </div>
          )}
          {club.schedule && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>{club.schedule}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>
              {memberCount} a'zo{club.maxMembers ? ` / ${club.maxMembers}` : ''}
              {isFull && <span className="text-destructive ml-1">(to'lgan)</span>}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 gap-2">
          {isAdmin && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}

          {isStudent && (
            <div className="ml-auto">
              {joinStatus === 'member' ? (
                <Button size="sm" variant="outline" onClick={onLeave} disabled={actioning}>
                  {actioning ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <UserMinus className="h-3.5 w-3.5 mr-1" />}
                  Chiqish
                </Button>
              ) : joinStatus === 'pending' ? (
                <Button size="sm" variant="ghost" disabled className="text-amber-600">
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  Ko'rib chiqilmoqda
                </Button>
              ) : (
                <Button size="sm" onClick={onRequestJoin} disabled={actioning || !!isFull}>
                  {actioning ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <UserPlus className="h-3.5 w-3.5 mr-1" />}
                  Ariza yuborish
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Led Club Card (with requests panel) ─────────────────────────────────────

function LedClubCard({
  club, isAdmin, onEdit, onDelete,
}: { club: any; isAdmin: boolean; onEdit: () => void; onDelete: () => void }) {
  const [showRequests, setShowRequests] = useState(false);
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['clubs', club.id, 'requests', 'PENDING'],
    queryFn: () => clubsApi.getJoinRequests(club.id, 'PENDING'),
    staleTime: 30_000,
  });
  const pendingCount = (pendingRequests as any[]).length;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight truncate">{club.name}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="outline" className="text-[11px] px-1.5 py-0">
                {club._count?.members ?? 0} a'zo
              </Badge>
              {pendingCount > 0 && (
                <Badge className="text-[11px] px-1.5 py-0 bg-amber-500 hover:bg-amber-600">
                  <Bell className="h-3 w-3 mr-1" />{pendingCount} ariza
                </Badge>
              )}
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {club.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{club.description}</p>
        )}
        {club.schedule && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{club.schedule}</span>
          </div>
        )}

        <Button
          size="sm" variant={pendingCount > 0 ? 'default' : 'outline'}
          className="w-full"
          onClick={() => setShowRequests(v => !v)}
        >
          <Bell className="h-3.5 w-3.5 mr-1" />
          {showRequests ? 'Arizalarni yopish' : `Arizalar${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
        </Button>

        {showRequests && (
          <div className="border-t pt-3">
            <JoinRequestsPanel clubId={club.id} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClubsPage() {
  const ask = useConfirm();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch]         = useState('');
  const [activeCat, setActiveCat]   = useState<ClubCategory | 'all'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editClub, setEditClub]     = useState<any>(null);
  const [joinTarget, setJoinTarget] = useState<any>(null); // club pending join dialog
  const [actioningId, setActioningId] = useState<string | null>(null);

  const isAdmin   = ['school_admin', 'vice_principal'].includes(user?.role ?? '');
  const isStudent = user?.role === 'student';
  const isTeacher = ['teacher', 'class_teacher'].includes(user?.role ?? '');

  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ['clubs', activeCat],
    queryFn: () => clubsApi.getAll(activeCat !== 'all' ? activeCat : undefined),
    staleTime: 5 * 60_000,
  });

  const { data: myClubs = [] } = useQuery({
    queryKey: ['clubs', 'mine'],
    queryFn: clubsApi.getMine,
    enabled: isStudent,
    staleTime: 5 * 60_000,
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ['clubs', 'my-requests'],
    queryFn: clubsApi.getMyRequests,
    enabled: isStudent,
    staleTime: 5 * 60_000,
  });

  const { data: ledClubs = [] } = useQuery({
    queryKey: ['clubs', 'led'],
    queryFn: clubsApi.getLed,
    enabled: isTeacher || isAdmin,
    staleTime: 5 * 60_000,
  });

  const myClubIds = new Set((myClubs as any[]).map((c: any) => c.id));
  const myPendingClubIds = new Set(
    (myRequests as any[]).filter((r: any) => r.status === 'PENDING').map((r: any) => r.clubId),
  );

  function getJoinStatus(clubId: string): 'member' | 'pending' | 'none' {
    if (myClubIds.has(clubId)) return 'member';
    if (myPendingClubIds.has(clubId)) return 'pending';
    return 'none';
  }

  // Request join mutation
  const joinMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message?: string }) => clubsApi.requestJoin(id, message),
    onMutate: ({ id }) => setActioningId(id),
    onSettled: () => { setActioningId(null); setJoinTarget(null); },
    onSuccess: () => {
      toast({ title: 'Ariza yuborildi ✓', description: 'To\'garak rahbari tasdiqlashini kuting' });
      qc.invalidateQueries({ queryKey: ['clubs'] });
    },
    onError: (err: any) => toast({ title: 'Xatolik', description: err?.response?.data?.message, variant: 'destructive' }),
  });

  const leaveMutation = useMutation({
    mutationFn: (id: string) => clubsApi.leave(id),
    onMutate: (id) => setActioningId(id),
    onSettled: () => setActioningId(null),
    onSuccess: () => {
      toast({ title: 'To\'garakdan chiqdingiz' });
      qc.invalidateQueries({ queryKey: ['clubs'] });
    },
    onError: (err: any) => toast({ title: 'Xatolik', description: err?.response?.data?.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clubsApi.remove(id),
    onSuccess: () => {
      toast({ title: 'To\'garak o\'chirildi' });
      qc.invalidateQueries({ queryKey: ['clubs'] });
    },
    onError: (err: any) => toast({ title: 'Xatolik', description: err?.response?.data?.message, variant: 'destructive' }),
  });

  const handleDelete = async (club: any) => {
    if (!await ask({ title: `"${club.name}" to'garagini o'chirishni tasdiqlaysizmi?`, variant: 'destructive', confirmText: "O'chirish" })) return;
    deleteMutation.mutate(club.id);
  };

  const filtered = (clubs as any[]).filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase()),
  );

  const renderClubGrid = (list: any[]) => {
    if (isLoading) return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
    if (list.length === 0) return (
      <EmptyState
        icon={Puzzle}
        title="To'garaklar topilmadi"
        description={search ? `"${search}" bo'yicha natija yo'q` : "Hali hech qanday to'garak yaratilmagan"}
        action={isAdmin ? { label: "Birinchi to'garakni yarating", onClick: () => setCreateOpen(true) } : undefined}
      />
    );
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((club: any) => (
          <ClubCard
            key={club.id}
            club={club}
            isAdmin={isAdmin}
            isStudent={isStudent}
            joinStatus={getJoinStatus(club.id)}
            onRequestJoin={() => setJoinTarget(club)}
            onLeave={() => leaveMutation.mutate(club.id)}
            onEdit={() => setEditClub(club)}
            onDelete={() => handleDelete(club)}
            actioning={actioningId === club.id}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Puzzle className="h-7 w-7 text-primary" />
            To'garaklar
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Maktab to'garaklari va qo'shimcha mashg'ulotlar
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Yangi to'garak
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="To'garak qidirish..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            <Puzzle className="h-4 w-4 mr-1" />
            Barcha to'garaklar
          </TabsTrigger>
          {isStudent && (
            <TabsTrigger value="mine">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Mening to'garaklarim
              {myClubIds.size > 0 && (
                <span className="ml-1.5 rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 font-bold">
                  {myClubIds.size}
                </span>
              )}
            </TabsTrigger>
          )}
          {isStudent && myPendingClubIds.size > 0 && (
            <TabsTrigger value="requests">
              <Clock className="h-4 w-4 mr-1" />
              Arizalarim
              <span className="ml-1.5 rounded-full bg-amber-500 text-white text-[10px] px-1.5 py-0.5 font-bold">
                {myPendingClubIds.size}
              </span>
            </TabsTrigger>
          )}
          {(isTeacher || isAdmin) && (
            <TabsTrigger value="led">
              <Users className="h-4 w-4 mr-1" />
              Men rahbar bo'lganlar
            </TabsTrigger>
          )}
        </TabsList>

        {/* All clubs tab */}
        <TabsContent value="all" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.value}
                  onClick={() => setActiveCat(cat.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                    activeCat === cat.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:border-primary/50 hover:bg-accent',
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', activeCat !== cat.value && cat.color)} />
                  {cat.label}
                </button>
              );
            })}
          </div>
          {renderClubGrid(filtered)}
        </TabsContent>

        {/* My clubs tab (student) */}
        {isStudent && (
          <TabsContent value="mine" className="mt-4">
            {(myClubs as any[]).length === 0 ? (
              <EmptyState
                icon={UserPlus}
                title="Hali hech qaysi to'garakka a'zo emassiz"
                description={"\"Barcha to'garaklar\" bo'limidan to'garakka ariza yuboring"}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(myClubs as any[]).map((club: any) => (
                  <ClubCard
                    key={club.id}
                    club={club}
                    isAdmin={false}
                    isStudent={true}
                    joinStatus="member"
                    onRequestJoin={() => {}}
                    onLeave={() => leaveMutation.mutate(club.id)}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    actioning={actioningId === club.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* My pending requests tab (student) */}
        {isStudent && (
          <TabsContent value="requests" className="mt-4">
            <div className="space-y-3">
              {(myRequests as any[]).filter((r: any) => r.status === 'PENDING').length === 0 ? (
                <EmptyState icon={Clock} title="Kutilayotgan arizalar yo'q" description="" />
              ) : (
                (myRequests as any[]).filter((r: any) => r.status === 'PENDING').map((req: any) => (
                  <div key={req.id} className="flex items-center gap-3 p-4 rounded-lg border bg-card">
                    <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{req.club?.name}</p>
                      {req.message && <p className="text-sm text-muted-foreground truncate">{req.message}</p>}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Yuborildi: {new Date(req.createdAt).toLocaleDateString('uz-UZ')}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-amber-600 border-amber-400 shrink-0">
                      Kutilmoqda
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        )}

        {/* Led clubs tab (teacher/admin) */}
        {(isTeacher || isAdmin) && (
          <TabsContent value="led" className="mt-4">
            {(ledClubs as any[]).length === 0 ? (
              <EmptyState
                icon={Puzzle}
                title="Siz rahbar bo'lgan to'garaklar yo'q"
                description="Maktab admini sizni to'garak rahbari sifatida tayinlaganda bu yerda ko'rinadi"
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(ledClubs as any[]).map((club: any) => (
                  <LedClubCard
                    key={club.id}
                    club={club}
                    isAdmin={isAdmin}
                    onEdit={() => setEditClub(club)}
                    onDelete={() => handleDelete(club)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Create/Edit dialogs */}
      <ClubFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      {editClub && (
        <ClubFormDialog open={!!editClub} onClose={() => setEditClub(null)} editData={editClub} />
      )}

      {/* Join request dialog */}
      {joinTarget && (
        <JoinRequestDialog
          club={joinTarget}
          open={!!joinTarget}
          onClose={() => setJoinTarget(null)}
          onSubmit={(message) => joinMutation.mutate({ id: joinTarget.id, message })}
          loading={joinMutation.isPending}
        />
      )}
    </div>
  );
}
