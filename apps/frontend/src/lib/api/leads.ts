import { apiClient } from './client';

// ─── Enums ────────────────────────────────────────────────────────────────────

export type LeadSource =
  | 'INSTAGRAM' | 'TELEGRAM' | 'FACEBOOK' | 'WEBSITE'
  | 'REFERRAL'  | 'CALL'     | 'WALK_IN'  | 'OTHER';

export type LeadStatus =
  | 'NEW' | 'CONTACTED' | 'TEST_LESSON' | 'WAITING_PAYMENT' | 'CONVERTED' | 'CLOSED';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LeadComment {
  id:        string;
  text:      string;
  createdAt: string;
  author?:   { id: string; firstName: string; lastName: string; role: string } | null;
}

export interface Lead {
  id:                  string;
  schoolId:            string;
  branchId?:           string | null;
  firstName:           string;
  lastName:            string;
  phone:               string;
  source:              LeadSource;
  status:              LeadStatus;
  note?:               string | null;
  assignedToId?:       string | null;
  convertedStudentId?: string | null;
  expectedClassId?:    string | null;
  nextContactDate?:    string | null;
  createdAt:           string;
  updatedAt:           string;
  branch?:             { id: string; name: string; code?: string } | null;
  assignedTo?:         { id: string; firstName: string; lastName: string; role: string } | null;
  createdBy?:          { id: string; firstName: string; lastName: string } | null;
  expectedClass?:      { id: string; name: string; gradeLevel: number } | null;
  comments?:           LeadComment[];
  _count?:             { comments: number };
}

export interface LeadListResponse {
  data:        Lead[];
  total:       number;
  page:        number;
  limit:       number;
  totalPages:  number;
}

export interface LeadAnalytics {
  totalLeads:          number;
  conversionRate:      number;
  convertedThisMonth:  number;
  newThisWeek:         number;
  byStatus:            { status: LeadStatus; count: number }[];
  bySource:            { source: LeadSource; count: number }[];
}

export interface ConvertResult {
  student:      { id: string; firstName: string; lastName: string; email: string; phone: string };
  lead:         Lead;
  message:      string;
  className:    string;
  rawPassword:  string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface LeadFilters {
  status?:       string;
  source?:       string;
  search?:       string;
  branchId?:     string;
  assignedToId?: string;
  page?:         number;
  limit?:        number;
}

export const leadsApi = {
  getAll: async (filters: LeadFilters = {}): Promise<LeadListResponse> => {
    const { data } = await apiClient.get('/leads', { params: filters });
    return data;
  },

  getOne: async (id: string): Promise<Lead> => {
    const { data } = await apiClient.get(`/leads/${id}`);
    return data;
  },

  getAnalytics: async (branchId?: string): Promise<LeadAnalytics> => {
    const { data } = await apiClient.get('/leads/analytics', { params: { branchId } });
    return data;
  },

  create: async (payload: {
    firstName:       string;
    lastName:        string;
    phone:           string;
    source:          LeadSource;
    branchId?:       string;
    note?:           string;
    assignedToId?:   string;
    expectedClassId?: string;
    nextContactDate?: string;
  }): Promise<Lead> => {
    const { data } = await apiClient.post('/leads', payload);
    return data;
  },

  update: async (id: string, payload: Partial<{
    firstName:       string;
    lastName:        string;
    phone:           string;
    source:          LeadSource;
    status:          LeadStatus;
    note:            string;
    assignedToId:    string;
    branchId:        string;
    expectedClassId: string;
    nextContactDate: string;
  }>): Promise<Lead> => {
    const { data } = await apiClient.put(`/leads/${id}`, payload);
    return data;
  },

  updateStatus: async (id: string, status: LeadStatus): Promise<Lead> => {
    const { data } = await apiClient.patch(`/leads/${id}/status`, { status });
    return data;
  },

  assign: async (id: string, assignedToId: string): Promise<Lead> => {
    const { data } = await apiClient.patch(`/leads/${id}/assign`, { assignedToId });
    return data;
  },

  remove: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/leads/${id}`);
    return data;
  },

  addComment: async (leadId: string, text: string): Promise<LeadComment> => {
    const { data } = await apiClient.post(`/leads/${leadId}/comments`, { text });
    return data;
  },

  removeComment: async (leadId: string, commentId: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/leads/${leadId}/comments/${commentId}`);
    return data;
  },

  convertToStudent: async (leadId: string, payload: {
    classId:   string;
    password?: string;
    email?:    string;
  }): Promise<ConvertResult> => {
    const { data } = await apiClient.post(`/leads/${leadId}/convert`, payload);
    return data;
  },
};

// ─── UI Helpers ───────────────────────────────────────────────────────────────

export const LEAD_STATUS_CONFIG: Record<LeadStatus, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
}> = {
  NEW:             { label: 'Yangi',          color: 'text-blue-700 dark:text-blue-300',   bgColor: 'bg-blue-50 dark:bg-blue-950/40',    borderColor: 'border-blue-200 dark:border-blue-800',   dotColor: 'bg-blue-500'   },
  CONTACTED:       { label: "Bog'lanildi",    color: 'text-yellow-700 dark:text-yellow-300', bgColor: 'bg-yellow-50 dark:bg-yellow-950/40', borderColor: 'border-yellow-200 dark:border-yellow-800', dotColor: 'bg-yellow-500' },
  TEST_LESSON:     { label: 'Sinov darsi',    color: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-50 dark:bg-orange-950/40', borderColor: 'border-orange-200 dark:border-orange-800', dotColor: 'bg-orange-500' },
  WAITING_PAYMENT: { label: "To'lov kutilmoqda", color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-50 dark:bg-purple-950/40', borderColor: 'border-purple-200 dark:border-purple-800', dotColor: 'bg-purple-500' },
  CONVERTED:       { label: "O'quvchi bo'ldi", color: 'text-green-700 dark:text-green-300',  bgColor: 'bg-green-50 dark:bg-green-950/40',  borderColor: 'border-green-200 dark:border-green-800',  dotColor: 'bg-green-500'  },
  CLOSED:          { label: 'Yopildi',        color: 'text-gray-600 dark:text-gray-400',    bgColor: 'bg-gray-50 dark:bg-gray-900/40',    borderColor: 'border-gray-200 dark:border-gray-700',   dotColor: 'bg-gray-400'   },
};

export const LEAD_SOURCE_CONFIG: Record<LeadSource, { label: string; emoji: string; color: string }> = {
  INSTAGRAM: { label: 'Instagram', emoji: '📸', color: 'text-pink-600'   },
  TELEGRAM:  { label: 'Telegram',  emoji: '✈️', color: 'text-blue-500'   },
  FACEBOOK:  { label: 'Facebook',  emoji: '👥', color: 'text-blue-700'   },
  WEBSITE:   { label: 'Sayt',      emoji: '🌐', color: 'text-teal-600'   },
  REFERRAL:  { label: 'Tavsiya',   emoji: '🤝', color: 'text-green-600'  },
  CALL:      { label: "Qo'ng'iroq", emoji: '📞', color: 'text-amber-600'  },
  WALK_IN:   { label: 'Shaxsan',   emoji: '🚶', color: 'text-indigo-600' },
  OTHER:     { label: 'Boshqa',    emoji: '📋', color: 'text-gray-500'   },
};

export const KANBAN_COLUMNS: LeadStatus[] = [
  'NEW', 'CONTACTED', 'TEST_LESSON', 'WAITING_PAYMENT', 'CONVERTED', 'CLOSED',
];
