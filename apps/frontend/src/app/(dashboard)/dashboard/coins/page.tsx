'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { coinsApi, ShopItem, CoinTransaction, StudentBalance, CreateShopItemPayload } from '@/lib/api/coins';
import { usersApi } from '@/lib/api/users';
import { useConfirm } from '@/store/confirm.store';
import {
  Coins, TrendingUp, TrendingDown, ShoppingBag, History,
  Plus, Loader2, Award, Search, Edit3, Trash2, Package,
  ToggleLeft, ToggleRight, Trophy, Users, ShoppingCart,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatDate } from '@/lib/utils';

// ─── helpers ──────────────────────────────────────────────────────────────────

function reasonLabel(reason: string) {
  const map: Record<string, string> = {
    grade_excellent:   "A'lo baho",
    attendance_weekly: 'Davomat bonusi',
    discipline_praise: 'Maqtov',
    manual_award:      'Admin mukofoti',
    manual_deduct:     'Admin jarimasi',
    discipline_warning:'Intizom jarima',
    shop_purchase:     "Do'kondan xarid",
  };
  return map[reason] ?? reason;
}

// ─── Student: balance card ────────────────────────────────────────────────────

function BalanceCard({ coins }: { coins: number }) {
  return (
    <Card className="bg-gradient-to-br from-amber-400 to-orange-500 text-white border-0 shadow-lg">
      <CardContent className="pt-6 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-amber-100 text-sm font-medium mb-1">Coin balansi</p>
            <p className="text-4xl font-bold tracking-tight">{coins.toLocaleString()}</p>
            <p className="text-amber-100 text-xs mt-1">EduCoin</p>
          </div>
          <Coins className="h-14 w-14 text-amber-200/60" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Transaction row ──────────────────────────────────────────────────────────

function TxRow({ tx }: { tx: CoinTransaction }) {
  const earn = tx.amount > 0;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0">
      <span className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
        earn ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30',
      )}>
        {earn
          ? <TrendingUp className="h-4 w-4 text-green-600" />
          : <TrendingDown className="h-4 w-4 text-red-500" />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{reasonLabel(tx.reason)}</p>
        <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
      </div>
      <div className="text-right">
        <p className={cn('text-sm font-semibold', earn ? 'text-green-600' : 'text-red-500')}>
          {earn ? '+' : ''}{tx.amount}
        </p>
        <p className="text-xs text-muted-foreground">{tx.balance} coin</p>
      </div>
    </div>
  );
}

// ─── Shop item card (student) ─────────────────────────────────────────────────

function ShopItemCard({
  item, balance, onBuy, buying,
}: {
  item: ShopItem;
  balance: number;
  onBuy: () => void;
  buying: boolean;
}) {
  const canAfford = balance >= item.cost;
  const outOfStock = item.stock !== null && item.stock !== undefined && item.stock <= 0;
  return (
    <Card className={cn('flex flex-col', (!canAfford || outOfStock) && 'opacity-60')}>
      <CardContent className="pt-5 flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{item.emoji ?? '🎁'}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{item.name}</p>
            {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
          </div>
        </div>
        <div className="flex items-center justify-between mt-auto pt-2">
          <Badge variant="secondary" className="font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20">
            <Coins className="h-3 w-3 mr-1" />{item.cost.toLocaleString()}
          </Badge>
          {item.stock !== null && item.stock !== undefined && (
            <span className="text-xs text-muted-foreground">{item.stock} ta qoldi</span>
          )}
        </div>
      </CardContent>
      <div className="px-4 pb-4">
        <Button
          className="w-full"
          size="sm"
          disabled={!canAfford || outOfStock || buying}
          onClick={onBuy}
        >
          {buying
            ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            : <ShoppingCart className="h-3.5 w-3.5 mr-1" />}
          {outOfStock ? 'Tugagan' : !canAfford ? 'Yetarli coin yo\'q' : 'Sotib olish'}
        </Button>
      </div>
    </Card>
  );
}

// ─── Admin: award dialog ──────────────────────────────────────────────────────

function AwardDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [studentId, setStudentId] = useState('');
  const [amount, setAmount] = useState('');

  const { data: usersResp } = useQuery({
    queryKey: ['users-list'],
    queryFn:  () => usersApi.getAll({ role: 'student', limit: 500 }),
    enabled:  open,
  });
  const usersList: any[] = (usersResp as any)?.data ?? [];

  const filtered = usersList.filter((u: any) =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()),
  );

  const mutation = useMutation({
    mutationFn: () => coinsApi.award(studentId, Number(amount)),
    onSuccess: () => {
      toast({ title: `${Number(amount) > 0 ? '+' : ''}${amount} coin berildi` });
      qc.invalidateQueries({ queryKey: ['coin-balances'] });
      onClose();
      setStudentId(''); setAmount(''); setSearch('');
    },
    onError: (e: any) => toast({ title: 'Xatolik', description: e?.response?.data?.message, variant: 'destructive' }),
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Coin berish / ayirish</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>O'quvchi</Label>
            <Input placeholder="Qidirish..." value={search} onChange={e => setSearch(e.target.value)} className="mb-1.5" />
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger><SelectValue placeholder="O'quvchini tanlang" /></SelectTrigger>
              <SelectContent>
                {filtered.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Miqdor (manfiy = ayirish)</Label>
            <Input type="number" placeholder="+100 yoki -50" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose}>Bekor</Button>
          <Button
            disabled={!studentId || !amount || isNaN(Number(amount)) || Number(amount) === 0 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Tasdiqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Admin: shop item form dialog ─────────────────────────────────────────────

const EMPTY_ITEM: CreateShopItemPayload = { name: '', description: '', cost: 0, emoji: '', stock: null };

function ShopItemFormDialog({
  open, onClose, editData,
}: {
  open: boolean;
  onClose: () => void;
  editData?: ShopItem | null;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<CreateShopItemPayload>(EMPTY_ITEM);

  // Reset form when dialog opens
  const handleOpen = (v: boolean) => {
    if (v) setForm(editData ? {
      name: editData.name,
      description: editData.description ?? '',
      cost: editData.cost,
      emoji: editData.emoji ?? '',
      stock: editData.stock ?? null,
    } : EMPTY_ITEM);
    if (!v) onClose();
  };

  const createMutation = useMutation({
    mutationFn: () => coinsApi.createShopItem({
      ...form,
      cost:  Number(form.cost),
      stock: form.stock !== null && form.stock !== undefined && String(form.stock) !== '' ? Number(form.stock) : null,
      emoji: form.emoji || undefined,
      description: form.description || undefined,
    }),
    onSuccess: () => {
      toast({ title: 'Mahsulot qo\'shildi' });
      qc.invalidateQueries({ queryKey: ['coin-shop-admin'] });
      qc.invalidateQueries({ queryKey: ['coin-shop'] });
      onClose();
    },
    onError: (e: any) => toast({ title: 'Xatolik', description: e?.response?.data?.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: () => coinsApi.updateShopItem(editData!.id, {
      ...form,
      cost:  Number(form.cost),
      stock: form.stock !== null && form.stock !== undefined && String(form.stock) !== '' ? Number(form.stock) : null,
      emoji: form.emoji || undefined,
      description: form.description || undefined,
    }),
    onSuccess: () => {
      toast({ title: 'Mahsulot yangilandi' });
      qc.invalidateQueries({ queryKey: ['coin-shop-admin'] });
      qc.invalidateQueries({ queryKey: ['coin-shop'] });
      onClose();
    },
    onError: (e: any) => toast({ title: 'Xatolik', description: e?.response?.data?.message, variant: 'destructive' }),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editData ? 'Mahsulotni tahrirlash' : "Yangi mahsulot qo'shish"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <div className="space-y-1.5">
              <Label>Nomi *</Label>
              <Input placeholder="Smartfon" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Emoji</Label>
              <Input placeholder="📱" value={form.emoji ?? ''} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Tavsif</Label>
            <Input placeholder="Qisqacha tavsif..." value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Narxi (coin) *</Label>
              <Input type="number" min={1} placeholder="10000" value={form.cost || ''} onChange={e => setForm(f => ({ ...f, cost: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Soni (bo'sh = cheksiz)</Label>
              <Input
                type="number" min={0} placeholder="cheksiz"
                value={form.stock ?? ''}
                onChange={e => setForm(f => ({ ...f, stock: e.target.value === '' ? null : Number(e.target.value) }))}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose}>Bekor</Button>
          <Button
            disabled={!form.name || !form.cost || isPending}
            onClick={() => editData ? updateMutation.mutate() : createMutation.mutate()}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {editData ? 'Saqlash' : "Qo'shish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Admin: shop management tab ───────────────────────────────────────────────

function AdminShopTab() {
  const ask = useConfirm();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<ShopItem | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['coin-shop-admin'],
    queryFn:  () => coinsApi.getAllShopItems(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => coinsApi.deleteShopItem(id),
    onSuccess: () => {
      toast({ title: "Mahsulot o'chirildi" });
      qc.invalidateQueries({ queryKey: ['coin-shop-admin'] });
      qc.invalidateQueries({ queryKey: ['coin-shop'] });
    },
    onError: (e: any) => toast({ title: 'Xatolik', description: e?.response?.data?.message, variant: 'destructive' }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      coinsApi.updateShopItem(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coin-shop-admin'] }),
    onError: (e: any) => toast({ title: 'Xatolik', description: e?.response?.data?.message, variant: 'destructive' }),
  });

  const openEdit = (item: ShopItem) => { setEditItem(item); setFormOpen(true); };
  const openCreate = () => { setEditItem(null); setFormOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{(items as ShopItem[]).length} ta mahsulot</p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />Mahsulot qo'shish
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : (items as ShopItem[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
          <Package className="h-10 w-10 opacity-30" />
          <p className="text-sm">Hali mahsulot qo'shilmagan</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(items as ShopItem[]).map(item => (
            <div key={item.id} className={cn(
              'flex items-center gap-3 rounded-xl border px-4 py-3',
              !item.isActive && 'opacity-50 bg-muted/30',
            )}>
              <span className="text-xl w-8 text-center">{item.emoji ?? '🎁'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-amber-600 font-semibold">
                    <Coins className="inline h-3 w-3 mr-0.5" />{item.cost.toLocaleString()} coin
                  </span>
                  {item.stock !== null && item.stock !== undefined && (
                    <span className="text-xs text-muted-foreground">· {item.stock} ta qoldi</span>
                  )}
                  {!item.isActive && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Nofaol</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon" variant="ghost" className="h-8 w-8"
                  title={item.isActive ? "O'chirish" : 'Yoqish'}
                  onClick={() => toggleMutation.mutate({ id: item.id, isActive: !item.isActive })}
                  disabled={toggleMutation.isPending}
                >
                  {item.isActive
                    ? <ToggleRight className="h-4 w-4 text-green-600" />
                    : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(item)}>
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon" variant="ghost" className="h-8 w-8 hover:text-destructive"
                  disabled={deleteMutation.isPending}
                  onClick={async () => {
                    if (await ask({ title: `"${item.name}" mahsulotini o'chirasizmi?`, variant: 'destructive', confirmText: "O'chirish" }))
                      deleteMutation.mutate(item.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ShopItemFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(null); }}
        editData={editItem}
      />
    </div>
  );
}

// ─── Admin: orders tab ────────────────────────────────────────────────────────

function AdminOrdersTab() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['coin-orders'],
    queryFn:  () => coinsApi.getShopOrders(),
  });

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>;

  if ((orders as CoinTransaction[]).length === 0)
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
        <ShoppingCart className="h-10 w-10 opacity-30" />
        <p className="text-sm">Hali xarid qilinmagan</p>
      </div>
    );

  return (
    <div className="space-y-2">
      {(orders as CoinTransaction[]).map(o => (
        <div key={o.id} className="flex items-center gap-3 rounded-xl border px-4 py-3">
          <ShoppingBag className="h-5 w-5 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {o.user ? `${o.user.firstName} ${o.user.lastName}` : 'Noma\'lum'}
            </p>
            <p className="text-xs text-muted-foreground">
              {(o.metadata as any)?.itemName ?? 'Mahsulot'} · {formatDate(o.createdAt)}
            </p>
          </div>
          <span className="text-sm font-semibold text-red-500">{o.amount} coin</span>
        </div>
      ))}
    </div>
  );
}

// ─── Admin: coin balances tab ─────────────────────────────────────────────────

function AdminBalancesTab() {
  const [search, setSearch] = useState('');
  const { data = [], isLoading } = useQuery({
    queryKey: ['coin-balances'],
    queryFn:  () => coinsApi.getStudentBalances(),
  });

  const filtered = (data as StudentBalance[]).filter(s =>
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <Input
        placeholder="O'quvchi qidirish..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="h-9"
      />
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">O'quvchi topilmadi</p>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl border px-4 py-2.5">
              <span className="text-xs font-mono w-5 text-muted-foreground">{idx + 1}</span>
              <p className="flex-1 text-sm font-medium">{s.firstName} {s.lastName}</p>
              <Badge variant="secondary" className="font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20">
                <Coins className="h-3 w-3 mr-1" />{s.coins.toLocaleString()}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CoinsPage() {
  const ask = useConfirm();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();

  const isStudent = user?.role === 'student';
  const isAdmin   = ['school_admin', 'vice_principal', 'director'].includes(user?.role ?? '');

  // Student data
  const { data: balanceData, isLoading: balLoading } = useQuery({
    queryKey: ['coin-balance'],
    queryFn:  () => coinsApi.getBalance(),
    enabled:  isStudent,
  });
  const balance = balanceData?.coins ?? 0;

  const { data: history = [], isLoading: histLoading } = useQuery({
    queryKey: ['coin-history'],
    queryFn:  () => coinsApi.getHistory(50),
    enabled:  isStudent,
  });

  const { data: shopItems = [], isLoading: shopLoading } = useQuery({
    queryKey: ['coin-shop'],
    queryFn:  () => coinsApi.getShopItems(),
    enabled:  isStudent,
  });

  const [buyingId, setBuyingId] = useState<string | null>(null);
  const buyMutation = useMutation({
    mutationFn: (id: string) => coinsApi.spend(id),
    onMutate: (id) => setBuyingId(id),
    onSettled: () => setBuyingId(null),
    onSuccess: (_, id) => {
      const item = (shopItems as ShopItem[]).find(i => i.id === id);
      toast({ title: `"${item?.name ?? 'Mahsulot'}" sotib olindi!` });
      qc.invalidateQueries({ queryKey: ['coin-balance'] });
      qc.invalidateQueries({ queryKey: ['coin-history'] });
      qc.invalidateQueries({ queryKey: ['coin-shop'] });
    },
    onError: (e: any) => toast({ title: 'Xatolik', description: e?.response?.data?.message, variant: 'destructive' }),
  });

  const [awardOpen, setAwardOpen] = useState(false);

  // ── Student view ──────────────────────────────────────────────────────────

  if (isStudent) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight">EduCoin</h1>

        {balLoading ? (
          <Skeleton className="h-32 rounded-2xl" />
        ) : (
          <BalanceCard coins={balance} />
        )}

        <Tabs defaultValue="shop">
          <TabsList className="w-full">
            <TabsTrigger value="shop" className="flex-1">
              <ShoppingBag className="h-4 w-4 mr-1.5" />Do'kon
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1">
              <History className="h-4 w-4 mr-1.5" />Tarix
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shop" className="mt-4">
            {shopLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
              </div>
            ) : (shopItems as ShopItem[]).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Package className="h-10 w-10 opacity-30" />
                <p className="text-sm">Hali mahsulotlar qo'shilmagan</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {(shopItems as ShopItem[]).map(item => (
                  <ShopItemCard
                    key={item.id}
                    item={item}
                    balance={balance}
                    onBuy={async () => {
                      if (!await ask({ title: `"${item.name}" — ${item.cost.toLocaleString()} coin uchun sotib olasizmi?`, confirmText: 'Sotib olish' })) return;
                      buyMutation.mutate(item.id);
                    }}
                    buying={buyingId === item.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardContent className="pt-4 divide-y">
                {histLoading
                  ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 my-1 rounded" />)
                  : (history as CoinTransaction[]).length === 0
                    ? <p className="text-center text-sm text-muted-foreground py-8">Tarix yo'q</p>
                    : (history as CoinTransaction[]).map(tx => <TxRow key={tx.id} tx={tx} />)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // ── Admin view ────────────────────────────────────────────────────────────

  if (isAdmin) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">EduCoin boshqaruvi</h1>
          <Button onClick={() => setAwardOpen(true)}>
            <Award className="h-4 w-4 mr-1.5" />Coin berish
          </Button>
        </div>

        <Tabs defaultValue="shop">
          <TabsList className="w-full">
            <TabsTrigger value="shop" className="flex-1">
              <Package className="h-4 w-4 mr-1.5" />Do'kon
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex-1">
              <ShoppingCart className="h-4 w-4 mr-1.5" />Xaridlar
            </TabsTrigger>
            <TabsTrigger value="balances" className="flex-1">
              <Trophy className="h-4 w-4 mr-1.5" />Reytingi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shop" className="mt-4">
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-base">Do'kon mahsulotlari</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <AdminShopTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="mt-4">
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-base">Xaridlar tarixi</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <AdminOrdersTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="balances" className="mt-4">
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-base">O'quvchilar reytingi</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <AdminBalancesTab />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AwardDialog open={awardOpen} onClose={() => setAwardOpen(false)} />
      </div>
    );
  }

  return null;
}
