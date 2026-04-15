import { apiClient } from './client';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AttendanceReportData {
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  presentRate: number;
  byMonth: { month: number; year: number; present: number; absent: number; late: number; excused: number }[];
  byClass: { className: string; presentRate: number; total: number }[];
  recentAbsences: { studentName: string; date: string; status: string; className: string }[];
}

export interface GradesReportData {
  totalGrades: number;
  averageScore: number;
  passingRate: number;
  bySubject: { subject: string; avgScore: number; count: number }[];
  byType: { type: string; count: number; avgScore: number }[];
  topStudents: { name: string; gpa: number; className: string }[];
  recentGrades: { studentName: string; subject: string; score: number; maxScore: number; type: string; date: string }[];
}

export interface FinanceReportData {
  totalRevenue: number;
  totalPending: number;
  totalOverdue: number;
  collectionRate: number;
  byMonth: { month: number; year: number; paid: number; pending: number; overdue: number }[];
  byStatus: { status: string; count: number; amount: number }[];
  debtors: { studentName: string; className: string; amount: number; dueDate: string }[];
}

export interface ReportCardData {
  student: { id: string; firstName: string; lastName: string; className: string };
  quarter: number;
  year: string;
  subjects: { name: string; avgScore: number; grade: string; teacherName: string }[];
  gpa: number;
  attendanceRate: number;
  totalPresent: number;
  totalAbsent: number;
  rank?: number;
}

// ── API ────────────────────────────────────────────────────────────────────────

export const reportsApi = {
  /** Raw array response from backend (compatible with current page components) */
  getAttendance: (params?: { from?: string; to?: string; classId?: string }): Promise<any> =>
    apiClient.get('/reports/attendance', { params }).then(r => r.data),

  getGrades: (params?: { from?: string; to?: string; classId?: string; subjectId?: string }): Promise<any> =>
    apiClient.get('/reports/grades', { params }).then(r => r.data),

  getFinance: (params?: { from?: string; to?: string }): Promise<any> =>
    apiClient.get('/payments/report', { params }).then(r => r.data),

  getReportCard: (studentId: string, params?: { quarter?: number; year?: string }): Promise<ReportCardData> =>
    apiClient.get(`/reports/report-card/${studentId}`, { params }).then(r => r.data),

  downloadPdf: async (type: 'attendance' | 'grades' | 'finance', params?: Record<string, string>): Promise<void> => {
    const urlMap = {
      attendance: '/reports/attendance/pdf',
      grades: '/reports/grades/pdf',
      finance: '/reports/finance/pdf',
    };
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const token = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.accessToken ?? ''
      : '';
    const resp = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}${urlMap[type]}${query}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!resp.ok) throw new Error('PDF generatsiya xatosi');
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hisobot-${type}-${new Date().toISOString().slice(0, 10)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
