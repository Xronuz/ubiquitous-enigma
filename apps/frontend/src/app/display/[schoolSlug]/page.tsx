'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ScheduleItem {
  id: string;
  timeSlot: number;
  startTime: string;
  endTime: string;
  roomNumber?: string;
  subject: {
    id: string;
    name: string;
    teacher: { id: string; firstName: string; lastName: string };
  };
  class: { id: string; name: string; gradeLevel: number };
}

interface DisplayData {
  school: { id: string; name: string; slug: string; phone?: string };
  day: string;
  date: string;
  schedule: ScheduleItem[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3001';
const PUBLIC_API = `${API_URL}/api`;

const DAY_UZ: Record<string, string> = {
  MONDAY: 'Dushanba',
  TUESDAY: 'Seshanba',
  WEDNESDAY: 'Chorshanba',
  THURSDAY: 'Payshanba',
  FRIDAY: 'Juma',
  SATURDAY: 'Shanba',
  SUNDAY: 'Yakshanba',
};

const SLOT_COLORS = [
  'bg-indigo-600',
  'bg-violet-600',
  'bg-blue-600',
  'bg-sky-600',
  'bg-cyan-600',
  'bg-teal-600',
  'bg-emerald-600',
  'bg-green-600',
];

// ── Clock ─────────────────────────────────────────────────────────────────────
function Clock() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      );
      setDate(
        now.toLocaleDateString('uz-UZ', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="text-right">
      <div className="text-5xl font-mono font-bold text-white tabular-nums">{time}</div>
      <div className="text-lg text-indigo-200 mt-1 capitalize">{date}</div>
    </div>
  );
}

// ── Schedule Card ─────────────────────────────────────────────────────────────
function LessonCard({ item }: { item: ScheduleItem }) {
  const color = SLOT_COLORS[(item.timeSlot - 1) % SLOT_COLORS.length];
  const now = new Date();
  const [h, m] = item.startTime.split(':').map(Number);
  const [eh, em] = item.endTime.split(':').map(Number);
  const startMins = h * 60 + m;
  const endMins = eh * 60 + em;
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const isNow = nowMins >= startMins && nowMins < endMins;
  const isPast = nowMins >= endMins;

  return (
    <div
      className={`rounded-2xl p-4 border-2 transition-all ${
        isNow
          ? 'border-yellow-400 bg-yellow-900/20 ring-2 ring-yellow-400/50'
          : isPast
          ? 'border-white/10 opacity-50'
          : 'border-white/10 bg-white/5'
      }`}
    >
      {/* Time + Slot badge */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${color} text-white text-sm font-bold shrink-0`}
        >
          {item.timeSlot}
        </span>
        <span className="text-white/60 text-sm font-mono">
          {item.startTime}–{item.endTime}
        </span>
      </div>

      {/* Subject */}
      <p className="text-white font-bold text-lg leading-tight truncate">{item.subject.name}</p>

      {/* Teacher */}
      <p className="text-indigo-200 text-sm mt-1 truncate">
        {item.subject.teacher.firstName} {item.subject.teacher.lastName}
      </p>

      {/* Room */}
      {item.roomNumber && (
        <div className="mt-2 inline-flex items-center gap-1 bg-white/10 rounded-full px-3 py-0.5 text-xs text-white/70">
          🚪 {item.roomNumber}-xona
        </div>
      )}

      {isNow && (
        <div className="mt-2 inline-flex items-center gap-1 bg-yellow-400 rounded-full px-3 py-0.5 text-xs text-yellow-900 font-bold animate-pulse">
          ▶ Hozir davom etmoqda
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DisplayPage() {
  const params = useParams();
  const schoolSlug = params.schoolSlug as string;

  const [data, setData] = useState<DisplayData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // ── Fetch initial schedule ──────────────────────────────────────────────────
  const fetchSchedule = useCallback(async () => {
    try {
      const res = await fetch(`${PUBLIC_API}/display/${schoolSlug}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`Server xatosi: ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? 'Ma\'lumot yuklanmadi');
    } finally {
      setLoading(false);
    }
  }, [schoolSlug]);

  // ── WebSocket connection (public — no token) ────────────────────────────────
  useEffect(() => {
    if (!schoolSlug) return;

    const socket = io(API_URL, {
      query: { schoolSlug },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });

    socket.on('connect', () => {
      setConnected(true);
      // Join the display room explicitly
      socket.emit('join:display', { schoolSlug });
    });

    socket.on('disconnect', () => setConnected(false));

    // Live schedule update from server
    socket.on('schedule:live', (updated: any) => {
      if (updated?.schedule) {
        setData(prev => prev ? { ...prev, schedule: updated.schedule } : prev);
        setLastUpdate(new Date());
      } else {
        // Full refresh signal
        fetchSchedule();
        setLastUpdate(new Date());
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [schoolSlug, fetchSchedule]);

  // ── Initial data fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    fetchSchedule();
    // Auto-refresh every 5 minutes as a fallback
    const id = setInterval(fetchSchedule, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchSchedule]);

  // ── Group schedule by class ─────────────────────────────────────────────────
  const byClass = data?.schedule.reduce<Record<string, { className: string; items: ScheduleItem[] }>>(
    (acc, item) => {
      const key = item.class.id;
      if (!acc[key]) acc[key] = { className: item.class.name, items: [] };
      acc[key].items.push(item);
      return acc;
    },
    {},
  ) ?? {};

  const classes = Object.values(byClass).sort((a, b) =>
    a.className.localeCompare(b.className, 'uz'),
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-indigo-200 text-xl">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-950 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl">⚠️</div>
          <p className="text-white text-2xl font-bold">Xatolik yuz berdi</p>
          <p className="text-indigo-300">{error}</p>
          <button
            onClick={fetchSchedule}
            className="mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors"
          >
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-950 text-white flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-white/10 backdrop-blur-sm bg-black/20">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-2xl font-bold shadow-lg">
            🏫
          </div>
          <div>
            <h1 className="text-2xl font-bold">{data?.school.name ?? schoolSlug}</h1>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-indigo-300 text-sm">
                {DAY_UZ[data?.day ?? ''] ?? data?.day} — Dars jadvali
              </span>
              {/* Connection status */}
              <span
                className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${
                  connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                {connected ? 'Live' : 'Offline'}
              </span>
              {lastUpdate && (
                <span className="text-white/40 text-xs">
                  Yangilandi: {lastUpdate.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        </div>

        <Clock />
      </header>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto p-6">
        {classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
            <div className="text-7xl">📅</div>
            <p className="text-2xl font-bold text-white/80">Bugun darslar yo'q</p>
            <p className="text-indigo-300">Dam olish kuni yoki jadval kiritilmagan</p>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-3 lg:grid-cols-2 grid-cols-1">
            {classes.map(({ className, items }) => (
              <div key={className} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                {/* Class header */}
                <div className="px-5 py-3 bg-indigo-700/50 border-b border-white/10 flex items-center justify-between">
                  <h2 className="text-lg font-bold">{className}-sinf</h2>
                  <span className="text-sm text-indigo-300">{items.length} ta dars</span>
                </div>

                {/* Lessons */}
                <div className="p-4 space-y-3">
                  {items
                    .sort((a, b) => a.timeSlot - b.timeSlot)
                    .map(item => (
                      <LessonCard key={item.id} item={item} />
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="px-8 py-3 border-t border-white/10 bg-black/20 flex items-center justify-between text-xs text-white/40">
        <span>EduPlatform — Maktab boshqaruv tizimi</span>
        <span>
          {data?.school.phone && `📞 ${data.school.phone} · `}
          Real-time yangilanadi
        </span>
      </footer>
    </div>
  );
}
