import { apiClient } from './client';

export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled';
export type MeetingMedium = 'in_person' | 'phone' | 'video';

export interface Meeting {
  id: string;
  teacherId: string;
  teacher: { id: string; firstName: string; lastName: string };
  parentId: string;
  parent: { id: string; firstName: string; lastName: string };
  studentId: string;
  student: { id: string; firstName: string; lastName: string; class?: { name: string } };
  scheduledAt: string;
  duration: number; // minutes
  medium: MeetingMedium;
  status: MeetingStatus;
  agenda?: string;
  notes?: string;
  createdAt: string;
}

export const meetingsApi = {
  getAll: async (params?: { status?: MeetingStatus; teacherId?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const { data } = await apiClient.get('/meetings', { params });
    return data as { data: Meeting[]; meta: { total: number; page: number; totalPages: number } };
  },

  getMyMeetings: async () => {
    const { data } = await apiClient.get('/meetings/my');
    return data as Meeting[];
  },

  create: async (payload: {
    teacherId: string;
    parentId: string;
    studentId: string;
    scheduledAt: string;
    duration?: number;
    medium: MeetingMedium;
    agenda?: string;
  }) => {
    const { data } = await apiClient.post('/meetings', payload);
    return data as Meeting;
  },

  updateStatus: async (id: string, status: MeetingStatus, notes?: string) => {
    const { data } = await apiClient.patch(`/meetings/${id}`, { status, notes });
    return data as Meeting;
  },

  remove: async (id: string) => {
    const { data } = await apiClient.delete(`/meetings/${id}`);
    return data;
  },
};
