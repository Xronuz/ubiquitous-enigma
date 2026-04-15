'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Library, Plus, Search, BookOpen, Users, RotateCcw, BookMarked, Loader2, AlertTriangle, Download, PackageOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/use-toast';
import { libraryApi } from '@/lib/api/library';
import { usersApi } from '@/lib/api/users';

const EMPTY_BOOK = { title: '', author: '', isbn: '', totalCopies: '1' };
const EMPTY_LOAN = { bookId: '', studentId: '' };

export default function LibraryPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canManage = ['school_admin', 'librarian'].includes(user?.role ?? '');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'books' | 'loans'>('books');
  const [bookOpen, setBookOpen] = useState(false);
  const [loanOpen, setLoanOpen] = useState(false);
  const [bookForm, setBookForm] = useState(EMPTY_BOOK);
  const [loanForm, setLoanForm] = useState(EMPTY_LOAN);
  const [bookErrors, setBookErrors] = useState<Record<string, string>>({});
  const [loanErrors, setLoanErrors] = useState<Record<string, string>>({});

  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['library', 'stats'], queryFn: libraryApi.getStats });
  const { data: books = [], isLoading: booksLoading } = useQuery({ queryKey: ['library', 'books', search], queryFn: () => libraryApi.getBooks(search || undefined) });
  const { data: loans = [], isLoading: loansLoading } = useQuery({ queryKey: ['library', 'loans'], queryFn: () => libraryApi.getLoans(true), enabled: tab === 'loans' });

  const { data: studentsData } = useQuery({ queryKey: ['users', 1], queryFn: () => usersApi.getAll({ page: 1, limit: 100 }), enabled: loanOpen });
  const students: any[] = (studentsData?.data ?? []).filter((u: any) => u.role === 'student');

  const createBookMutation = useMutation({
    mutationFn: libraryApi.createBook,
    onSuccess: () => { toast({ title: '✅ Kitob qo\'shildi' }); queryClient.invalidateQueries({ queryKey: ['library'] }); setBookOpen(false); setBookForm(EMPTY_BOOK); },
    onError: (err: any) => { const msg = err?.response?.data?.message; toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' }); },
  });

  const loanMutation = useMutation({
    mutationFn: libraryApi.loanBook,
    onSuccess: () => { toast({ title: '✅ Kitob berildi' }); queryClient.invalidateQueries({ queryKey: ['library'] }); setLoanOpen(false); setLoanForm(EMPTY_LOAN); },
    onError: (err: any) => { const msg = err?.response?.data?.message; toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' }); },
  });

  const returnMutation = useMutation({
    mutationFn: libraryApi.returnBook,
    onSuccess: () => { toast({ title: '✅ Kitob qaytarildi' }); queryClient.invalidateQueries({ queryKey: ['library'] }); },
  });

  const validateBook = () => {
    const e: Record<string, string> = {};
    if (!bookForm.title.trim()) e.title = 'Kitob nomi kiriting';
    setBookErrors(e);
    return !Object.keys(e).length;
  };
  const validateLoan = () => {
    const e: Record<string, string> = {};
    if (!loanForm.bookId) e.bookId = 'Kitob tanlang';
    if (!loanForm.studentId) e.studentId = "O'quvchi tanlang";
    setLoanErrors(e);
    return !Object.keys(e).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Library className="h-6 w-6 text-primary" /> Kutubxona</h1>
          <p className="text-muted-foreground">Maktab kutubxonasini boshqarish</p>
        </div>
        {canManage && (
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                libraryApi.exportLoansPdf().catch(() =>
                  toast({ variant: 'destructive', title: 'PDF yuklab olishda xato' })
                )
              }
            >
              <Download className="mr-1.5 h-4 w-4" /> PDF Tarix
            </Button>
            <Button variant="outline" onClick={() => { setLoanOpen(true); setLoanForm(EMPTY_LOAN); setLoanErrors({}); }}>
              <BookMarked className="mr-2 h-4 w-4" /> Kitob berish
            </Button>
            <Button onClick={() => { setBookOpen(true); setBookForm(EMPTY_BOOK); setBookErrors({}); }}>
              <Plus className="mr-2 h-4 w-4" /> Kitob qo'shish
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {statsLoading ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />) : [
          { label: 'Jami kitoblar', value: stats?.totalBooks ?? 0, icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Mavjud nusxalar', value: stats?.availableBooks ?? 0, icon: BookOpen, color: 'text-green-500', bg: 'bg-green-500/10' },
          { label: 'Berilgan kitoblar', value: stats?.activeLoans ?? 0, icon: Users, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { label: 'Muddati o\'tgan', value: stats?.overdueLoans ?? 0, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></div>
              <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['books', 'loans'] as const).map(t => (
          <Button key={t} variant={tab === t ? 'default' : 'outline'} size="sm" onClick={() => setTab(t)}>
            {t === 'books' ? 'Kitoblar' : 'Berilgan kitoblar'}
          </Button>
        ))}
      </div>

      {tab === 'books' && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Kitob nomi, muallif..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {booksLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : (books as any[]).length === 0 ? (
            <Card><CardContent className="py-4">
              <EmptyState
                icon={PackageOpen}
                title="Kitoblar topilmadi"
                description="Kutubxonaga hali kitob qo'shilmagan yoki qidiruv natijalari bo'sh"
                action={canManage ? { label: '+ Kitob qo\'shish', onClick: () => setBookOpen(true) } : undefined}
              />
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {(books as any[]).map((book: any) => (
                <Card key={book.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10"><BookOpen className="h-5 w-5 text-primary" /></div>
                      <div>
                        <p className="font-medium">{book.title}</p>
                        <p className="text-sm text-muted-foreground">{book.author ?? 'Muallif ko\'rsatilmagan'} {book.isbn && `· ISBN: ${book.isbn}`}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={book.availableCopies > 0 ? 'success' : 'destructive'}>
                        {book.availableCopies}/{book.totalCopies} nusxa
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'loans' && (
        <>
          {loansLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : (loans as any[]).length === 0 ? (
            <Card><CardContent className="py-4">
              <EmptyState
                icon={BookMarked}
                title="Berilgan kitoblar yo'q"
                description="Hozirda o'quvchilarga berilgan kitoblar mavjud emas"
              />
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {(loans as any[]).map((loan: any) => {
                const isOverdue = loan.dueDate && new Date(loan.dueDate) < new Date();
                return (
                  <Card key={loan.id} className={isOverdue ? 'border-destructive/40' : ''}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{loan.book?.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {loan.student?.firstName} {loan.student?.lastName} · {new Date(loan.loanDate).toLocaleDateString('uz-UZ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {isOverdue && <Badge variant="destructive">Muddati o'tgan</Badge>}
                        {canManage && (
                          <Button size="sm" variant="outline" onClick={() => returnMutation.mutate(loan.id)} disabled={returnMutation.isPending}>
                            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Qaytarildi
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add book modal */}
      <Dialog open={bookOpen} onOpenChange={setBookOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Yangi kitob qo'shish</DialogTitle><DialogDescription>Kutubxonaga kitob qo'shing</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Kitob nomi <span className="text-destructive">*</span></Label>
              <Input placeholder="Masalan: Matematika 9-sinf" value={bookForm.title} onChange={e => { setBookForm(f => ({ ...f, title: e.target.value })); setBookErrors(er => { const n = { ...er }; delete n.title; return n; }); }} />
              {bookErrors.title && <p className="text-xs text-destructive">{bookErrors.title}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Muallif</Label>
                <Input placeholder="Ism Familiya" value={bookForm.author} onChange={e => setBookForm(f => ({ ...f, author: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>ISBN</Label>
                <Input placeholder="978-..." value={bookForm.isbn} onChange={e => setBookForm(f => ({ ...f, isbn: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nusxalar soni</Label>
              <Input type="number" min={1} value={bookForm.totalCopies} onChange={e => setBookForm(f => ({ ...f, totalCopies: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBookOpen(false)}>Bekor qilish</Button>
            <Button onClick={() => { if (!validateBook()) return; createBookMutation.mutate({ ...bookForm, totalCopies: Number(bookForm.totalCopies) }); }} disabled={createBookMutation.isPending}>
              {createBookMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Qo'shish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loan book modal */}
      <Dialog open={loanOpen} onOpenChange={setLoanOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Kitob berish</DialogTitle><DialogDescription>O'quvchiga kitob bering</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Kitob <span className="text-destructive">*</span></Label>
              <Select value={loanForm.bookId} onValueChange={v => { setLoanForm(f => ({ ...f, bookId: v })); setLoanErrors(e => { const n = { ...e }; delete n.bookId; return n; }); }}>
                <SelectTrigger><SelectValue placeholder="Kitob tanlang..." /></SelectTrigger>
                <SelectContent>{(books as any[]).filter((b: any) => b.availableCopies > 0).map((b: any) => <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>)}</SelectContent>
              </Select>
              {loanErrors.bookId && <p className="text-xs text-destructive">{loanErrors.bookId}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>O'quvchi <span className="text-destructive">*</span></Label>
              <Select value={loanForm.studentId} onValueChange={v => { setLoanForm(f => ({ ...f, studentId: v })); setLoanErrors(e => { const n = { ...e }; delete n.studentId; return n; }); }}>
                <SelectTrigger><SelectValue placeholder="O'quvchi tanlang..." /></SelectTrigger>
                <SelectContent>{students.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent>
              </Select>
              {loanErrors.studentId && <p className="text-xs text-destructive">{loanErrors.studentId}</p>}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLoanOpen(false)}>Bekor qilish</Button>
            <Button onClick={() => { if (!validateLoan()) return; loanMutation.mutate(loanForm); }} disabled={loanMutation.isPending}>
              {loanMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Berish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
