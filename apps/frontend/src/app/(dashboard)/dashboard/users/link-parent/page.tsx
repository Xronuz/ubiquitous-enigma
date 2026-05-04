'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Link2,
  Users,
  Loader2,
  UserCheck,
  GraduationCap,
  Heart,
  ArrowLeft,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { usersApi } from '@/lib/api/users';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { getInitials } from '@/lib/utils';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone?: string;
  isActive?: boolean;
  children?: User[];
}

// ─── Guard ────────────────────────────────────────────────────────────────────
function useRoleGuard() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;
    const allowed = ['director', 'vice_principal'];
    if (!allowed.includes(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (!user) return true; // still loading
  return !['director', 'vice_principal'].includes(user.role);
}

// ─── Debounce hook ────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LinkParentPage() {
  const isRedirecting = useRoleGuard();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // search state
  const [parentSearch, setParentSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const debouncedParentSearch = useDebounce(parentSearch);
  const debouncedStudentSearch = useDebounce(studentSearch);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<User | null>(null);
  const [checkedStudents, setCheckedStudents] = useState<Set<string>>(new Set());
  const [modalStudentSearch, setModalStudentSearch] = useState('');
  const debouncedModalStudentSearch = useDebounce(modalStudentSearch);
  const [linking, setLinking] = useState(false);

  // ── Fetch parents ────────────────────────────────────────────────────────────
  const { data: parentsData, isLoading: parentsLoading } = useQuery({
    queryKey: ['users-parents', debouncedParentSearch],
    queryFn: () =>
      usersApi.getAll({ role: 'parent', limit: 50, search: debouncedParentSearch || undefined }),
  });

  // ── Fetch students (right panel) ─────────────────────────────────────────────
  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['users-students', debouncedStudentSearch],
    queryFn: () =>
      usersApi.getAll({ role: 'student', limit: 100, search: debouncedStudentSearch || undefined }),
  });

  // ── Fetch ALL students for modal (no search filter, full list) ──────────────
  const { data: allStudentsData, isLoading: allStudentsLoading } = useQuery({
    queryKey: ['users-students-all'],
    queryFn: () => usersApi.getAll({ role: 'student', limit: 200 }),
    enabled: modalOpen,
  });

  const parents: User[] = parentsData?.data ?? [];
  const students: User[] = studentsData?.data ?? [];
  const allStudents: User[] = allStudentsData?.data ?? [];

  // filter modal students by search
  const filteredModalStudents = allStudents.filter((s) => {
    if (!debouncedModalStudentSearch) return true;
    const q = debouncedModalStudentSearch.toLowerCase();
    return (
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  });

  // ── Open modal ───────────────────────────────────────────────────────────────
  const openModal = useCallback((parent: User) => {
    setSelectedParent(parent);
    setCheckedStudents(new Set());
    setModalStudentSearch('');
    setModalOpen(true);
  }, []);

  // ── Toggle student selection ─────────────────────────────────────────────────
  const toggleStudent = (id: string) => {
    setCheckedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Link mutation ─────────────────────────────────────────────────────────────
  const handleLink = async () => {
    if (!selectedParent || checkedStudents.size === 0) return;

    setLinking(true);
    const ids = Array.from(checkedStudents);
    let successCount = 0;
    let errorCount = 0;

    for (const studentId of ids) {
      try {
        await usersApi.linkParentStudent(selectedParent.id, studentId);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setLinking(false);

    if (successCount > 0) {
      toast({
        title: `✅ ${successCount} ta o'quvchi bog'landi`,
        description:
          errorCount > 0 ? `${errorCount} ta bog'lashda xato yuz berdi` : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['users-parents'] });
      queryClient.invalidateQueries({ queryKey: ['users-students'] });
      queryClient.invalidateQueries({ queryKey: ['users-students-all'] });
    } else {
      toast({
        variant: 'destructive',
        title: 'Xato',
        description: "Bog'lashda xatolik yuz berdi",
      });
    }

    setModalOpen(false);
    setSelectedParent(null);
    setCheckedStudents(new Set());
  };

  if (isRedirecting) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/users">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Link2 className="h-6 w-6 text-primary" />
              Ota-ona — O'quvchi bog'lash
            </h1>
            <p className="text-muted-foreground text-sm">
              Ota-onalarni farzandlari (o'quvchilar) bilan bog'lang
            </p>
          </div>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left Panel: Parents ── */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-4 w-4 text-pink-500" />
              Ota-onalar ro'yxati
              {parentsData?.meta && (
                <Badge variant="secondary" className="ml-auto text-xs font-normal">
                  {parentsData.meta.total} ta
                </Badge>
              )}
            </CardTitle>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ota-ona qidirish..."
                className="pl-9 h-9 text-sm"
                value={parentSearch}
                onChange={(e) => setParentSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto max-h-[500px] space-y-2 pt-0">
            {parentsLoading ? (
              <ParentSkeletons />
            ) : parents.length === 0 ? (
              <EmptyState icon={<Heart className="h-8 w-8 opacity-30" />} text="Ota-onalar topilmadi" />
            ) : (
              parents.map((parent) => (
                <ParentCard
                  key={parent.id}
                  parent={parent}
                  onLink={() => openModal(parent)}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* ── Right Panel: Students ── */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4 text-blue-500" />
              O'quvchilar ro'yxati
              {studentsData?.meta && (
                <Badge variant="secondary" className="ml-auto text-xs font-normal">
                  {studentsData.meta.total} ta
                </Badge>
              )}
            </CardTitle>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="O'quvchi qidirish..."
                className="pl-9 h-9 text-sm"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto max-h-[500px] space-y-2 pt-0">
            {studentsLoading ? (
              <StudentSkeletons />
            ) : students.length === 0 ? (
              <EmptyState icon={<GraduationCap className="h-8 w-8 opacity-30" />} text="O'quvchilar topilmadi" />
            ) : (
              students.map((student) => (
                <StudentCard key={student.id} student={student} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Info Section ── */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-muted-foreground">
            <Info className="h-4 w-4" />
            Bog'langan juftliklar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/40 text-sm text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-primary/60" />
            <p>
              Bog'lashni boshqarish uchun yuqorida ota-ona yonidagi{' '}
              <span className="font-medium text-foreground">"Bog'lash"</span> tugmasini bosing va
              farzandini tanlang. Har bir ota-ona bir nechta o'quvchi bilan bog'lanishi mumkin.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Linking Modal ── */}
      <Dialog
        open={modalOpen}
        onOpenChange={(v) => {
          if (!v && !linking) {
            setModalOpen(false);
            setSelectedParent(null);
            setCheckedStudents(new Set());
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              O'quvchi bog'lash
            </DialogTitle>
            <DialogDescription>
              {selectedParent && (
                <span className="flex items-center gap-2 mt-1">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {getInitials(selectedParent.firstName, selectedParent.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">
                    {selectedParent.firstName} {selectedParent.lastName}
                  </span>
                  <span className="text-muted-foreground">uchun farzand tanlang</span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Modal student search */}
          <div className="relative my-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="O'quvchi qidirish..."
              className="pl-9 h-9 text-sm"
              value={modalStudentSearch}
              onChange={(e) => setModalStudentSearch(e.target.value)}
            />
          </div>

          {/* Student checkable list */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
            {allStudentsLoading ? (
              <ModalSkeletons />
            ) : filteredModalStudents.length === 0 ? (
              <EmptyState
                icon={<GraduationCap className="h-8 w-8 opacity-30" />}
                text="O'quvchilar topilmadi"
              />
            ) : (
              filteredModalStudents.map((student) => {
                const checked = checkedStudents.has(student.id);
                return (
                  <label
                    key={student.id}
                    htmlFor={`student-${student.id}`}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <Checkbox
                      id={`student-${student.id}`}
                      checked={checked}
                      onCheckedChange={() => toggleStudent(student.id)}
                    />
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs font-medium">
                        {getInitials(student.firstName, student.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                    </div>
                    {checked && (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </label>
                );
              })
            )}
          </div>

          <DialogFooter className="gap-2 pt-2 border-t mt-2">
            <div className="flex items-center gap-1 mr-auto text-xs text-muted-foreground">
              {checkedStudents.size > 0 && (
                <Badge variant="secondary">{checkedStudents.size} ta tanlandi</Badge>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setModalOpen(false);
                setSelectedParent(null);
                setCheckedStudents(new Set());
              }}
              disabled={linking}
            >
              Bekor qilish
            </Button>
            <Button
              onClick={handleLink}
              disabled={linking || checkedStudents.size === 0}
            >
              {linking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saqlanmoqda...
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Saqlash
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ParentCard({ parent, onLink }: { parent: User; onLink: () => void }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border hover:shadow-sm transition-shadow bg-card">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="text-xs font-medium bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
          {getInitials(parent.firstName, parent.lastName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {parent.firstName} {parent.lastName}
        </p>
        <p className="text-xs text-muted-foreground truncate">{parent.email}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge
          variant="outline"
          className="text-xs border-pink-300 text-pink-600 dark:border-pink-700 dark:text-pink-400 hidden sm:inline-flex"
        >
          Ota-ona
        </Badge>
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={onLink}>
          <Link2 className="h-3.5 w-3.5" />
          Bog'lash
        </Button>
      </div>
    </div>
  );
}

function StudentCard({ student }: { student: User }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {getInitials(student.firstName, student.lastName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {student.firstName} {student.lastName}
        </p>
        <p className="text-xs text-muted-foreground truncate">{student.email}</p>
      </div>
      <Badge
        variant="outline"
        className="text-xs border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400 shrink-0 hidden sm:inline-flex"
      >
        O'quvchi
      </Badge>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
      {icon}
      <p className="text-sm">{text}</p>
    </div>
  );
}

function ParentSkeletons() {
  return (
    <>
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-lg w-full" />
      ))}
    </>
  );
}

function StudentSkeletons() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-lg w-full" />
      ))}
    </>
  );
}

function ModalSkeletons() {
  return (
    <>
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-lg w-full" />
      ))}
    </>
  );
}
