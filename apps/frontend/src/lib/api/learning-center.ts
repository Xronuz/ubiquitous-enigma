import { apiClient } from './client';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Course {
  id: string;
  schoolId: string;
  name: string;
  description?: string;
  teacherId?: string;
  teacher?: { id: string; firstName: string; lastName: string };
  duration?: number;  // weeks
  price?: number;
  maxStudents: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  enrolledCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseEnrollment {
  id: string;
  courseId: string;
  studentId: string;
  status: 'active' | 'completed' | 'dropped';
  grade?: number;
  notes?: string;
  enrolledAt: string;
  student: { id: string; firstName: string; lastName: string; phone?: string };
  course?: Course;
}

export interface LearningCenterStats {
  totalCourses: number;
  activeCourses: number;
  activeStudents: number;
  completionRate: number;
}

export interface CreateCourseDto {
  name: string;
  description?: string;
  teacherId?: string;
  duration?: number;
  price?: number;
  maxStudents?: number;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface EnrollStudentDto {
  studentId: string;
  notes?: string;
}

export interface UpdateEnrollmentDto {
  status?: 'active' | 'completed' | 'dropped';
  grade?: number;
  notes?: string;
}

// ── API ────────────────────────────────────────────────────────────────────────

export const learningCenterApi = {
  getStats: (): Promise<LearningCenterStats> =>
    apiClient.get('/learning-center/stats').then(r => r.data),

  getCourses: (search?: string): Promise<Course[]> =>
    apiClient.get('/learning-center/courses', { params: search ? { search } : undefined }).then(r => r.data),

  getCourseById: (id: string): Promise<Course & { enrollments: CourseEnrollment[] }> =>
    apiClient.get(`/learning-center/courses/${id}`).then(r => r.data),

  createCourse: (data: CreateCourseDto): Promise<Course> =>
    apiClient.post('/learning-center/courses', data).then(r => r.data),

  updateCourse: (id: string, data: Partial<CreateCourseDto>): Promise<Course> =>
    apiClient.put(`/learning-center/courses/${id}`, data).then(r => r.data),

  deleteCourse: (id: string): Promise<void> =>
    apiClient.delete(`/learning-center/courses/${id}`).then(r => r.data),

  enrollStudent: (courseId: string, data: EnrollStudentDto): Promise<CourseEnrollment> =>
    apiClient.post(`/learning-center/courses/${courseId}/enroll`, data).then(r => r.data),

  updateEnrollment: (courseId: string, enrollmentId: string, data: UpdateEnrollmentDto): Promise<CourseEnrollment> =>
    apiClient.put(`/learning-center/courses/${courseId}/enrollments/${enrollmentId}`, data).then(r => r.data),

  removeEnrollment: (courseId: string, enrollmentId: string): Promise<void> =>
    apiClient.delete(`/learning-center/courses/${courseId}/enrollments/${enrollmentId}`).then(r => r.data),

  getMyCourses: (): Promise<CourseEnrollment[]> =>
    apiClient.get('/learning-center/my-courses').then(r => r.data),
};
