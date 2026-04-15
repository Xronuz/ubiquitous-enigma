import { Skeleton } from '@/components/ui/skeleton';

export default function ScheduleLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      {/* Day tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-8 flex-1 rounded-lg" />
        ))}
      </div>
      {/* Time slots grid */}
      <div className="space-y-2">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex gap-3 items-stretch">
            <Skeleton className="h-16 w-16 rounded-lg shrink-0" />
            <Skeleton className="h-16 flex-1 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
