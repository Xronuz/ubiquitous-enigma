'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { clubsApi, ClubCategory } from '@/lib/api/clubs';
import { usersApi } from '@/lib/api/users';
import {
  Puzzle, Plus, Users, Calendar, Search, Loader2,
  UserPlus, UserMinus, Trash2, Edit3, Trophy,
  Music, BookOpen, Cpu, Languages, Palette, CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';

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

function ClubFormDialog({
  open, onClose, editData,
}: {
  open: boolean;
  onClose: () => void;
  editData?: any;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuthStore();

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
  const teachers = (usersData?.data ?? []).filter((u: any) =>
    ['teacher', 'class_teacher'].includes(u.role),
  );

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        maxMembers: form.maxMembers ? Number(form.maxMembers) : undefined,
      };
      return editData
        ? clubsApi.update(editData.id, payload)
        : clubsApi.create(payload as any);
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
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.name || !form.leaderId}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {editData ? 'Saqlash' : 'Yaratish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Club Card ────────────────────────────────────────────────────────────────

function ClubCard({
  club, isAdmin, isStudent, isJoined, onJoin, onLeave, onEdit, onDelete, joining,
}: {
  club: any;
  isAdmin: boolean;
  isStudent: boolean;
  isJoined: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onEdit: () => void;
  onDelete: () => void;
  joining: boolean;
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
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="outline" className={cn('text-[11px] px-1.5 py-0', cat.color)}>
                <CatIcon className="h-3 w-3 mr-1" />
                {cat.label}
              </Badge>
              {isJoined && (
                <Badge variant="secondary" className="text-[11px] px-1.5 py-0">
                  <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                  A'zo
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
          {/* Admin actions */}
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

          {/* Student join/leave */}
          {isStudent && (
            <Button
              size="sm"
              variant={isJoined ? 'outline' : 'default'}
              onClick={isJoined ? onLeave : onJoin}
              disabled={joining || (!isJoined && !!isFull)}
              className="ml-auto"
            >
              {joining && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              {isJoined ? (
                <><UserMinus className="h-3.5 w-3.5 mr-1" />Chiqish</>
              ) : (
                <><UserPlus className="h-3.5 w-3.5 mr-1" />A'zo bo'lish</>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClubsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch]           = useState('');
  const [activeCat, setActiveCat]     = useState<ClubCategory | 'all'>('all');
  const [createOpen, setCreateOpen]   = useState(false);
  const [editClub, setEditClub]       = useState<any>(null);
  const [joiningId, setJoiningId]     = useState<string | null>(null);

  const isAdmin   = ['school_admin', 'vice_principal'].includes(user?.role ?? '');
  const isStudent = user?.role === 'student';
  const isTeacher = ['teacher', 'class_teacher'].includes(user?.role ?? '');

  // All clubs
  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ['clubs', activeCat],
    queryFn: () => clubsApi.getAll(activeCat !== 'all' ? activeCat : undefined),
    staleTime: 5 * 60_000,
  });

  // My joined clubs (student)
  const { data: myClubs = [] } = useQuery({
    queryKey: ['clubs', 'mine'],
    queryFn: clubsApi.getMine,
    enabled: isStudent,
    staleTime: 5 * 60_000,
  });

  // My led clubs (teacher)
  const { data: ledClubs = [] } = useQuery({
    queryKey: ['clubs', 'led'],
    queryFn: clubsApi.getLed,
    enabled: isTeacher || isAdmin,
    staleTime: 5 * 60_000,
  });

  const myClubIds = new Set((myClubs as any[]).map((c: any) => c.id));

  // Join mutation
  const joinMutation = useMutation({
    mutationFn: (id: string) => clubsApi.join(id),
    onMutate: (id) => setJoiningId(id),
    onSettled: () => setJoiningId(null),
    onSuccess: () => {
      toast({ title: 'To\'garakka qo\'shildingiz ✓' });
      qc.invalidateQueries({ queryKey: ['clubs'] });
    },
    onError: (err: any) => toast({ title: 'Xatolik', description: err?.response?.data?.message, variant: 'destructive' }),
  });

  // Leave mutation
  const leaveMutation = useMutation({
    mutationFn: (id: string) => clubsApi.leave(id),
    onMutate: (id) => setJoiningId(id),
    onSettled: () => setJoiningId(null),
    onSuccess: () => {
      toast({ title: 'To\'garakdan chiqdingiz' });
      qc.invalidateQueries({ queryKey: ['clubs'] });
    },
    onError: (err: any) => toast({ title: 'Xatolik', description: err?.response?.data?.message, variant: 'destructive' }),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => clubsApi.remove(id),
    onSuccess: () => {
      toast({ title: 'To\'garak o\'chirildi' });
      qc.invalidateQueries({ queryKey: ['clubs'] });
    },
    onError: (err: any) => toast({ title: 'Xatolik', description: err?.response?.data?.message, variant: 'destructive' }),
  });

  const handleDelete = (club: any) => {
    if (!confirm(`"${club.name}" to'garagini o'chirishni tasdiqlaysizmi?`)) return;
    deleteMutation.mutate(club.id);
  };

  // Filter by search
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
            isJoined={myClubIds.has(club.id)}
            onJoin={() => joinMutation.mutate(club.id)}
            onLeave={() => leaveMutation.mutate(club.id)}
            onEdit={() => setEditClub(club)}
            onDelete={() => handleDelete(club)}
            joining={joiningId === club.id}
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

      {/* Tabs: all clubs / my clubs */}
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
          {(isTeacher || isAdmin) && (
            <TabsTrigger value="led">
              <Users className="h-4 w-4 mr-1" />
              Men rahbar bo'lganlar
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-4">
          {/* Category filter */}
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

        {isStudent && (
          <TabsContent value="mine" className="mt-4">
            {(myClubs as any[]).length === 0 ? (
              <EmptyState
                icon={UserPlus}
                title="Hali hech qaysi to'garakka a'zo emassiz"
                description='"Barcha to\'garaklar" bo\'limidan sizga yoqqan to\'garakni tanlang'
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(myClubs as any[]).map((club: any) => (
                  <ClubCard
                    key={club.id}
                    club={club}
                    isAdmin={false}
                    isStudent={true}
                    isJoined={true}
                    onJoin={() => {}}
                    onLeave={() => leaveMutation.mutate(club.id)}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    joining={joiningId === club.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        )}

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
                  <ClubCard
                    key={club.id}
                    club={club}
                    isAdmin={isAdmin}
                    isStudent={false}
                    isJoined={false}
                    onJoin={() => {}}
                    onLeave={() => {}}
                    onEdit={() => setEditClub(club)}
                    onDelete={() => handleDelete(club)}
                    joining={false}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Create dialog */}
      <ClubFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      {/* Edit dialog */}
      {editClub && (
        <ClubFormDialog
          open={!!editClub}
          onClose={() => setEditClub(null)}
          editData={editClub}
        />
      )}
    </div>
  );
}
