'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bus, Plus, MapPin, Clock, Users, Pencil, Trash2, Loader2,
  ChevronRight, UserPlus, X, Phone, Car, ToggleLeft, ToggleRight,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { transportApi, TransportRoute, CreateRouteDto } from '@/lib/api/transport';
import { usersApi } from '@/lib/api/users';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/use-toast';

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMPTY_ROUTE: CreateRouteDto = {
  name: '',
  description: '',
  stops: [],
  departureTime: '07:30',
  arrivalTime: '08:15',
  driverName: '',
  driverPhone: '',
  vehicleNumber: '',
  capacity: 30,
  isActive: true,
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TransportPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canManage = ['school_admin', 'vice_principal'].includes(user?.role ?? '');
  const isStudentOrParent = ['student', 'parent'].includes(user?.role ?? '');

  // ── State ─────────────────────────────────────────────────────────────────
  const [routeOpen, setRouteOpen] = useState(false);
  const [editRoute, setEditRoute] = useState<TransportRoute | null>(null);
  const [routeForm, setRouteForm] = useState<CreateRouteDto>(EMPTY_ROUTE);
  const [stopsInput, setStopsInput] = useState('');
  const [routeErrors, setRouteErrors] = useState<Record<string, string>>({});

  const [detailRouteId, setDetailRouteId] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignRouteId, setAssignRouteId] = useState<string | null>(null);
  const [assignStudentId, setAssignStudentId] = useState('');
  const [assignStop, setAssignStop] = useState('');

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: stats } = useQuery({
    queryKey: ['transport', 'stats'],
    queryFn: transportApi.getStats,
    enabled: canManage,
  });

  const { data: routes = [], isLoading } = useQuery({
    queryKey: ['transport', 'routes'],
    queryFn: transportApi.getRoutes,
    enabled: !isStudentOrParent,
  });

  const { data: myRoute, isLoading: myRouteLoading } = useQuery({
    queryKey: ['transport', 'my-route'],
    queryFn: transportApi.getMyRoute,
    enabled: isStudentOrParent,
  });

  const { data: detailRoute, isLoading: detailLoading } = useQuery({
    queryKey: ['transport', 'route', detailRouteId],
    queryFn: () => transportApi.getRoute(detailRouteId!),
    enabled: !!detailRouteId,
  });

  const { data: studentsData } = useQuery({
    queryKey: ['users', 'students'],
    queryFn: () => usersApi.getAll({ page: 1, limit: 200 }),
    enabled: assignOpen,
  });
  const allStudents = (studentsData?.data ?? []).filter((u: any) => u.role === 'student');

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: transportApi.createRoute,
    onSuccess: () => {
      toast({ title: '✅ Marshrut qo\'shildi' });
      queryClient.invalidateQueries({ queryKey: ['transport'] });
      setRouteOpen(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateRouteDto> }) =>
      transportApi.updateRoute(id, data),
    onSuccess: () => {
      toast({ title: '✅ Marshrut yangilandi' });
      queryClient.invalidateQueries({ queryKey: ['transport'] });
      setRouteOpen(false);
      setEditRoute(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: transportApi.deleteRoute,
    onSuccess: () => {
      toast({ title: 'Marshrut o\'chirildi' });
      queryClient.invalidateQueries({ queryKey: ['transport'] });
      if (detailRouteId) setDetailRouteId(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ routeId, studentId, stopName }: { routeId: string; studentId: string; stopName?: string }) =>
      transportApi.assignStudent(routeId, { studentId, stopName }),
    onSuccess: () => {
      toast({ title: '✅ O\'quvchi biriktirildi' });
      queryClient.invalidateQueries({ queryKey: ['transport'] });
      setAssignOpen(false);
      setAssignStudentId('');
      setAssignStop('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({ routeId, studentId }: { routeId: string; studentId: string }) =>
      transportApi.removeStudent(routeId, studentId),
    onSuccess: () => {
      toast({ title: 'O\'quvchi olib tashlandi' });
      queryClient.invalidateQueries({ queryKey: ['transport'] });
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditRoute(null);
    setRouteForm(EMPTY_ROUTE);
    setStopsInput('');
    setRouteErrors({});
    setRouteOpen(true);
  };

  const openEdit = (route: TransportRoute) => {
    setEditRoute(route);
    setRouteForm({
      name: route.name,
      description: route.description ?? '',
      stops: route.stops ?? [],
      departureTime: route.departureTime,
      arrivalTime: route.arrivalTime,
      driverName: route.driverName ?? '',
      driverPhone: route.driverPhone ?? '',
      vehicleNumber: route.vehicleNumber ?? '',
      capacity: route.capacity,
      isActive: route.isActive,
    });
    setStopsInput((route.stops ?? []).join(', '));
    setRouteErrors({});
    setRouteOpen(true);
  };

  const validateRoute = () => {
    const e: Record<string, string> = {};
    if (!routeForm.name.trim()) e.name = 'Marshrut nomi kiriting';
    if (!routeForm.departureTime) e.departureTime = 'Jo\'nash vaqtini kiriting';
    if (!routeForm.arrivalTime) e.arrivalTime = 'Yetib kelish vaqtini kiriting';
    setRouteErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveRoute = () => {
    if (!validateRoute()) return;
    const stops = stopsInput.split(',').map(s => s.trim()).filter(Boolean);
    const payload = { ...routeForm, stops };
    if (editRoute) {
      updateMutation.mutate({ id: editRoute.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

  // ── Student / Parent view ─────────────────────────────────────────────────
  if (isStudentOrParent) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bus className="h-6 w-6 text-primary" /> Transport
          </h1>
          <p className="text-muted-foreground">Mening avtobus marshrутim</p>
        </div>

        {myRouteLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        ) : !myRoute ? (
          <Card>
            <CardContent className="py-16 text-center space-y-2">
              <Bus className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground font-medium">Siz hali hech qanday avtobus marshrutiga biriktirilmagansiz</p>
              <p className="text-sm text-muted-foreground">
                Marshrut qo&apos;shish uchun sinf rahbaringiz yoki maktab administratoriga murojaat qiling
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Route info card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Car className="h-4 w-4 text-primary" /> {myRoute.name}
                  </CardTitle>
                  <Badge variant={myRoute.isActive ? 'success' : 'secondary'}>
                    {myRoute.isActive ? 'Faol' : 'Nofaol'}
                  </Badge>
                </div>
                {myRoute.description && (
                  <CardDescription>{myRoute.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Jo&apos;nash</p>
                      <p className="font-medium">{myRoute.departureTime}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Yetib kelish</p>
                      <p className="font-medium">{myRoute.arrivalTime}</p>
                    </div>
                  </div>
                </div>
                {(myRoute.driverName || myRoute.vehicleNumber) && (
                  <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                    {myRoute.driverName && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Haydovchi:</span>
                        <span className="font-medium">{myRoute.driverName}</span>
                      </div>
                    )}
                    {myRoute.driverPhone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <a href={`tel:${myRoute.driverPhone}`} className="text-primary hover:underline font-medium">
                          {myRoute.driverPhone}
                        </a>
                      </div>
                    )}
                    {myRoute.vehicleNumber && (
                      <div className="flex items-center gap-2 text-sm">
                        <Car className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Avtobus:</span>
                        <span className="font-medium">{myRoute.vehicleNumber}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stops */}
            {myRoute.stops && myRoute.stops.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" /> Bekatlar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {myRoute.stops.map((stop: string, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full border-2 ${i === 0 ? 'bg-green-500 border-green-500' : i === myRoute.stops.length - 1 ? 'bg-red-500 border-red-500' : 'bg-primary border-primary'}`} />
                          {i < myRoute.stops.length - 1 && <div className="w-0.5 h-5 bg-border mt-0.5" />}
                        </div>
                        <span className="text-sm pb-5">{stop}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bus className="h-6 w-6 text-teal-500" /> Transport
          </h1>
          <p className="text-muted-foreground">Avtobus marshrutlari va o&apos;quvchilar tashish</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Marshrut qo&apos;shish
          </Button>
        )}
      </div>

      {/* Stats */}
      {canManage && stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Jami marshrutlar', value: stats.totalRoutes, icon: Bus, color: 'text-teal-500', bg: 'bg-teal-500/10' },
            { label: 'Faol marshrutlar', value: stats.activeRoutes, icon: ToggleRight, color: 'text-green-500', bg: 'bg-green-500/10' },
            { label: 'Biriktirilgan o\'quvchilar', value: stats.totalAssigned, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
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

      {/* Routes list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (routes as TransportRoute[]).length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bus className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">Marshrut mavjud emas</p>
            {canManage && (
              <Button variant="outline" className="mt-4" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Marshrut qo&apos;shish
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(routes as TransportRoute[]).map(route => (
            <Card
              key={route.id}
              className={`cursor-pointer hover:shadow-md transition-shadow ${!route.isActive ? 'opacity-60' : ''}`}
              onClick={() => setDetailRouteId(route.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bus className="h-4 w-4 text-teal-500" />
                    {route.name}
                  </CardTitle>
                  <Badge variant={route.isActive ? 'success' : 'secondary'}>
                    {route.isActive ? 'Faol' : 'Nofaol'}
                  </Badge>
                </div>
                {route.description && (
                  <CardDescription className="text-xs line-clamp-1">{route.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {route.departureTime} → {route.arrivalTime}
                </div>
                {route.driverName && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Car className="h-3.5 w-3.5" />
                    {route.driverName}
                    {route.vehicleNumber && <span className="text-xs opacity-60">· {route.vehicleNumber}</span>}
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <Users className="h-3.5 w-3.5" />
                    {route.studentCount ?? 0}/{route.capacity} ta
                  </div>
                  {(route.stops as string[]).length > 0 && (
                    <div className="flex gap-1 flex-wrap justify-end">
                      {(route.stops as string[]).slice(0, 2).map((stop, i) => (
                        <span key={i} className="text-xs bg-muted px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" />{stop}
                        </span>
                      ))}
                      {(route.stops as string[]).length > 2 && (
                        <span className="text-xs text-muted-foreground">+{(route.stops as string[]).length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
                {canManage && (
                  <div className="flex gap-2 pt-2 border-t" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" className="h-7 text-xs flex-1"
                      onClick={() => openEdit(route)}>
                      <Pencil className="mr-1 h-3 w-3" /> Tahrirlash
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs flex-1 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm(`"${route.name}" marshrutini o'chirasizmi?`)) deleteMutation.mutate(route.id);
                      }}
                      disabled={deleteMutation.isPending}>
                      <Trash2 className="mr-1 h-3 w-3" /> O&apos;chirish
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Route detail dialog ──────────────────────────────────────────────── */}
      <Dialog open={!!detailRouteId} onOpenChange={v => { if (!v) setDetailRouteId(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detailLoading ? (
            <div className="space-y-3 py-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : detailRoute ? (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2">
                    <Bus className="h-5 w-5 text-teal-500" /> {detailRoute.name}
                  </DialogTitle>
                  <Badge variant={detailRoute.isActive ? 'success' : 'secondary'}>
                    {detailRoute.isActive ? 'Faol' : 'Nofaol'}
                  </Badge>
                </div>
                <DialogDescription>
                  {detailRoute.departureTime} → {detailRoute.arrivalTime}
                  {detailRoute.driverName && ` · ${detailRoute.driverName}`}
                </DialogDescription>
              </DialogHeader>

              {/* Stops */}
              {(detailRoute.stops as string[]).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Bekatlar</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(detailRoute.stops as string[]).map((stop, i) => (
                      <span key={i} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                        <MapPin className="h-2.5 w-2.5 text-teal-500" /> {stop}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Students */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    O&apos;quvchilar ({(detailRoute.assignments ?? []).length}/{detailRoute.capacity})
                  </p>
                  {canManage && (
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => { setAssignRouteId(detailRoute.id); setAssignOpen(true); }}>
                      <UserPlus className="mr-1 h-3 w-3" /> Biriktirish
                    </Button>
                  )}
                </div>
                {(detailRoute.assignments ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">O&apos;quvchilar biriktirilmagan</p>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {(detailRoute.assignments ?? []).map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">{a.student?.firstName} {a.student?.lastName}</p>
                          {a.stopName && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5" /> {a.stopName}
                            </p>
                          )}
                        </div>
                        {canManage && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeMutation.mutate({ routeId: detailRoute.id, studentId: a.studentId })}
                            disabled={removeMutation.isPending}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ── Route create/edit dialog ─────────────────────────────────────────── */}
      <Dialog open={routeOpen} onOpenChange={setRouteOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editRoute ? 'Marshrutni tahrirlash' : 'Yangi marshrut'}</DialogTitle>
            <DialogDescription>Avtobus marshruti ma&apos;lumotlarini kiriting</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Marshrut nomi <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Masalan: 1-marshrut (Yunusobod)"
                value={routeForm.name}
                onChange={e => { setRouteForm(f => ({ ...f, name: e.target.value })); setRouteErrors(er => { const n = { ...er }; delete n.name; return n; }); }}
              />
              {routeErrors.name && <p className="text-xs text-destructive">{routeErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Tavsif</Label>
              <Textarea
                placeholder="Qisqacha tavsif..."
                rows={2}
                className="resize-none"
                value={routeForm.description}
                onChange={e => setRouteForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Jo&apos;nash vaqti <span className="text-destructive">*</span></Label>
                <Input
                  type="time"
                  value={routeForm.departureTime}
                  onChange={e => { setRouteForm(f => ({ ...f, departureTime: e.target.value })); setRouteErrors(er => { const n = { ...er }; delete n.departureTime; return n; }); }}
                />
                {routeErrors.departureTime && <p className="text-xs text-destructive">{routeErrors.departureTime}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Yetib kelish vaqti <span className="text-destructive">*</span></Label>
                <Input
                  type="time"
                  value={routeForm.arrivalTime}
                  onChange={e => { setRouteForm(f => ({ ...f, arrivalTime: e.target.value })); setRouteErrors(er => { const n = { ...er }; delete n.arrivalTime; return n; }); }}
                />
                {routeErrors.arrivalTime && <p className="text-xs text-destructive">{routeErrors.arrivalTime}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Bekatlar (vergul bilan ajrating)</Label>
              <Input
                placeholder="Yunusobod, Mirzo Ulug'bek, Maktab"
                value={stopsInput}
                onChange={e => setStopsInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Har bir bekat nomini vergul bilan ajrating</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Haydovchi ismi</Label>
                <Input
                  placeholder="Ism Familiya"
                  value={routeForm.driverName}
                  onChange={e => setRouteForm(f => ({ ...f, driverName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Haydovchi telefoni</Label>
                <Input
                  placeholder="+998 90 123 45 67"
                  value={routeForm.driverPhone}
                  onChange={e => setRouteForm(f => ({ ...f, driverPhone: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Avtobus raqami</Label>
                <Input
                  placeholder="01 A 123 AA"
                  value={routeForm.vehicleNumber}
                  onChange={e => setRouteForm(f => ({ ...f, vehicleNumber: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sig&apos;im (o&apos;rin)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={routeForm.capacity}
                  onChange={e => setRouteForm(f => ({ ...f, capacity: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Label>Marshrut holati</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`h-7 text-xs gap-1.5 ${routeForm.isActive ? 'text-green-600' : 'text-muted-foreground'}`}
                onClick={() => setRouteForm(f => ({ ...f, isActive: !f.isActive }))}
              >
                {routeForm.isActive
                  ? <><ToggleRight className="h-4 w-4" /> Faol</>
                  : <><ToggleLeft className="h-4 w-4" /> Nofaol</>}
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRouteOpen(false)}>Bekor</Button>
            <Button onClick={handleSaveRoute} disabled={isMutating}>
              {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editRoute ? 'Saqlash' : 'Qo\'shish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign student dialog ────────────────────────────────────────────── */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>O&apos;quvchi biriktirish</DialogTitle>
            <DialogDescription>Marshrutga o&apos;quvchi qo&apos;shish</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>O&apos;quvchi <span className="text-destructive">*</span></Label>
              <Select value={assignStudentId} onValueChange={setAssignStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="O'quvchi tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  {allStudents.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Bekat nomi (ixtiyoriy)</Label>
              <Input
                placeholder="Masalan: Yunusobod"
                value={assignStop}
                onChange={e => setAssignStop(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Bekor</Button>
            <Button
              onClick={() => {
                if (!assignStudentId) {
                  toast({ variant: 'destructive', title: 'O\'quvchi tanlang' });
                  return;
                }
                assignMutation.mutate({
                  routeId: assignRouteId!,
                  studentId: assignStudentId,
                  stopName: assignStop || undefined,
                });
              }}
              disabled={assignMutation.isPending}
            >
              {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Biriktirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
