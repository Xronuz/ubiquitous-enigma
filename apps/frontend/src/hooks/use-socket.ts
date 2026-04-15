'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3001';

type SocketEvent = string;
type EventCallback = (data: any) => void;

interface UseSocketOptions {
  /** Socket.io namespace, e.g. '/notifications' */
  namespace?: string;
  /** Only connect when enabled is true (default: true) */
  enabled?: boolean;
  /** Map of event → handler to subscribe on connect */
  handlers?: Record<SocketEvent, EventCallback>;
}

/**
 * useSocket — establishes a Socket.io connection using the current user's
 * JWT access token. Reconnects automatically when the token changes.
 *
 * @example
 * const { emit } = useSocket({
 *   namespace: '/notifications',
 *   handlers: {
 *     'notification:new': (data) => { ... },
 *   },
 * });
 */
export function useSocket({ namespace = '/', enabled = true, handlers = {} }: UseSocketOptions = {}) {
  const { accessToken } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (!accessToken || !enabled) return;

    // Disconnect existing socket before creating a new one
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(`${SOCKET_URL}${namespace}`, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Socket] Connected: ${namespace} (${socket.id})`);
      }
    });

    socket.on('disconnect', (reason) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Socket] Disconnected: ${namespace} — ${reason}`);
      }
    });

    socket.on('connect_error', (err) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Socket] Error: ${namespace} —`, err.message);
      }
    });

    // Register all provided event handlers
    Object.entries(handlers).forEach(([event, cb]) => {
      socket.on(event, cb);
    });

    socketRef.current = socket;
  }, [accessToken, enabled, namespace]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connect]);

  /** Emit an event to the server */
  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  /** Subscribe to an event; returns an unsubscribe function */
  const on = useCallback((event: string, callback: EventCallback) => {
    socketRef.current?.on(event, callback);
    return () => socketRef.current?.off(event, callback);
  }, []);

  return {
    socket: socketRef.current,
    emit,
    on,
    isConnected: socketRef.current?.connected ?? false,
  };
}
