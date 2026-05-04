'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookMarked, Plus, Calendar, CheckCircle2, Clock, Send, Loader2,
  FileX, FileCheck, Users, Star, ChevronRight, Paperclip, X, ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { homeworkApi } from '@/lib/api/homework';
import { apiClient } from '@/lib/api/client';
import { classesApi } from '@/lib/api/classes';
import { subjectsApi } from '@/lib/api/subjects';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/use-toast';
import { EmptyState } from '@/components/ui/empty-state';

// ── Types (H-10) ─────────────────────────────────────────────────────────────
export interface HomeworkSubmission {
  id: string;
  studentId: string;
  content?: string;
  fileUrl?: string;
  score?: number | null;
  submittedAt: string;
  student?: { id: string; firstName: string; lastName: string };
}

export interface Homework {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  classId: string;
  subjectId: string;
  class?: { id: string; name: string };
  subject?: { id: string; name: string };
  submissions?: HomeworkSubmission[];
  mySubmission?: HomeworkSubmission | null;
}

const EMPTY = { classId: '', subjectId: '', title: '', description: '', dueDate: '' };

// ── File upload constraints (modul darajasida — har renderda qayta yaratilmaydi) ──
const FILE_MAX_MB = 10;
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
]);

// ── My Submission Dialog (student) ───────────────────────────────────────────
function MySubmissionDialog({ homeworkId, homeworkTitle, open, onClose }: {
  homeworkId: string;
  homeworkTitle: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data: submission, isLoading } = useQuery({
    queryKey: ['homework', homeworkId, 'my-submission'],
    queryFn: () => homeworkApi.getMySubmission(homeworkId),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Mening topshirig&apos;im
          </DialogTitle>
          <DialogDescription>{homeworkTitle}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : !submission ? (
          <div className="py-10 text-center text-muted-foreground">
            <FileX className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Topshiriq hali topshirilmagan</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status + Score */}
            <div className="flex items-center gap-3">
              <Badge variant={submission.score !== null && submission.score !== undefined ? 'default' : 'secondary'}
                className="gap-1 text-sm px-3 py-1">
                {submission.score !== null && submission.score !== undefined
                  ? <><Star className="h-3.5 w-3.5" /> Ball: {submission.score}</>
                  : 'Baholanmagan'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {submission.submittedAt
                  ? new Date(submission.submittedAt).toLocaleString('uz-UZ')
                  : 'Topshirildi'}
              </span>
            </div>

            {/* Content */}
            {submission.content && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Javob:</p>
                <p className="text-sm bg-muted/50 rounded-md p-3 whitespace-pre-wrap">{submission.content}</p>
              </div>
            )}

            {/* File */}
            {submission.fileUrl && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Biriktirilgan fayl:</p>
                <a
                  href={submission.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  Faylni ko&apos;rish
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {/* Teacher feedback */}
            {submission.feedback && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">O&apos;qituvchi izohi:</p>
                <p className="text-sm bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-3 italic">
                  {submission.feedback}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Yopish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Submissions Dialog ────────────────────────────────────────────────────────
function SubmissionsDialog({ homework, open, onClose }: {
  homework: any;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [scores, setScores] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    (homework.submissions ?? []).forEach((s: any) => {
      if (s.score !== null && s.score !== undefined) init[s.id] = String(s.score);
    });
    return init;
  });

  const { data: detail, isLoading } = useQuery({
    queryKey: ['homework', homework.id],
    queryFn: () => homeworkApi.getOne(homework.id),
    enabled: open,
  });

  const submissions: any[] = detail?.submissions ?? homework.submissions ?? [];

  const gradeMutation = useMutation({
    mutationFn: ({ submissionId, score }: { submissionId: string; score: number }) =>
      homeworkApi.grade(homework.id, submissionId, score),
    onSuccess: (_data, vars) => {
      toast({ title: `✅ Ball saqlandi` });
      queryClient.invalidateQueries({ queryKey: ['homework', homework.id] });
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      setScores(prev => ({ ...prev, [vars.submissionId]: String(vars.score) }));
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const handleGrade = (submissionId: string) => {
    const score = Number(scores[submissionId]);
    if (isNaN(score) || score < 0) {
      toast({ variant: 'destructive', title: 'To\'g\'ri ball kiriting' });
      return;
    }
    gradeMutation.mutate({ submissionId, score });
  };

  const submitted = submissions.length;
  const graded = submissions.filter((s: any) => s.score !== null && s.score !== undefined).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Topshiriqlar — {homework.title}
          </DialogTitle>
          <DialogDescription>
            {submitted} ta topshirilgan · {graded} ta baholangan
            {homework.class && ` · ${homework.class.name}-sinf`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : submissions.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <FileX className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Hali hech kim topshirmagan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub: any) => (
              <div key={sub.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {sub.student?.firstName} {sub.student?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {sub.submittedAt
                        ? new Date(sub.submittedAt).toLocaleString('uz-UZ')
                        : 'Sana noma\'lum'}
                    </p>
                    {sub.content && (
                      <p className="text-sm mt-2 bg-muted/50 rounded-md p-2 whitespace-pre-wrap">
                        {sub.content}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {sub.score !== null && sub.score !== undefined ? (
                      <Badge variant="default" className="gap-1">
                        <Star className="h-3 w-3" /> {sub.score}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Baholanmagan</Badge>
                    )}
                  </div>
                </div>
                {/* Inline scoring */}
                <div className="flex items-center gap-2 pt-1">
                  <Label className="text-xs text-muted-foreground shrink-0">Ball:</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={scores[sub.id] ?? (sub.score !== null && sub.score !== undefined ? String(sub.score) : '')}
                    onChange={e => setScores(prev => ({ ...prev, [sub.id]: e.target.value }))}
                    className="w-20 h-7 text-sm text-center"
                    placeholder="0–100"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => handleGrade(sub.id)}
                    disabled={gradeMutation.isPending}
                  >
                    {gradeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Saqlash'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Yopish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HomeworkPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isStudent = user?.role === 'student';
  const isAdmin = ['director', 'vice_principal'].includes(user?.role ?? '');
  const isTeacher = ['teacher', 'class_teacher'].includes(user?.role ?? '');
  const canAdd = isTeacher || isAdmin;

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submitText, setSubmitText] = useState('');
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [gradingHw, setGradingHw] = useState<any | null>(null);
  const [viewSubmissionHw, setViewSubmissionHw] = useState<any | null>(null);

  const { data: homeworks = [], isLoading, isError } = useQuery<Homework[]>({ queryKey: ['homework'], queryFn: () => homeworkApi.getAll() });
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => classesApi.getAll(), enabled: open });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: () => subjectsApi.getAll(), enabled: open });

  const createMutation = useMutation({
    mutationFn: homeworkApi.create,
    onSuccess: () => {
      toast({ title: '✅ Uy vazifasi qo\'shildi' });
      queryClient.invalidateQueries({ queryKey: ['homework'] });
      setOpen(false);
      setForm(EMPTY);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const submitMutation = useMutation({
    mutationFn: ({ id, content, fileUrl }: { id: string; content: string; fileUrl?: string }) =>
      homeworkApi.submit(id, { content, fileUrl }),
    onSuccess: () => {
      toast({ title: '✅ Topshirildi!', description: "Uy vazifangiz o'qituvchiga yuborildi" });
      setSubmittingId(null);
      setSubmitText('');
      setSubmitFile(null);
      queryClient.invalidateQueries({ queryKey: ['homework'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const handleStudentSubmit = async (hwId: string) => {
    if (!submitText.trim() && !submitFile) {
      toast({ variant: 'destructive', title: 'Javob yoki fayl kiriting' });
      return;
    }
    if (submitFile) {
      if (submitFile.size > FILE_MAX_MB * 1024 * 1024) {
        toast({ variant: 'destructive', title: `Fayl hajmi ${FILE_MAX_MB}MB dan oshmasligi kerak` });
        return;
      }
      if (!ALLOWED_MIME_TYPES.has(submitFile.type)) {
        toast({ variant: 'destructive', title: 'Noto\'g\'ri fayl turi', description: 'PDF, DOC, DOCX, TXT, PNG, JPG, XLSX, CSV fayl turlarini yuklash mumkin' });
        return;
      }
    }
    let fileUrl: string | undefined;
    if (submitFile) {
      setUploading(true);
      try {
        const form = new FormData();
        form.append('file', submitFile);
        const { data } = await apiClient.post('/upload/document', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        fileUrl = data.url;
      } catch {
        toast({ variant: 'destructive', title: 'Fayl yuklanmadi', description: 'Qayta urinib ko\'ring' });
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    submitMutation.mutate({ id: hwId, content: submitText, fileUrl });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Sarlavha kiriting';
    if (!form.classId) e.classId = 'Sinf tanlang';
    if (!form.subjectId) e.subjectId = 'Fan tanlang';
    if (!form.dueDate) e.dueDate = 'Topshirish muddati';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createMutation.mutate({
      title: form.title.trim(),
      classId: form.classId,
      subjectId: form.subjectId,
      description: form.description || undefined,
      dueDate: new Date(form.dueDate).toISOString(),
    });
  };

  const sel = (k: string) => (v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => { const n = { ...e }; delete n[k]; return n; }); };
  const inp = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setForm(f => ({ ...f, [k]: e.target.value })); setErrors(er => { const n = { ...er }; delete n[k]; return n; }); };

  const now = new Date();
  const hw = homeworks as any[];
  const active = hw.filter(h => new Date(h.dueDate) >= now);
  const expired = hw.filter(h => new Date(h.dueDate) < now);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookMarked className="h-6 w-6 text-primary" /> Uy vazifalari
          </h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Barcha uy vazifalari statistikasi' : isStudent ? 'Uy vazifalaringizni ko\'ring va topshiring' : 'Uy vazifalarini boshqarish'}
          </p>
        </div>
        {canAdd && (
          <Button onClick={() => { setOpen(true); setForm(EMPTY); setErrors({}); }}>
            <Plus className="mr-2 h-4 w-4" /> Yangi vazifa
          </Button>
        )}
      </div>

      {/* Admin/Teacher: stats */}
      {(isAdmin || isTeacher) && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Jami vazifalar', value: hw.length, icon: BookMarked, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Faol vazifalar', value: active.length, icon: Clock, color: 'text-green-500', bg: 'bg-green-500/10' },
            { label: 'Muddati o\'tgan', value: expired.length, icon: FileX, color: 'text-red-500', bg: 'bg-red-500/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      ) : isError ? (
        <EmptyState
          icon={FileX}
          title="Uy vazifalari yuklanmadi"
          description="Server bilan bog'lanishda xato. Sahifani yangilang yoki qayta urinib ko'ring."
        />
      ) : hw.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title="Hali uy vazifalari yo'q"
          description={isTeacher ? "Yuqoridagi '+ Vazifa qo'shish' tugmasini bosib birinchi vazifani kiriting" : "O'qituvchi tomonidan berilgan vazifalar bu yerda ko'rinadi"}
        />
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Faol vazifalar</h2>
              <div className="space-y-3">
                {active.map((hw: any) => {
                  const daysLeft = Math.ceil((new Date(hw.dueDate).getTime() - now.getTime()) / 86400000);
                  const isUrgent = daysLeft <= 1;
                  const submissionCount = hw._count?.submissions ?? hw.submissions?.length ?? 0;
                  return (
                    <Card key={hw.id} className={`hover:shadow-md transition-shadow ${isUrgent ? 'border-orange-300 dark:border-orange-700' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`p-2.5 rounded-xl mt-0.5 ${isUrgent ? 'bg-orange-500/10' : 'bg-primary/10'}`}>
                              {isUrgent ? <Clock className="h-5 w-5 text-orange-500" /> : <BookMarked className="h-5 w-5 text-primary" />}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold">{hw.title}</p>
                              {hw.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{hw.description}</p>}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {hw.subject && <Badge variant="outline" className="text-xs">{hw.subject.name}</Badge>}
                                {hw.class && <Badge variant="secondary" className="text-xs">{hw.class.name}</Badge>}
                                <span className={`text-xs flex items-center gap-1 ${isUrgent ? 'text-orange-500 font-medium' : 'text-muted-foreground'}`}>
                                  <Calendar className="h-3 w-3" />
                                  {new Date(hw.dueDate).toLocaleDateString('uz-UZ')}
                                  {isUrgent && daysLeft === 0 ? ' (Bugun!)' : isUrgent ? ' (Ertaga!)' : ''}
                                </span>
                                {(isTeacher || isAdmin) && submissionCount > 0 && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Users className="h-3 w-3" /> {submissionCount} ta topshirilgan
                                  </span>
                                )}
                              </div>
                              {isStudent && submittingId === hw.id && (
                                <div className="mt-3 space-y-2">
                                  <Textarea
                                    value={submitText}
                                    onChange={e => setSubmitText(e.target.value)}
                                    placeholder="Javobingizni yozing (ixtiyoriy)..."
                                    className="min-h-[80px] text-sm"
                                  />
                                  {/* File upload */}
                                  <div className="flex items-center gap-2">
                                    <input
                                      ref={fileInputRef}
                                      type="file"
                                      className="hidden"
                                      accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.xlsx,.csv"
                                      onChange={e => setSubmitFile(e.target.files?.[0] ?? null)}
                                    />
                                    {submitFile ? (
                                      <div className="flex items-center gap-1.5 text-xs rounded-md border px-2.5 py-1.5 bg-muted/50 flex-1 min-w-0">
                                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <span className="truncate">{submitFile.name}</span>
                                        <button
                                          onClick={() => { setSubmitFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                          className="ml-auto shrink-0 text-muted-foreground hover:text-destructive"
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="h-8 text-xs">
                                        <Paperclip className="mr-1 h-3.5 w-3.5" /> Fayl biriktirish
                                      </Button>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleStudentSubmit(hw.id)}
                                      disabled={(!submitText.trim() && !submitFile) || submitMutation.isPending || uploading}
                                    >
                                      {(submitMutation.isPending || uploading) && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                                      <Send className="mr-1 h-3.5 w-3.5" /> Topshirish
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => { setSubmittingId(null); setSubmitText(''); setSubmitFile(null); }}>Bekor</Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                            {isStudent && submittingId !== hw.id && (() => {
                              const mySubmission = (hw.submissions ?? []).find((s: any) => s.studentId === user?.id) ?? ((hw.submissions ?? []).length > 0 && !hw._count ? hw.submissions[0] : null);
                              const alreadySubmitted = !!mySubmission || (hw._count?.submissions > 0 && isStudent);
                              return alreadySubmitted ? (
                                <Button size="sm" variant="outline" className="text-green-600 border-green-400" onClick={() => setViewSubmissionHw(hw)}>
                                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Natijam
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => setSubmittingId(hw.id)}>
                                  <Send className="mr-1 h-3.5 w-3.5" /> Topshirish
                                </Button>
                              );
                            })()}
                            {(isTeacher || isAdmin) && (
                              <Button size="sm" variant="outline" onClick={() => setGradingHw(hw)}>
                                <FileCheck className="mr-1 h-3.5 w-3.5" /> Topshiriqlar
                                {submissionCount > 0 && (
                                  <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                                    {submissionCount}
                                  </Badge>
                                )}
                                <ChevronRight className="ml-1 h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {expired.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Muddati o'tgan</h2>
              <div className="space-y-2 opacity-70">
                {expired.map((hw: any) => {
                  const submissionCount = hw._count?.submissions ?? hw.submissions?.length ?? 0;
                  return (
                    <Card key={hw.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm line-through">{hw.title}</span>
                          {hw.subject && <Badge variant="outline" className="text-xs">{hw.subject.name}</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{new Date(hw.dueDate).toLocaleDateString('uz-UZ')}</span>
                          {(isTeacher || isAdmin) && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setGradingHw(hw)}>
                              <FileCheck className="mr-1 h-3 w-3" /> {submissionCount} ta
                            </Button>
                          )}
                          {isStudent && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setViewSubmissionHw(hw)}>
                              <FileCheck className="mr-1 h-3 w-3" /> Natijam
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create homework modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi uy vazifasi qo'shish</DialogTitle>
            <DialogDescription>O'quvchilarga uy vazifasi bering</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Sarlavha <span className="text-destructive">*</span></Label>
              <Input placeholder="Masalan: §5 mashqlar" value={form.title} onChange={inp('title')} />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sinf <span className="text-destructive">*</span></Label>
                <Select value={form.classId} onValueChange={sel('classId')}>
                  <SelectTrigger><SelectValue placeholder="Sinf..." /></SelectTrigger>
                  <SelectContent>{(classes as any[]).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                {errors.classId && <p className="text-xs text-destructive">{errors.classId}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Fan <span className="text-destructive">*</span></Label>
                <Select value={form.subjectId} onValueChange={sel('subjectId')}>
                  <SelectTrigger><SelectValue placeholder="Fan..." /></SelectTrigger>
                  <SelectContent>{(subjects as any[]).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
                {errors.subjectId && <p className="text-xs text-destructive">{errors.subjectId}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Topshirish muddati <span className="text-destructive">*</span></Label>
              <Input type="datetime-local" value={form.dueDate} onChange={inp('dueDate')} />
              {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Tavsif / Topshiriq matni</Label>
              <Textarea placeholder="Vazifa haqida batafsil ma'lumot..." value={form.description} onChange={inp('description')} className="min-h-[80px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Qo'shish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submissions grading dialog */}
      {gradingHw && (
        <SubmissionsDialog
          homework={gradingHw}
          open={!!gradingHw}
          onClose={() => setGradingHw(null)}
        />
      )}

      {/* Student: my submission dialog */}
      {viewSubmissionHw && (
        <MySubmissionDialog
          homeworkId={viewSubmissionHw.id}
          homeworkTitle={viewSubmissionHw.title}
          open={!!viewSubmissionHw}
          onClose={() => setViewSubmissionHw(null)}
        />
      )}
    </div>
  );
}
