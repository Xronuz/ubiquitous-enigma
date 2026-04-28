'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarOff, Plus, CheckCircle2, XCircle, Clock, Loader2,
  Calendar, MessageSquare, User, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { leaveRequestsApi } from '@/lib/api/leave-requests';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/use-toast';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, getInitials, getRoleLabel } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'Kutilmoqda',    color: 'border-yellow-500 text-yellow-600', icon: <Clock className="h-3 w-3" /> },
  approved:  { label: 'Tasdiqlandi',   color: 'border-green-500 text-green-600',   icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected:  { label: 'Rad etildi',    color: 'border-red-500 text-red-600',       icon: <XCircle className="h-3 w-3" /> },
  cancelled: { label: 'Bekor qilindi', color: 'border-border text-muted-foreground',     icon: <XCircle className="h-3 w-3" /> },
};

const STATUS_FILTERS = [
  { value: '', label: 'Barchasi' },
  { value: 'pending', label: 'Kutilmoqda' },
  { value: 'approved', label: 'Tasdiqlandi' },
  { value: 'rejected', label: 'Rad etildi' },
  { value: 'cancelled', label: 'Bekor qilindi' },
];

const LEAVE_TYPES = [
  { value: 'sick',     label: '🤒 Kasallik' },
  { value: 'personal', label: '👤 Shaxsiy' },
  { value: 'family',   label: '👨‍👩‍👧 Oilaviy' },
  { value: 'other',    label: '📋 Boshqa' },
] as const;

const EMPTY_FORM = { reason: '', startDate: '', endDate: '', type: 'personal' as 'sick' | 'personal' | 'family' | 'other' };

export default function LeaveRequestsPage() {
  const { user, activeBranchId } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isApprover = ['school_admin', 'vice_principal'].includes(user?.role ?? '');
  const isStudent  = user?.role === 'student';

  const [filterStatus, setFilterStatus] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Review modal
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewComment, setReviewComment] = useState('');

  // Expand state for approvals
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['leave-requests', filterStatus, activeBranchId],
    queryFn: () => leaveRequestsApi.getAll({ status: filterStatus || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: leaveRequestsApi.create,
    onSuccess: () => {
      toast({ title: "✅ Ta'til so'rovi yuborildi. Tasdiqlash kutilmoqda." });
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, comment }: { id: string; action: 'approve' | 'reject'; comment?: string }) =>
      leaveRequestsApi.review(id, { action, comment }),
    onSuccess: (_, vars) => {
      toast({ title: vars.action === 'approve' ? "✅ So'rov tasdiqlandi" : "❌ So'rov rad etildi" });
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      setReviewOpen(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: leaveRequestsApi.cancel,
    onSuccess: () => {
      toast({ title: "So'rov bekor qilindi" });
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.reason.trim() || form.reason.trim().length < 5) e.reason = "Sabab kamida 5 ta belgi bo'lishi kerak";
    if (!form.startDate) e.startDate = 'Boshlanish sanasi tanlang';
    if (!form.endDate) e.endDate = 'Tugash sanasi tanlang';
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      e.endDate = "Tugash sanasi boshlanishdan keyin bo'lishi kerak";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = () => {
    if (!validate()) return;
    createMutation.mutate(form);
  };

  const openReview = (req: any, action: 'approve' | 'reject') => {
    setReviewTarget(req);
    setReviewAction(action);
    setReviewComment('');
    setReviewOpen(true);
  };

  const pendingCount = (requests as any[]).filter((r: any) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarOff className="h-6 w-6" /> Ta'til so'rovlari
          </h1>
          <p className="text-muted-foreground">
            {isApprover
              ? `Xodimlarning ta'til so'rovlari • ${pendingCount > 0 ? `${pendingCount} ta yangi` : 'Yangi so\'rov yo\'q'}`
              : isStudent
              ? "Dars qoldirishga so'rov yuboring — ma'muriyat tasdiqlaydi"
              : "Ta'tilga chiqish uchun so'rov yuboring"}
          </p>
        </div>
        <Button onClick={() => { setCreateOpen(true); setForm(EMPTY_FORM); setFormErrors({}); }}>
          <Plus className="mr-2 h-4 w-4" /> So'rov yuborish
        </Button>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(f => (
          <Button
            key={f.value}
            size="sm"
            variant={filterStatus === f.value ? 'default' : 'outline'}
            onClick={() => setFilterStatus(f.value)}
          >
            {f.label}
            {f.value === 'pending' && pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                {pendingCount}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Requests list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (requests as any[]).length === 0 ? (
        <EmptyState
          icon={CalendarOff}
          title="So'rovlar topilmadi"
          description={
            filterStatus
              ? `"${STATUS_FILTERS.find(f => f.value === filterStatus)?.label}" holatidagi so'rovlar yo'q`
              : isStudent
              ? "Siz hali so'rov yubormadingiz. Dars qoldirishga ehtiyoj bo'lsa, quyidagi tugmani bosing."
              : "Hech qanday ta'til so'rovi mavjud emas."
          }
          action={
            !filterStatus
              ? { label: "So'rov yuborish", onClick: () => { setCreateOpen(true); setForm(EMPTY_FORM); setFormErrors({}); } }
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {(requests as any[]).map((req: any) => {
            const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending;
            const isExpanded = expandedId === req.id;
            const isMine = req.requesterId === user?.id;
            const myApproval = req.approvals?.find((a: any) => a.approverId === user?.id);
            const canReview = isApprover && req.status === 'pending' && myApproval?.status === 'pending';

            return (
              <Card key={req.id} className="overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: requester + info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="text-xs">
                          {getInitials(req.requester?.firstName ?? '', req.requester?.lastName ?? '')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">
                            {req.requester?.firstName} {req.requester?.lastName}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {getRoleLabel(req.requester?.role ?? '')}
                          </span>
                          {isMine && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0">Mening so'rovim</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{req.reason}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(req.startDate)} – {formatDate(req.endDate)}
                          </span>
                          <span>Yuborildi: {formatDate(req.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: status + actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={`${cfg.color} flex items-center gap-1`}>
                        {cfg.icon} {cfg.label}
                      </Badge>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : req.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {canReview && (
                      <>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-green-600 hover:bg-green-700"
                          onClick={() => openReview(req, 'approve')}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Tasdiqlash
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs"
                          onClick={() => openReview(req, 'reject')}
                        >
                          <XCircle className="mr-1 h-3 w-3" /> Rad etish
                        </Button>
                      </>
                    )}
                    {isMine && req.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground"
                        onClick={() => cancelMutation.mutate(req.id)}
                        disabled={cancelMutation.isPending}
                      >
                        Bekor qilish
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded: approvals */}
                {isExpanded && (
                  <div className="border-t bg-muted/20 px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <User className="h-3 w-3" /> Tasdiqlovchilar
                    </p>
                    {req.approvals?.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Tasdiqlovchi tayinlanmagan</p>
                    ) : (
                      <div className="space-y-2">
                        {req.approvals.map((approval: any) => {
                          const aCfg = STATUS_CONFIG[approval.status] ?? STATUS_CONFIG.pending;
                          return (
                            <div key={approval.id} className="flex items-center gap-3 text-xs">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px]">
                                  {getInitials(approval.approver?.firstName ?? '', approval.approver?.lastName ?? '')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {approval.approver?.firstName} {approval.approver?.lastName}
                              </span>
                              <span className="text-muted-foreground">{getRoleLabel(approval.approver?.role ?? '')}</span>
                              <Badge variant="outline" className={`${aCfg.color} flex items-center gap-0.5 text-[10px] px-1.5`}>
                                {aCfg.icon} {aCfg.label}
                              </Badge>
                              {approval.comment && (
                                <span className="text-muted-foreground italic flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" /> {approval.comment}
                                </span>
                              )}
                              {approval.decidedAt && (
                                <span className="text-muted-foreground">{formatDate(approval.decidedAt)}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ta'til so'rovi yuborish</DialogTitle>
            <DialogDescription>
              So'rovingiz direktor va o'quv ishlari bo'yicha direktori tomonidan ko'rib chiqiladi
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Ta'til turi</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as 'sick' | 'personal' | 'family' | 'other' }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Boshlanish sanasi <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={e => { setForm(f => ({ ...f, startDate: e.target.value })); setFormErrors(er => { const n = { ...er }; delete n.startDate; return n; }); }}
                />
                {formErrors.startDate && <p className="text-xs text-destructive">{formErrors.startDate}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Tugash sanasi <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={e => { setForm(f => ({ ...f, endDate: e.target.value })); setFormErrors(er => { const n = { ...er }; delete n.endDate; return n; }); }}
                />
                {formErrors.endDate && <p className="text-xs text-destructive">{formErrors.endDate}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Sabab <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Ta'tilga chiqish sababini kiriting..."
                rows={4}
                value={form.reason}
                onChange={e => { setForm(f => ({ ...f, reason: e.target.value })); setFormErrors(er => { const n = { ...er }; delete n.reason; return n; }); }}
                className="resize-none"
              />
              {formErrors.reason && <p className="text-xs text-destructive">{formErrors.reason}</p>}
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
              <p className="font-medium">⚠️ Diqqat</p>
              <p>So'rovingiz direktor va o'quv ishlari bo'yicha direktorga yuboriladi. Ikkalasi ham tasdiqlasa so'rovingiz qabul qilinadi.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Bekor</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yuborish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review modal */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? "✅ So'rovni tasdiqlash" : "❌ So'rovni rad etish"}
            </DialogTitle>
            {reviewTarget && (
              <DialogDescription>
                {reviewTarget.requester?.firstName} {reviewTarget.requester?.lastName} •{' '}
                {formatDate(reviewTarget.startDate)} – {formatDate(reviewTarget.endDate)}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-3 py-2">
            {reviewTarget && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium text-xs text-muted-foreground mb-1">Sabab:</p>
                <p>{reviewTarget.reason}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Izoh (ixtiyoriy)</Label>
              <Textarea
                placeholder={reviewAction === 'approve' ? "Tasdiqlash izohi..." : "Rad etish sababi..."}
                rows={3}
                className="resize-none"
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Bekor</Button>
            <Button
              variant={reviewAction === 'approve' ? 'default' : 'destructive'}
              onClick={() => reviewMutation.mutate({ id: reviewTarget?.id, action: reviewAction, comment: reviewComment || undefined })}
              disabled={reviewMutation.isPending}
            >
              {reviewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {reviewAction === 'approve' ? 'Tasdiqlash' : 'Rad etish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
