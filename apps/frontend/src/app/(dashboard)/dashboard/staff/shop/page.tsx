'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Loader2, Coins, ShoppingBag, Users, History, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { coinsApi, type ShopItem, type StudentBalance, type CoinTransaction } from '@/lib/api/coins';

export default function AdminShopPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'items' | 'balances' | 'orders'>('items');
  const [editItem, setEditItem] = useState<ShopItem | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    cost: '',
    emoji: '🎁',
    stock: '',
  });

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['coins', 'admin', 'shop'],
    queryFn: () => coinsApi.getAllShopItems(),
  });

  const { data: balances, isLoading: balancesLoading } = useQuery({
    queryKey: ['coins', 'admin', 'balances'],
    queryFn: () => coinsApi.getStudentBalances(),
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['coins', 'admin', 'orders'],
    queryFn: () => coinsApi.getShopOrders(),
  });

  const createMutation = useMutation({
    mutationFn: coinsApi.createShopItem,
    onSuccess: () => {
      toast({ title: "✅ Mahsulot qo'shildi" });
      queryClient.invalidateQueries({ queryKey: ['coins', 'admin', 'shop'] });
      closeDialog();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: 'Xato', description: err?.response?.data?.message }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof coinsApi.updateShopItem>[1] }) =>
      coinsApi.updateShopItem(id, payload),
    onSuccess: () => {
      toast({ title: '✅ Yangilandi' });
      queryClient.invalidateQueries({ queryKey: ['coins', 'admin', 'shop'] });
      closeDialog();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: 'Xato', description: err?.response?.data?.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: coinsApi.deleteShopItem,
    onSuccess: () => {
      toast({ title: "✅ O'chirildi" });
      queryClient.invalidateQueries({ queryKey: ['coins', 'admin', 'shop'] });
      setConfirmDelete(null);
    },
    onError: (err: any) => toast({ variant: 'destructive', title: 'Xato', description: err?.response?.data?.message }),
  });

  const closeDialog = () => {
    setOpenDialog(false);
    setEditItem(null);
    setForm({ name: '', description: '', cost: '', emoji: '🎁', stock: '' });
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', description: '', cost: '', emoji: '🎁', stock: '' });
    setOpenDialog(true);
  };

  const openEdit = (item: ShopItem) => {
    setEditItem(item);
    setForm({
      name: item.name,
      description: item.description ?? '',
      cost: String(item.cost),
      emoji: item.emoji ?? '🎁',
      stock: item.stock != null ? String(item.stock) : '',
    });
    setOpenDialog(true);
  };

  const handleSubmit = () => {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      cost: Number(form.cost),
      emoji: form.emoji.trim() || undefined,
      stock: form.stock.trim() ? Number(form.stock) : null,
    };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            EduCoin Do'kon Boshqaruvi
          </h1>
          <p className="text-muted-foreground text-sm">Mahsulotlar, balanslar va buyurtmalar</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> Mahsulot qo&apos;shish
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="items">
            <Package className="h-4 w-4 mr-1.5" /> Mahsulotlar
          </TabsTrigger>
          <TabsTrigger value="balances">
            <Users className="h-4 w-4 mr-1.5" /> Balanslar
          </TabsTrigger>
          <TabsTrigger value="orders">
            <History className="h-4 w-4 mr-1.5" /> Buyurtmalar
          </TabsTrigger>
        </TabsList>

        {/* Items tab */}
        <TabsContent value="items" className="space-y-4">
          {itemsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="h-36"><CardContent className="p-4 space-y-2"><Skeleton className="h-5 w-24" /><Skeleton className="h-4 w-full" /><Skeleton className="h-8 w-20" /></CardContent></Card>
              ))}
            </div>
          ) : !items || items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Hali mahsulotlar yo&apos;q</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item: ShopItem) => (
                <Card key={item.id} className={`${!item.isActive ? 'opacity-60' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="text-xl">{item.emoji ?? '🎁'}</span>
                        {item.name}
                      </CardTitle>
                      {!item.isActive && <Badge variant="secondary">O&apos;chirilgan</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-yellow-700 font-bold">
                        <Coins className="h-4 w-4" />
                        {item.cost}
                      </div>
                      {item.stock != null && <Badge variant="outline" className="text-[10px]">{item.stock} qoldi</Badge>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Tahrirlash
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmDelete(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Balances tab */}
        <TabsContent value="balances">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                O&apos;quvchilar balansi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {balancesLoading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : !balances || balances.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Hali ma&apos;lumot yo&apos;q</div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-1">
                    {balances.map((b: StudentBalance) => (
                      <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {b.firstName[0]}{b.lastName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{b.firstName} {b.lastName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-700 font-bold">
                          <Coins className="h-4 w-4" />
                          {b.coins}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Buyurtmalar tarixi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : !orders || orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Hali buyurtmalar yo&apos;q</div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-1">
                    {(orders as CoinTransaction[]).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-sm font-bold text-red-700">
                            {tx.amount}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{tx.reason}</p>
                            <p className="text-xs text-muted-foreground">
                              {tx.user?.firstName} {tx.user?.lastName} · {new Date(tx.createdAt).toLocaleDateString('uz-UZ')}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">Sotib oldi</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create / Edit Dialog */}
      <Dialog open={openDialog} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Mahsulotni tahrirlash' : "Yangi mahsulot qo'shish"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nomi <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Masalan: Ruchka" />
            </div>
            <div className="space-y-1.5">
              <Label>Tavsif</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Qisqa tavsif..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Narx (tanga) <span className="text-destructive">*</span></Label>
                <Input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="50" />
              </div>
              <div className="space-y-1.5">
                <Label>Zaxira (ixtiyoriy)</Label>
                <Input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="∞" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Emoji</Label>
              <Input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} placeholder="🎁" maxLength={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Bekor</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !form.name || !form.cost}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editItem ? 'Saqlash' : "Qo'shish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mahsulotni o&apos;chirish</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Bu mahsulotni o&apos;chirmoqchimisiz?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Bekor</Button>
            <Button variant="destructive" onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : 'O\'chirish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
