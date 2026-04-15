import { apiClient } from './client';

export interface ExamOption {
  id: string;
  text: string;
  isCorrect?: boolean;
  order: number;
}

export interface ExamQuestion {
  id: string;
  examId: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  text: string;
  points: number;
  order: number;
  explanation?: string;
  options: ExamOption[];
}

export interface ExamSession {
  id: string;
  examId: string;
  studentId: string;
  status: 'in_progress' | 'submitted' | 'timed_out' | 'graded';
  score?: number;
  percentage?: number;
  submittedAt?: string;
  createdAt: string;
  student?: { id: string; firstName: string; lastName: string };
}

export interface StartSessionResponse {
  session: ExamSession;
  questions: (Omit<ExamQuestion, 'options'> & {
    options: Omit<ExamOption, 'isCorrect'>[];
  })[];
  exam: {
    id: string;
    title: string;
    duration?: number;
    maxScore: number;
    scheduledAt?: string;
  };
}

export const onlineExamApi = {
  // Teacher: question management
  getQuestions: (examId: string): Promise<ExamQuestion[]> =>
    apiClient.get(`/online-exam/${examId}/questions`).then(r => r.data),

  addQuestion: (examId: string, payload: {
    type: string;
    text: string;
    points?: number;
    order?: number;
    explanation?: string;
    options?: { text: string; isCorrect?: boolean; order?: number }[];
  }): Promise<ExamQuestion> =>
    apiClient.post(`/online-exam/${examId}/questions`, payload).then(r => r.data),

  updateQuestion: (examId: string, qId: string, payload: {
    text?: string;
    points?: number;
    order?: number;
    explanation?: string;
  }): Promise<ExamQuestion> =>
    apiClient.put(`/online-exam/${examId}/questions/${qId}`, payload).then(r => r.data),

  deleteQuestion: (examId: string, qId: string): Promise<{ message: string }> =>
    apiClient.delete(`/online-exam/${examId}/questions/${qId}`).then(r => r.data),

  importFromDocx: (examId: string, file: File): Promise<{ imported: number; questions: ExamQuestion[] }> => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post(`/online-exam/${examId}/import-docx`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  // Teacher: session monitoring
  getExamSessions: (examId: string): Promise<ExamSession[]> =>
    apiClient.get(`/online-exam/${examId}/sessions`).then(r => r.data),

  // Student: session management
  startSession: (examId: string): Promise<StartSessionResponse> =>
    apiClient.post(`/online-exam/${examId}/sessions/start`).then(r => r.data),

  saveAnswer: (sessionId: string, payload: {
    questionId: string;
    selectedOptionId?: string;
    textAnswer?: string;
  }): Promise<unknown> =>
    apiClient.post(`/online-exam/sessions/${sessionId}/answer`, payload).then(r => r.data),

  submitSession: (sessionId: string): Promise<{
    session: ExamSession;
    score: number;
    total: number;
    percentage: number;
    message: string;
  }> =>
    apiClient.post(`/online-exam/sessions/${sessionId}/submit`).then(r => r.data),

  getSessionResult: (sessionId: string) =>
    apiClient.get(`/online-exam/sessions/${sessionId}/result`).then(r => r.data),
};
