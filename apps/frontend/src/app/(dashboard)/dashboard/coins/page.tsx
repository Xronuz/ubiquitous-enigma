'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { coinsApi, CoinTransaction, ShopItem } from '@/lib/api/coins';
import { usersApi } from '@/lib/api/users';
import {
  Coins, TrendingUp, TrendingDown, ShoppingBag, History,
  Plus, Minus, Loader2, Award, Search,
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
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ─── Reason display ───────────────────────────────────────────────────────────

const REASON_LABELS: Record<string, string> = {
  grade_excellent:    '5 (A\'lo) baho',
  attendance_weekly:  'Haftalik to\'liq davomat',
  discipline_praise:  'Maqtov',
  discipline_warning: 'Ogohlantirgich',
  manual_award:       'Admin mukofoti',
  shop_purchase:      'Do\'kondan xarid',
};

function reasonLabel(reason: string) {
  return REASON_LABELS[reason] ?? reason;
}

// ─── Coin Balance Widget ──────────────────────────────────────────────────────

function BalanceCard({ coins }: { coins: number }) {
  return (
    <Card className="bg-gradient-to-br from-yellow-400 to-amber-500 text-white border-0 shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-yellow-100 text-sm font-medium">Mening coinlarim</p>
            <p className="text-4xl font-bold mt-1 tabular-nums">{coins.toLocaleString()}</p>
            <p className="text-yellow-100 text-xs mt-1">EduCoin</p>
          </div>
          <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center">
            <Coins className="h-9 w-9 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TxRow({ tx }: { tx: CoinTransaction }) {
  const isEarn = tx.amount > 0;
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
      <div className={cn(
        'h-9 w-9 rounded-full flex items-center justify-center shrink-0',
        isEarn ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30',
      )}>
        {isEarn
          ? <TrendingUp className="h-4 w-4 text-green-600" />
          : <TrendingDown className="h-4 w-4 text-red-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{reasonLabel(tx.reason)}</p>
        <p className="text-xs text-muted-foreground">
          Balans: {tx.balance} coin · {new Date(tx.createdAt).toLocaleDateString('uz-UZ')}
        </p>
      </div>
      <span className={cn(
        'font-bold text-sm shrink-0',
        isEarn ? 'text-green-600' : 'text-red-500',
      )}>
        {isEarn ? '+' : ''}{tx.amount}
      </span>
    </div>
  );
}

// ─── Shop Item Card ───────────────────────────────────────────────────────────

function ShopItemCard({
  item, balance, onBuy, buying,
}: { item: ShopItem; balance: number; onBuy: () => void; buying: boolean }) {
  const canAfford = balance >= item.cost;
  return (
    <Card className={cn('transition-shadow', canAfford ? 'hover:shadow-md' : 'opacity-60')}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
            <ShoppingBag className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{item.name}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Coins className="h-4 w-4 text-amber-500" />
            <span className="font-bold text-amber-600">{item.cost}</span>
          </div>
          <Button size="sm" onClick={onBuy} disabled={buying || !canAfford}>
            {buying && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            {canAfford ? 'Xarid qilish' : "Yetarli coin yo'q"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Admin Award Dialog ───────────────────────────────────────────────────────

function AwardDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [studentId, setStudentId] = useState('');
  const [amount, setAmount]       = useState('');
  const [search, setSearch]       = useState('');

  const { data: usersData } = useQuery({
    queryKey: ['users', 'students'],
    queryFn: () => usersApi.getAll({ limit: 200 }),
    staleTime: 5 * 60_000,
  });
  const students = ((usersData?.data ?? []) as any[]).filter((u: any) => u.role === 'student');
  const filtered = students.filter((s: any) =>
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()),
  );

  const mutation = useMutation({
    mutationFn: () => coinsApi.award(studentId, Number(amount)),
    onSuccess: (_, vars) => {
      const n = Number(amount);
      toast({ title: n > 0 ? `+${n} coin berildi ✓` : `${n} coin ayirildi` });
      qc.invalidateQueries({ queryKey: ['coins'] });
      onClose();
      setStudentId('');
      setAmount('');
    },
    onError: (err: any) => toast({ title: 'Xatolik', description: err?.response?.data?.message, variant: 'destructive' }),
  });

  const isValid = studentId && amount && !isNaN(Number(amount)) && Number(amount) !== 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" /> Coin berish / ayirish
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>O'quvchini qidirish</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Ism bo'yicha..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>O'quvchi *</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger><SelectValue placeholder="O'quvchini tanlang" /></SelectTrigger>
              <SelectContent>
                {filtered.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                    {s.class && <span className="text-muted-foreground ml-1">— {s.class.name}</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Miqdor * <span className="text-muted-foreground font-normal text-xs">(manfiy son = ayirish)</span></Label>
            <Input
              type="number"
              placeholder="Masalan: 50 yoki -30"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            {amount && !isNaN(Number(amount)) && Number(amount) !== 0 && (
              <p className={cn('text-xs font-medium', Number(amount) > 0 ? 'text-green-600' : 'text-red-500')}>
                {Number(amount) > 0
                  ? `+${amount} coin beriladi`
                  : `${Math.abs(Number(amount))} coin ayiriladi`}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !isValid}
            variant={Number(amount) < 0 ? 'destructive' : 'default'}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {Number(amount) < 0 ? 'Ayirish' : 'Berish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CoinsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();

  const isStudent = user?.role === 'student';
  const isAdmin   = ['school_admin', 'vice_principal', 'director'].includes(user?.role ?? '');

  const [awardOpen, setAwardOpen] = useState(false);
  const [buyingId, setBuyingId]   = useState<string | null>(null);

  const { data: balanceData, isLoading: balLoading } = useQuery({
    queryKey: ['coins', 'balance'],
    queryFn: coinsApi.getBalance,
    enabled: isStudent,
    staleTime: 60_000,
  });

  const { data: history = [], isLoading: histLoading } = useQuery({
    queryKey: ['coins', 'history'],
    queryFn: () => coinsApi.getHistory(50),
    enabled: isStudent,
    staleTime: 60_000,
  });

  const { data: shopItems = [], isLoading: shopLoading } = useQuery({
    queryKey: ['coins', 'shop'],
    queryFn: coinsApi.getShopItems,
    enabled: isStudent,
    staleTime: 5 * 60_000,
  });

  const buyMutation = useMutation({
    mutationFn: (itemId: string) => coinsApi.spend(itemId),
    onMutate: (itemId) => setBuyingId(itemId),
    onSettled: () => setBuyingId(null),
    onSuccess: (res) => {
      toast({ title: res.message ?? 'Muvaffaqiyatli xarid ✓' });
      qc.invalidateQueries({ queryKey: ['coins'] });
    },
    onError: (err: any) => toast({ title: 'Xatolik', description: err?.response?.data?.message, variant: 'destructive' }),
  });

  const balance = balanceData?.coins ?? 0;

  // Admin view
  if (isAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Coins className="h-7 w-7 text-amber-500" /> EduCoin boshqaruvi
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">O'quvchilarga coin berish va ayirish</p>
          </div>
          <Button onClick={() => setAwardOpen(true)}>
            <Award className="h-4 w-4 mr-1" />
            Coin berish / ayirish
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Baho (A'lo)</p>
                <p className="font-bold text-lg">+10 coin</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Haftalik davomat</p>
                <p className="font-bold text-lg">+20 coin</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Award className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Maqtov / ogohlantirgich</p>
                <p className="font-bold text-lg">±100 / -50</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Qoidalar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• <strong>5 baho (A'lo)</strong> olish → +10 coin (avtomatik)</p>
            <p>• <strong>Haftalik to'liq davomat</strong> → +20 coin (har dushanba kechasi hisoblanadi)</p>
            <p>• <strong>Intizom: maqtov</strong> → +100 coin (avtomatik)</p>
            <p>• <strong>Intizom: ogohlantirgich</strong> → -50 coin (avtomatik)</p>
            <p>• Admin qo'lda istalgan miqdor berishi yoki ayirishi mumkin</p>
          </CardContent>
        </Card>

        <AwardDialog open={awardOpen} onClose={() => setAwardOpen(false)} />
      </div>
    );
  }

  // Student view
  if (!isStudent) {
    return (
      <EmptyState icon={Coins} title="Bu sahifa faqat o'quvchilar uchun" description="" />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Coins className="h-7 w-7 text-amber-500" /> EduCoin
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Coinlaringiz va do'kon</p>
      </div>

      {/* Balance */}
      {balLoading ? (
        <Skeleton className="h-32 rounded-2xl" />
      ) : (
        <BalanceCard coins={balance} />
      )}

      <Tabs defaultValue="shop">
        <TabsList>
          <TabsTrigger value="shop">
            <ShoppingBag className="h-4 w-4 mr-1" />
            Do'kon
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-1" />
            Tarix
          </TabsTrigger>
        </TabsList>

        {/* Shop tab */}
        <TabsContent value="shop" className="mt-4">
          {shopLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-36" />)}
            </div>
          ) : (shopItems as ShopItem[]).length === 0 ? (
            <EmptyState icon={ShoppingBag} title="Do'kon hozircha bo'sh" description="" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(shopItems as ShopItem[]).map((item) => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  balance={balance}
                  onBuy={() => {
                    if (!confirm(`"${item.name}" — ${item.cost} coin uchun sotib olasizmi?`)) return;
                    buyMutation.mutate(item.id);
                  }}
                  buying={buyingId === item.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* History tab */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-4">
              {histLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}
                </div>
              ) : (history as CoinTransaction[]).length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>Hali coin operatsiyalari yo'q</p>
                </div>
              ) : (
                <div>
                  {(history as CoinTransaction[]).map((tx) => (
                    <TxRow key={tx.id} tx={tx} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
