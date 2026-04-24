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
    const filteredParams = params
      ? Object.fromEntries(Object.entries(params).filter(([, v]) => v))
      : undefined;
    const resp = await apiClient.get('/academic-calendar/export/pdf', { params: filteredParams, responseType: 'blob' });
    const blob = new Blob([resp.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `akademik-kalendar-${new Date().getFullYear()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },

  exportICal: async (params?: { from?: string; to?: string }): Promise<void> => {
    const filteredParams = params
      ? Object.fromEntries(Object.entries(params).filter(([, v]) => v))
      : undefined;
    const resp = await apiClient.get('/academic-calendar/export/ical', { params: filteredParams, responseType: 'blob' });
    const blob = new Blob([resp.data], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `akademik-kalendar-${new Date().getFullYear()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
