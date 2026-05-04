import { apiClient } from './client';

export interface StudentRiskProfile {
  studentId: string;
  firstName: string;
  lastName: string;
  className?: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  gpa: number;
  attendanceRate: number;
  homeworkCompletion: number;
  disciplineIncidents: number;
  lastGradeTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  recommendations: string[];
}

export interface AiDashboardSummary {
  totalStudents: number;
  riskDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  averages: {
    gpa: number;
    attendance: number;
  };
  topAtRisk: StudentRiskProfile[];
}

export const aiAnalyticsApi = {
  getStudentProfiles: () =>
    apiClient.get<StudentRiskProfile[]>('/ai-analytics/students').then(r => r.data),

  getDashboard: () =>
    apiClient.get<AiDashboardSummary>('/ai-analytics/dashboard').then(r => r.data),
};
