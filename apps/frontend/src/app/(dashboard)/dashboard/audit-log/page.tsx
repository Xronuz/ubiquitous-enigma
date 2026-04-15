'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Shield, Search, ChevronLeft, ChevronRight, RefreshCw,
  Download, Clock, User, Eye, Plus, Pencil, Trash2,
  LogIn, LogOut, FileDown, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { auditLogApi, AuditAction, AuditLog } from '@/lib/api/audit-log';
import { useAuthStore } from '@/store/auth.store';
import { getInitials, formatDate } from '@/lib/utils';
import { useSocket } from '@/hooks/use-socket';

// ── Constants ─────────────────────────────────────────────────────────────────

const ACTION_CFG: Record<AuditAction, { label: string; color: string; icon: React.ReactNode }> = {
  create: {
    label: 'Yaratildi',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: <Plus className="h-3 w-3" />,
  },
  update: {
    label: "O'zgartirildi",
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: <Pencil className="h-3 w-3" />,
  },
  delete: {
    label: "O'chirildi",
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: <Trash2 className="h-3 w-3" />,
  },
  login: {
    label: 'Kirdi',
    color: 'bg-violet-100 text-violet-700 border-violet-200',
    icon: <LogIn className="h-3 w-3" />,
  },
  logout: {
    label: 'Chiqdi',
    color: 'bg-muted text-muted-foreground border-border',
    icon: <LogOut className="h-3 w-3" />,
  },
  export: {
    label: 'Eksport',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    icon: <FileDown className="h-3 w-3" />,
  },
};

const ENTITY_EMOJI: Record<string, string> = {
  User: '👤', Grade: '📊', Attendance: '✅', Payment: '💳',
  Exam: '📝', Homework: '📚', Schedule: '📅', Class: '🏫',
  Subject: '📖', FeeStructure: '💰', LeaveRequest: '🏖️',
  StaffSalary: '💵', MonthlyPayroll: '📋', Notification: '🔔',
};

const ENTITIES = [
  'User', 'Grade', 'Attendance', 'Payment', 'Exam', 'Homework',
  'Schedule', 'Class', 'Subject', 'FeeStructure', 'LeaveRequest',
  'StaffSalary', 'MonthlyPayroll',
];

// ── JSON Diff Viewer ──────────────────────────────────────────────────────────

function DiffViewer({ oldData, newData }: { oldData?: Record<string, any>; newData?: Record<string, any> }) {
  const allKeys = Array.from(new Set([
    ...Object.keys(oldData ?? {}),
    ...Object.keys(newData ?? {}),
  ]));

  if (allKeys.length === 0) return <p className="text-xs text-muted-foreground">Ma'lumot yo'q</p>;

  return (
    <div className="text-xs font-mono space-y-0.5">
      {allKeys.map(key => {
        const oldVal = oldData?.[key];
        const newVal = newData?.[key];
        const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
        const added = oldData === undefined || (oldVal === undefined && newVal !== undefined);
        const removed = newData === undefined || (newVal === undefined && oldVal !== undefined);

        return (
          <div
            key={key}
            className={`px-2 py-1 rounded text-xs grid grid-cols-[120px_1fr_1fr] gap-2 items-start
              ${changed && !added && !removed ? 'bg-yellow-50 border border-yellow-100' : ''}
              ${added ? 'bg-green-50 border border-green-100' : ''}
              ${removed ? 'bg-red-50 border border-red-100' : ''}
            `}
          >
            <span className="font-semibold text-foreground/70 truncate">{key}</span>
            <span className={`truncate ${removed || (changed && !added) ? 'line-through text-red-500' : 'text-muted-foreground'}`}>
              {oldVal !== undefined ? String(JSON.stringify(oldVal)).slice(0, 60) : '—'}
            </span>
            <span className={`truncate ${added || changed ? 'text-green-700 font-medium' : 'text-muted-foreground'}`}>
              {newVal !== undefined ? String(JSON.stringify(newVal)).slice(0, 60) : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Log Detail Modal ──────────────────────────────────────────────────────────

function LogDetailModal({ log, onClose }: { log: AuditLog | null; onClose: () => void }) {
  if (!log) return null;
  const cfg = ACTION_CFG[log.action];

  return (
    <Dialog open={!!log} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg">{ENTITY_EMOJI[log.entity] ?? '📋'}</span>
            {log.entity} — {cfg.label}
          </DialogTitle>
          <DialogDescription>
            {new Date(log.createdAt).toLocaleString('uz-UZ')}
            {log.entityId && <span className="ml-2 font-mono text-xs">ID: {log.entityId}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* User info */}
          {log.user && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-xs">
                  {getInitials(log.user.firstName, log.user.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium text-sm">{log.user.firstName} {log.user.lastName}</div>
                <div className="text-xs text-muted-foreground">{log.user.email} • {log.user.role}</div>
              </div>
              {log.ipAddress && (
                <div className="ml-auto text-xs text-muted-foreground font-mono">{log.ipAddress}</div>
              )}
            </div>
          )}

          {/* Diff view */}
          {(log.oldData || log.newData) && (
            <div className="space-y-2">
              <div className="grid grid-cols-[120px_1fr_1fr] gap-2 text-xs text-muted-foreground font-medium px-2">
                <span>Maydon</span>
                <span className="text-red-600">Eski qiymat</span>
                <span className="text-green-600">Yangi qiymat</span>
              </div>
              <Separator />
              <DiffViewer oldData={log.oldData} newData={log.newData} />
            </div>
          )}

          {/* Raw JSON */}
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Raw JSON ko'rish
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {log.oldData && (
                <div>
                  <p className="font-medium mb-1 text-red-600">Eski:</p>
                  <pre className="bg-muted p-2 rounded text-[10px] overflow-auto max-h-40">
                    {JSON.stringify(log.oldData, null, 2)}
                  </pre>
                </div>
              )}
              {log.newData && (
                <div>
                  <p className="font-medium mb-1 text-green-600">Yangi:</p>
                  <pre className="bg-muted p-2 rounded text-[10px] overflow-auto max-h-40">
                    {JSON.stringify(log.newData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </details>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isSuperAdmin = user?.role === 'super_admin';

  // ── Filters ───────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [userId, setUserId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ── Detail modal ──────────────────────────────────────────────────────────
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // ── Real-time (Socket.io) ─────────────────────────────────────────────────
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      // Birinchi sahifadagi loglar yangilansin
      if (page === 1) {
        queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      }
    };
    const unsubscribe = socket.on('audit:new', handler);
    return () => { unsubscribe?.(); };
  }, [socket, page, queryClient]);

  // ── Query ─────────────────────────────────────────────────────────────────
  const filters = {
    page,
    limit: 30,
    ...(entity && { entity }),
    ...(action && { action: action as AuditAction }),
    ...(userId && { userId }),
    ...(from && { from }),
    ...(to && { to }),
  };

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => isSuperAdmin
      ? auditLogApi.getAllLogs(filters)
      : auditLogApi.getSchoolLogs(filters),
    staleTime: 30_000,
  });

  const logs = data?.data ?? [];
  const meta = data?.meta;

  function resetFilters() {
    setEntity(''); setAction(''); setUserId(''); setFrom(''); setTo('');
    setPage(1);
  }

  const hasFilters = entity || action || userId || from || to;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Audit Log
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Tizimda kim, nima, qachon o&apos;zgartirdi — to&apos;liq tarix
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => auditLogApi.exportLogs({ entity, action: action as any, from, to })}
          >
            <Download className="h-4 w-4 mr-1.5" /> Excel
          </Button>
          <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Foydalanuvchi ID bo'yicha izlash..."
                className="pl-9"
                value={userId}
                onChange={e => { setUserId(e.target.value); setPage(1); }}
              />
            </div>
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(v => !v)}
            >
              {showFilters ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              Filtrlar
              {hasFilters && <Badge className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px]">!</Badge>}
            </Button>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="h-4 w-4 mr-1" /> Tozalash
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Entity */}
              <div className="space-y-1">
                <Label className="text-xs">Ob'ekt turi</Label>
                <Select value={entity} onValueChange={v => { setEntity(v === '_all' ? '' : v); setPage(1); }}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Barchasi" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Barchasi</SelectItem>
                    {ENTITIES.map(e => (
                      <SelectItem key={e} value={e}>
                        {ENTITY_EMOJI[e] ?? ''} {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action */}
              <div className="space-y-1">
                <Label className="text-xs">Amal turi</Label>
                <Select value={action} onValueChange={v => { setAction(v === '_all' ? '' : v); setPage(1); }}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Barchasi" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Barchasi</SelectItem>
                    {Object.entries(ACTION_CFG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* From */}
              <div className="space-y-1">
                <Label className="text-xs">Dan</Label>
                <Input
                  type="date"
                  className="h-9"
                  value={from}
                  onChange={e => { setFrom(e.target.value); setPage(1); }}
                />
              </div>

              {/* To */}
              <div className="space-y-1">
                <Label className="text-xs">Gacha</Label>
                <Input
                  type="date"
                  className="h-9"
                  value={to}
                  onChange={e => { setTo(e.target.value); setPage(1); }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Log list ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {isLoading ? 'Yuklanmoqda...' : `${meta?.total ?? 0} ta yozuv`}
            </CardTitle>
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span>{page} / {meta.totalPages}</span>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-px">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="px-4 py-3 flex gap-3 items-center">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center">
              <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Audit log topilmadi</p>
              {hasFilters && (
                <Button variant="link" onClick={resetFilters} className="mt-2">Filtrlarni tozalash</Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {logs.map(log => {
                const cfg = ACTION_CFG[log.action] ?? ACTION_CFG.update;
                const emoji = ENTITY_EMOJI[log.entity] ?? '📋';
                const hasData = log.oldData || log.newData;

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer group"
                    onClick={() => setSelectedLog(log)}
                  >
                    {/* Avatar */}
                    <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                      <AvatarFallback className="text-xs">
                        {log.user
                          ? getInitials(log.user.firstName, log.user.lastName)
                          : '?'}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {log.user
                            ? `${log.user.firstName} ${log.user.lastName}`
                            : 'Tizim'}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 h-4 gap-0.5 ${cfg.color}`}
                        >
                          {cfg.icon}
                          {cfg.label}
                        </Badge>
                        <span className="text-sm">
                          {emoji} <span className="font-medium">{log.entity}</span>
                          {log.entityId && (
                            <span className="text-muted-foreground text-xs ml-1">
                              #{log.entityId.slice(-6)}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(log.createdAt).toLocaleString('uz-UZ')}
                        </span>
                        {log.user?.role && (
                          <span className="text-xs text-muted-foreground">{log.user.role}</span>
                        )}
                        {log.ipAddress && (
                          <span className="text-xs text-muted-foreground font-mono">{log.ipAddress}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {hasData && (
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Pagination ── */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Oldingisi
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {meta.totalPages} sahifa ({meta.total} ta yozuv)
          </span>
          <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>
            Keyingisi <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* ── Log detail modal ── */}
      <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}
