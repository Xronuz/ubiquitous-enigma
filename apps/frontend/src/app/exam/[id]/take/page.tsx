'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Clock, ChevronLeft, ChevronRight, CheckCircle,
  AlertTriangle, Send, Loader2, BookOpen, CloudUpload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { onlineExamApi, StartSessionResponse } from '@/lib/api/online-exam';
import { examsApi } from '@/lib/api/exams';
import { useToast } from '@/components/ui/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
type Question = StartSessionResponse['questions'][number];

interface Answer {
  selectedOptionId?: string;
  textAnswer?: string;
}

// ── Timer ─────────────────────────────────────────────────────────────────────
function useTimer(durationMinutes: number | undefined, onExpire: () => void, onFiveMinWarn: () => void) {
  const [remaining, setRemaining] = useState<number | null>(
    durationMinutes ? durationMinutes * 60 : null,
  );
  const expiredRef = useRef(false);
  const fiveMinWarnedRef = useRef(false);

  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0 && !expiredRef.current) {
      expiredRef.current = true;
      onExpire();
      return;
    }
    if (remaining <= 300 && !fiveMinWarnedRef.current) {
      fiveMinWarnedRef.current = true;
      onFiveMinWarn();
    }
    const id = setInterval(() => setRemaining(r => (r !== null ? r - 1 : null)), 1000);
    return () => clearInterval(id);
  }, [remaining, onExpire, onFiveMinWarn]);

  const fmt = remaining !== null
    ? `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`
    : null;

  const urgent = remaining !== null && remaining < 120;
  return { fmt, urgent, remaining };
}

// ── Start Screen ──────────────────────────────────────────────────────────────
function StartScreen({
  examTitle,
  duration,
  questionCount,
  maxScore,
  onStart,
  loading,
}: {
  examTitle: string;
  duration?: number;
  questionCount: number;
  maxScore: number;
  onStart: () => void;
  loading: boolean;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 p-3 bg-primary/10 rounded-full w-fit">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">{examTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-2xl font-bold">{questionCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Savol</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-2xl font-bold">{duration ?? '∞'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Daqiqa</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-2xl font-bold">{maxScore}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Ball</p>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
            <p className="font-medium flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Diqqat
            </p>
            <ul className="list-disc list-inside space-y-0.5 ml-1">
              <li>Imtihon bir marta boshlanadi</li>
              {duration && <li>Vaqt tugasa imtihon avtomatik topshiriladi</li>}
              <li>Barcha javoblar avtomatik saqlanadi</li>
            </ul>
          </div>

          <Button className="w-full" size="lg" onClick={onStart} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            Imtihonni boshlash
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Result Screen ─────────────────────────────────────────────────────────────
function ResultScreen({
  score,
  total,
  percentage,
  questionCount,
  onClose,
}: {
  score: number;
  total: number;
  percentage: number;
  questionCount: number;
  onClose: () => void;
}) {
  const passed = percentage >= 50;
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 pb-8 space-y-5">
          <div className={`mx-auto p-4 rounded-full w-fit ${passed ? 'bg-green-100 dark:bg-green-950/40' : 'bg-red-100 dark:bg-red-950/40'}`}>
            {passed
              ? <CheckCircle className="h-10 w-10 text-green-600" />
              : <AlertTriangle className="h-10 w-10 text-red-500" />}
          </div>

          <div>
            <h2 className="text-2xl font-bold">
              {passed ? 'Tabriklaymiz! 🎉' : "Afsuski o'tmadingiz"}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {passed ? "Imtihonni muvaffaqiyatli topshirdingiz" : "Keyingi safar omad"}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Natija</span>
              <span className="font-bold">{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-3" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-2xl font-bold">{score} / {total}</p>
              <p className="text-xs text-muted-foreground">Ball</p>
            </div>
            <div className={`rounded-lg p-3 ${passed ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
              <p className={`text-2xl font-bold ${passed ? 'text-green-600' : 'text-red-500'}`}>
                {passed ? "O'tdi" : "O'tmadi"}
              </p>
              <p className="text-xs text-muted-foreground">Holat</p>
            </div>
          </div>

          <Button className="w-full" onClick={onClose}>Yopish</Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Exam Page ────────────────────────────────────────────────────────────
export default function ExamTakePage() {
  const { id: examId } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [phase, setPhase] = useState<'start' | 'taking' | 'result'>('start');
  const [sessionData, setSessionData] = useState<StartSessionResponse | null>(null);

  const { data: examInfo } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => examsApi.getOne(examId),
    enabled: phase === 'start',
  });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [result, setResult] = useState<{ score: number; total: number; percentage: number } | null>(null);

  const questions: Question[] = sessionData?.questions ?? [];
  const current: Question | undefined = questions[currentIdx];

  // ── Start session ─────────────────────────────────────────────────────────
  const startMut = useMutation({
    mutationFn: () => onlineExamApi.startSession(examId),
    onSuccess: (data) => {
      setSessionData(data);
      // Pre-fill answers if resuming
      setAnswers({});
      setCurrentIdx(0);
      setPhase('taking');
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      toast({ variant: 'destructive', title: msg ?? 'Imtihonni boshlashda xato' });
    },
  });

  // ── Save answer ───────────────────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: ({ questionId, answer }: { questionId: string; answer: Answer }) =>
      onlineExamApi.saveAnswer(sessionData!.session.id, {
        questionId,
        selectedOptionId: answer.selectedOptionId,
        textAnswer: answer.textAnswer,
      }),
  });

  // ── Submit ─────────────────────────────────────────────────────────────────
  const submitMut = useMutation({
    mutationFn: () => onlineExamApi.submitSession(sessionData!.session.id),
    onSuccess: (data) => {
      setResult({ score: data.score, total: data.total, percentage: data.percentage });
      setPhase('result');
    },
    onError: (e: any) => {
      toast({ variant: 'destructive', title: e?.response?.data?.message ?? 'Topshirishda xato' });
    },
  });

  // ── Timer expire ──────────────────────────────────────────────────────────
  const handleExpire = useCallback(() => {
    if (sessionData && phase === 'taking') {
      toast({ title: '⏰ Vaqt tugadi! Imtihon avtomatik topshirilmoqda...' });
      submitMut.mutate();
    }
  }, [sessionData, phase, submitMut, toast]);

  // ── 5 daqiqa ogohlantirish ────────────────────────────────────────────────
  const handleFiveMinWarn = useCallback(() => {
    toast({
      title: '⏰ 5 daqiqa qoldi!',
      description: 'Javoblaringizni tekshirib, imtihonni topshiring.',
      variant: 'destructive',
    });
  }, [toast]);

  const { fmt: timerFmt, urgent } = useTimer(
    sessionData?.exam.duration,
    handleExpire,
    handleFiveMinWarn,
  );

  // ── Answer handling ───────────────────────────────────────────────────────
  const setAnswer = useCallback((questionId: string, answer: Answer) => {
    setAnswers(prev => {
      const updated = { ...prev, [questionId]: answer };
      // Save to backend (fire and forget)
      saveMut.mutate({ questionId, answer });
      return updated;
    });
  }, [saveMut]);

  const answeredCount = Object.keys(answers).filter(id =>
    answers[id]?.selectedOptionId || answers[id]?.textAnswer
  ).length;

  // ── beforeunload warning ──────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'taking') return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [phase]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (phase === 'start' || !sessionData) {
    return (
      <StartScreen
        examTitle={examInfo?.title ?? `Imtihon #${examId.slice(-6)}`}
        duration={examInfo?.duration}
        questionCount={examInfo?._count?.questions ?? 0}
        maxScore={examInfo?.maxScore ?? 0}
        onStart={() => startMut.mutate()}
        loading={startMut.isPending}
      />
    );
  }

  if (phase === 'result' && result) {
    return (
      <ResultScreen
        score={result.score}
        total={result.total}
        percentage={result.percentage}
        questionCount={questions.length}
        onClose={() => router.push('/dashboard')}
      />
    );
  }

  if (!current) return null;

  const answer = answers[current.id] ?? {};
  const progress = questions.length > 0 ? ((currentIdx + 1) / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono text-sm">
            {currentIdx + 1} / {questions.length}
          </Badge>
          <div className="hidden sm:block">
            <Progress value={progress} className="w-32 h-2" />
          </div>
          <span className="text-xs text-muted-foreground hidden sm:block">
            {answeredCount} ta javob berildi
          </span>
          {/* Auto-save indicator */}
          <span className={`hidden sm:flex items-center gap-1 text-xs transition-all ${
            saveMut.isPending
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-green-600 dark:text-green-400'
          }`}>
            <CloudUpload className="h-3.5 w-3.5" />
            {saveMut.isPending ? 'Saqlanmoqda...' : 'Saqlandi'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {timerFmt && (
            <div className={`flex items-center gap-1.5 font-mono text-sm font-bold px-2 py-1 rounded-md ${
              urgent ? 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 animate-pulse' : 'bg-muted'
            }`}>
              <Clock className="h-3.5 w-3.5" />
              {timerFmt}
            </div>
          )}
          <Button
            size="sm"
            onClick={() => submitMut.mutate()}
            disabled={submitMut.isPending}
            className="gap-1.5"
          >
            {submitMut.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />}
            <span className="hidden sm:inline">Topshirish</span>
          </Button>
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 flex flex-col items-center px-4 py-6">
        <div className="w-full max-w-2xl space-y-4">
          {/* Question card */}
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-start gap-3">
                <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shrink-0">
                  {currentIdx + 1}
                </span>
                <div className="flex-1">
                  <div className="flex gap-2 mb-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {current.type === 'multiple_choice' && "Ko'p variantli"}
                      {current.type === 'true_false' && "To'g'ri/Noto'g'ri"}
                      {current.type === 'short_answer' && 'Qisqa javob'}
                      {current.type === 'essay' && 'Insho'}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">{current.points} ball</Badge>
                  </div>
                  <p className="text-base font-medium leading-relaxed">{current.text}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Answer options */}
          {(current.type === 'multiple_choice' || current.type === 'true_false') && (
            <div className="space-y-2">
              {current.options.map((opt, i) => {
                const selected = answer.selectedOptionId === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setAnswer(current.id, { selectedOptionId: opt.id })}
                    className={`w-full text-left rounded-lg border-2 p-4 transition-all ${
                      selected
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                        selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'
                      }`}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="text-sm">{opt.text}</span>
                      {selected && <CheckCircle className="ml-auto h-4 w-4 text-primary shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {(current.type === 'short_answer' || current.type === 'essay') && (
            <Textarea
              placeholder={current.type === 'essay' ? 'Javobingizni bu yerga yozing...' : 'Qisqa javob...'}
              rows={current.type === 'essay' ? 8 : 3}
              value={answer.textAnswer ?? ''}
              onChange={e => setAnswer(current.id, { textAnswer: e.target.value })}
              className="resize-none"
            />
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
              className="flex-1"
            >
              <ChevronLeft className="mr-1.5 h-4 w-4" /> Oldingi
            </Button>
            {currentIdx < questions.length - 1 ? (
              <Button
                onClick={() => setCurrentIdx(i => i + 1)}
                className="flex-1"
              >
                Keyingi <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => submitMut.mutate()}
                disabled={submitMut.isPending}
                className="flex-1 gap-1.5"
              >
                {submitMut.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Send className="h-4 w-4" />}
                Topshirish
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Question navigation grid (bottom) */}
      <div className="border-t bg-background px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs text-muted-foreground mb-2">Savollar:</p>
          <div className="flex flex-wrap gap-1.5">
            {questions.map((q, i) => {
              const hasAnswer = !!(answers[q.id]?.selectedOptionId || answers[q.id]?.textAnswer);
              const isCurrent = i === currentIdx;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(i)}
                  className={`w-8 h-8 rounded text-xs font-medium transition-all ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1'
                      : hasAnswer
                      ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
