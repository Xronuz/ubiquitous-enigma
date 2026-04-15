import { apiClient } from './client';

export type AcademicEventType =
  | 'holiday' | 'exam_week' | 'quarter_start' | 'quarter_end'
  | 'school_event' | 'meeting' | 'other';

export interface CreateAcademicEventPayload {
  title: string;
  description?: string;
  type?: AcademicEventType;
  startDate: string;
  endDate: string;
  allDay?: boolean;
  color?: string;
}

export const academicCalendarApi = {
  getAll: (params?: { from?: string; to?: string }) =>
    apiClient.get('/academic-calendar', { params }).then(r => r.data),

  getOne: (id: string) =>
    apiClient.get(`/academic-calendar/${id}`).then(r => r.data),

  create: (payload: CreateAcademicEventPayload) =>
    apiClient.post('/academic-calendar', payload).then(r => r.data),

  update: (id: string, payload: Partial<CreateAcademicEventPayload>) =>
    apiClient.put(`/academic-calendar/${id}`, payload).then(r => r.data),

  remove: (id: string) =>
    apiClient.delete(`/academic-calendar/${id}`).then(r => r.data),

  exportPdf: async (params?: { from?: string; to?: string }): Promise<void> => {
    const token = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.accessToken ?? ''
      : '';
    const query = params ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString() : '';
    const resp = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/academic-calendar/export/pdf${query}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!resp.ok) throw new Error('PDF yuklab olishda xato');
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `akademik-kalendar-${new Date().getFullYear()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },

  exportICal: async (params?: { from?: string; to?: string }): Promise<void> => {
    const token = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.accessToken ?? ''
      : '';
    const query = params ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString() : '';
    const resp = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/academic-calendar/export/ical${query}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!resp.ok) throw new Error('iCal yuklab olishda xato');
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `akademik-kalendar-${new Date().getFullYear()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
