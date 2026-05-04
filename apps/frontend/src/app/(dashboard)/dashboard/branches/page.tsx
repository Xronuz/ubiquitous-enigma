'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useBranchStore } from '@/store/branch.store';
import { useSwitchBranch } from '@/hooks/use-switch-branch';
import { branchesApi, Branch, CreateBranchDto } from '@/lib/api/branches';
import {
  Building2, Plus, Pencil, Trash2, Loader2,
  MapPin, Phone, Mail, Users, School,
  CheckCircle2, XCircle, Layers,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

// Faqat admin/director kirishi mumkin bo'lgan sahifa
const ALLOWED_ROLES = ['director'];

// ─── Form state ───────────────────────────────────────────────────────────────
interface BranchFormData {
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  isActive: boolean;
}

const EMPTY_FORM: BranchFormData = {
  name: '',
  code: '',
  address: '',
  phone: '',
  email: '',
  isActive: true,
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BranchesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { activeBranchId } = useBranchStore();
  const { switchBranch } = useSwitchBranch();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [form, setForm] = useState<BranchFormData>(EMPTY_FORM);

  // Ruxsatsiz foydalanuvchilar uchun
  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <EmptyState
          icon={Building2}
          title="Kirish taqiqlangan"
          description="Bu sahifaga faqat maktab admin va director kirishi mumkin"
        />
      </div>
    );
  }

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches', user.schoolId],
    queryFn: () => branchesApi.getAll(),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (dto: CreateBranchDto) => branchesApi.create(dto),
    onSuccess: (branch) => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast({ title: `"${branch.name}" filiali yaratildi` });
      closeDialog();
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Xatolik',
        description: err?.response?.data?.message ?? 'Filial yaratishda xatolik',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateBranchDto> & { isActive?: boolean } }) =>
      branchesApi.update(id, dto),
    onSuccess: (branch) => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast({ title: `"${branch.name}" yangilandi` });
      closeDialog();
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Xatolik',
        description: err?.response?.data?.message ?? 'Yangilashda xatolik',
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => branchesApi.remove(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast({ title: res.message });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Xatolik',
        description: err?.response?.data?.message ?? "O'chirishda xatolik",
      });
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingBranch(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setForm({
      name: branch.name,
      code: branch.code ?? '',
      address: branch.address ?? '',
      phone: branch.phone ?? '',
      email: branch.email ?? '',
      isActive: branch.isActive,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingBranch(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dto = {
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      address: form.address.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
    };

    if (editingBranch) {
      updateMutation.mutate({ id: editingBranch.id, dto: { ...dto, isActive: form.isActive } });
    } else {
      createMutation.mutate(dto);
    }
  };

  const handleSwitchToBranch = (branch: Branch) => {
    switchBranch(branch.id, {
      id: branch.id,
      name: branch.name,
      code: branch.code,
      address: branch.address,
      isActive: branch.isActive,
    });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Filiallar</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Maktab filiallarini boshqarish — yaratish, tahrirlash, ko'rinishni almashtirish
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Yangi filial
        </Button>
      </div>

      {/* School-wide switch */}
      <Card
        className={cn(
          'cursor-pointer border-2 transition-all hover:shadow-md',
          !activeBranchId ? 'border-primary bg-primary/5' : 'border-transparent',
        )}
        onClick={() => switchBranch(null, null)}
      >
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Layers className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Barcha filiallar</p>
            <p className="text-xs text-muted-foreground">School-wide ko'rinish — barcha filiallarning ma'lumotlari</p>
          </div>
          {!activeBranchId && (
            <Badge variant="default" className="shrink-0">Aktiv</Badge>
          )}
        </CardContent>
      </Card>

      {/* Branches grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : branches.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Filiallar yo'q"
          description="Hali birorta filial yaratilmagan. Birinchi filialni qo'shing."
          action={{ label: 'Filial qo\'shish', onClick: openCreate }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              isActive={activeBranchId === branch.id}
              onSwitch={handleSwitchToBranch}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBranch ? `"${editingBranch.name}" ni tahrirlash` : 'Yangi filial yaratish'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Filial nomi *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Chilonzor filiali"
                required
                minLength={2}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">
                Qisqa kod
                <span className="text-muted-foreground text-xs ml-1">(ixtiyoriy, masalan: CHI)</span>
              </Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="CHI"
                maxLength={10}
                pattern="[A-Z0-9]*"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Manzil</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Toshkent sh., Chilonzor tumani..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+998901234567"
                  type="tel"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="filial@school.uz"
                  type="email"
                />
              </div>
            </div>

            {/* isActive toggle — faqat tahrirlashda */}
            {editingBranch && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Filial holati</p>
                  <p className="text-xs text-muted-foreground">
                    O'chirilgan filiallar foydalanuvchilarga ko'rinmaydi
                  </p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                />
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={isSubmitting || !form.name.trim()}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingBranch ? 'Saqlash' : 'Yaratish'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Filialni o'chirish</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong>"{deleteTarget?.name}"</strong> filialni o'chirmoqchimisiz?
            <br />
            Agar filialda xodimlar yoki sinflar bo'lsa, deaktivatsiya qilinadi.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              disabled={removeMutation.isPending}
              onClick={() => deleteTarget && removeMutation.mutate(deleteTarget.id)}
            >
              {removeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              O'chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Branch Card ──────────────────────────────────────────────────────────────
interface BranchCardProps {
  branch: Branch & { _count?: { users: number; classes: number } };
  isActive: boolean;
  onSwitch: (b: Branch) => void;
  onEdit: (b: Branch) => void;
  onDelete: (b: Branch) => void;
}

function BranchCard({ branch, isActive, onSwitch, onEdit, onDelete }: BranchCardProps) {
  return (
    <Card
      className={cn(
        'border-2 transition-all hover:shadow-md',
        isActive ? 'border-primary bg-primary/5' : 'border-transparent',
        !branch.isActive && 'opacity-60',
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                branch.isActive ? 'bg-primary/10' : 'bg-muted',
              )}
            >
              <Building2 className={cn('h-4 w-4', branch.isActive ? 'text-primary' : 'text-muted-foreground')} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{branch.name}</CardTitle>
              {branch.code && (
                <Badge variant="outline" className="text-xs mt-0.5">{branch.code}</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {branch.isActive ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Meta info */}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {branch.address && (
            <div className="flex items-start gap-1.5">
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{branch.address}</span>
            </div>
          )}
          {branch.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>{branch.phone}</span>
            </div>
          )}
          {branch.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{branch.email}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        {(branch as any)._count && (
          <div className="flex gap-3 text-xs text-muted-foreground border-t pt-2">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {(branch as any)._count.users} xodim
            </span>
            <span className="flex items-center gap-1">
              <School className="h-3.5 w-3.5" />
              {(branch as any)._count.classes} sinf
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant={isActive ? 'default' : 'outline'}
            className="flex-1 h-8 text-xs"
            onClick={() => onSwitch(branch)}
            disabled={!branch.isActive}
          >
            {isActive ? 'Aktiv' : "Ko'rish"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => onEdit(branch)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            onClick={() => onDelete(branch)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
