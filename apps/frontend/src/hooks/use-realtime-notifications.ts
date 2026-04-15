'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from './use-socket';
import { useAuthStore } from '@/store/auth.store';

/**
 * useRealtimeNotifications
 *
 * Connects to the root '/' namespace (NestJS EventsGateway) and:
 * 1. Invalidates TanStack Query caches when server emits relevant events
 * 2. Re-exports the socket for further use
 *
 * Mount this hook once in the authenticated layout.
 */
export function useRealtimeNotifications() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Backend EventsGateway runs on the ROOT namespace '/'
  // (not '/notifications' — only one gateway exists in NestJS backend)
  const { emit, on } = useSocket({
    namespace: '/',
    enabled: !!user,
  });

  useEffect(() => {
    // New notification arrived → refresh notification list
    const offNotif = on('notification:new', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    // New message → refresh message thread
    const offMsg = on('message:new', () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    });

    // Schedule changed (e.g., teacher posted update) → refresh schedule
    const offSchedule = on('schedule:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    });

    // Attendance marked → refresh attendance cache
    const offAttendance = on('attendance:marked', () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    });

    // Grade added → refresh grades
    const offGrade = on('grade:created', () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
    });

    return () => {
      offNotif?.();
      offMsg?.();
      offSchedule?.();
      offAttendance?.();
      offGrade?.();
    };
  }, [on, queryClient]);

  return { emit };
}
