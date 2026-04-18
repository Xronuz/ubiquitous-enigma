import Link from 'next/link';
import { GraduationCap, MoveLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-2 text-primary">
        <GraduationCap className="h-8 w-8" />
        <span className="text-xl font-bold">EduPlatform</span>
      </div>

      {/* 404 illustration */}
      <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-muted">
        <Search className="h-16 w-16 text-muted-foreground opacity-40" />
      </div>

      {/* Text */}
      <h1 className="mb-2 text-5xl font-extrabold text-foreground">404</h1>
      <p className="mb-1 text-xl font-semibold text-foreground">Sahifa topilmadi</p>
      <p className="mb-8 max-w-sm text-sm text-muted-foreground">
        Siz qidirgan sahifa mavjud emas, ko'chirilgan yoki o'chirilgan bo'lishi mumkin.
      </p>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="default">
          <Link href="/dashboard">
            <MoveLeft className="mr-2 h-4 w-4" />
            Dashboardga qaytish
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Tizimga kirish</Link>
        </Button>
      </div>
    </div>
  );
}
