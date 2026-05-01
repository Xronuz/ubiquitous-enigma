'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Coins, ShoppingBag, ArrowLeft, Loader2, History, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { coinsApi, type ShopItem, type CoinTransaction } from '@/lib/api/coins';

export default function StudentShopPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'shop' | 'history'>('shop');

  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['coins', 'balance'],
    queryFn: () => coinsApi.getBalance(),
  });

  const { data: shopItems, isLoading: shopLoading } = useQuery({
    queryKey: ['coins', 'shop'],
    queryFn: () => coinsApi.getShopItems(),
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['coins', 'history'],
    queryFn: () => coinsApi.getHistory(50),
  });

  const spendMutation = useMutation({
    mutationFn: (itemId: string) => coinsApi.spend(itemId),
    onSuccess: () => {
      toast({ title: '✅ Sotib olindi!' });
      queryClient.invalidateQueries({ queryKey: ['coins'] });
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Xatolik',
        description: err?.response?.data?.message ?? 'Sotib olishda xatolik',
      });
    },
  });

  const balance = balanceData?.coins ?? 0;
  const activeItems = (shopItems ?? []).filter((i: ShopItem) => i.isActive);

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/student')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Orqaga
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-primary" />
              EduCoin Do'kon
            </h1>
            <p className="text-muted-foreground text-sm">Mukofotlarni tangalarga almashtiring</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-yellow-50 border border-yellow-200 px-4 py-2">
          <Coins className="h-5 w-5 text-yellow-600" />
          <span className="text-lg font-bold text-yellow-700">
            {balanceLoading ? <Skeleton className="h-6 w-12 inline-block" /> : balance}
          </span>
          <span className="text-xs text-yellow-600 font-medium">EduCoin</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={tab === 'shop' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('shop')}
        >
          <Sparkles className="h-4 w-4 mr-1.5" /> Do'kon
        </Button>
        <Button
          variant={tab === 'history' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('history')}
        >
          <History className="h-4 w-4 mr-1.5" /> Tarix
        </Button>
      </div>

      {/* Shop tab */}
      {tab === 'shop' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shopLoading ? (
            [...Array(6)].map((_, i) => (
              <Card key={i} className="h-40">
                <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-8 w-20" />
                </CardContent>
              </Card>
            ))
          ) : activeItems.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Do'konda hozircha mahsulot yo'q</p>
              <p className="text-sm mt-1">Keyinroq qayta tekshiring</p>
            </div>
          ) : (
            activeItems.map((item: ShopItem) => {
              const canAfford = balance >= item.cost;
              return (
                <Card key={item.id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="text-xl">{item.emoji ?? '🎁'}</span>
                        {item.name}
                      </CardTitle>
                      {item.stock !== null && item.stock !== undefined && (
                        <Badge variant="secondary" className="text-[10px]">
                          {item.stock} ta qoldi
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-end space-y-3">
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-yellow-700 font-bold">
                        <Coins className="h-4 w-4" />
                        {item.cost}
                      </div>
                      <Button
                        size="sm"
                        disabled={!canAfford || spendMutation.isPending}
                        onClick={() => spendMutation.mutate(item.id)}
                      >
                        {spendMutation.isPending && spendMutation.variables === item.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : null}
                        {canAfford ? 'Sotib olish' : 'Tanga yetarli emas'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Tranzaksiya tarixi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !history || history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>Hali tranzaksiyalar yo'q</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {(history as CoinTransaction[]).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          tx.amount > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{tx.reason}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleDateString('uz-UZ')}
                          </p>
                        </div>
                      </div>
                      <Badge variant={tx.amount > 0 ? 'default' : 'secondary'} className="text-[10px]">
                        {tx.amount > 0 ? 'Topdim' : 'Sarfladim'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
