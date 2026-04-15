import { apiClient } from './client';

export interface ImportRow {
  row: number;
  data: Record<string, any>;
  errors: string[];
  valid: boolean;
}

export interface ImportResult {
  total: number;
  valid: number;
  invalid: number;
  rows: ImportRow[];
}

export interface CommitResult {
  created: number;
  skipped: number;
  errors: string[];
}

export type ImportType = 'students' | 'users' | 'schedule' | 'grades' | 'attendance';

export const importApi = {
  // ── Namuna Excel yuklab olish ────────────────────────────────────────────────
  downloadTemplate: (type: ImportType) => {
    const link = document.createElement('a');
    link.href = `${(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1').replace(/\/api\/v1$/, '')}/api/v1/import/templates/${type}`;
    link.setAttribute('download', `namuna_${type}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // ── Parse (preview) ──────────────────────────────────────────────────────────
  parseStudents: async (file: File): Promise<ImportResult> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post('/import/students/parse', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  parseUsers: async (file: File): Promise<ImportResult> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post('/import/users/parse', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  parseSchedule: async (file: File): Promise<ImportResult> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post('/import/schedule/parse', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  parseGrades: async (file: File): Promise<ImportResult> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post('/import/grades/parse', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  parseAttendance: async (file: File): Promise<ImportResult> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post('/import/attendance/parse', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  // ── Commit (saqlash) ─────────────────────────────────────────────────────────
  commitStudents: async (rows: ImportRow[]): Promise<CommitResult> => {
    const { data } = await apiClient.post('/import/students/commit', { rows });
    return data;
  },

  commitUsers: async (rows: ImportRow[]): Promise<CommitResult> => {
    const { data } = await apiClient.post('/import/users/commit', { rows });
    return data;
  },

  commitSchedule: async (rows: ImportRow[]): Promise<CommitResult> => {
    const { data } = await apiClient.post('/import/schedule/commit', { rows });
    return data;
  },

  commitGrades: async (rows: ImportRow[]): Promise<CommitResult> => {
    const { data } = await apiClient.post('/import/grades/commit', { rows });
    return data;
  },

  commitAttendance: async (rows: ImportRow[]): Promise<CommitResult> => {
    const { data } = await apiClient.post('/import/attendance/commit', { rows });
    return data;
  },
};
