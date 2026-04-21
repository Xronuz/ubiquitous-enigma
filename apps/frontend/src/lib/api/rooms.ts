import { apiClient } from './client';

export interface Room {
  id: string;
  schoolId: string;
  branchId: string;
  name: string;
  capacity: number;
  floor?: number | null;
  type: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  branch?: { id: string; name: string; code: string };
  _count?: { schedules: number };
}

export interface CreateRoomPayload {
  name: string;
  branchId: string;
  capacity?: number;
  floor?: number;
  type?: string;
  isActive?: boolean;
}

export interface UpdateRoomPayload {
  name?: string;
  capacity?: number;
  floor?: number;
  type?: string;
  isActive?: boolean;
}

export const roomsApi = {
  getAll: async (branchId?: string): Promise<Room[]> => {
    const { data } = await apiClient.get('/rooms', { params: { branchId } });
    return data;
  },

  getOne: async (id: string): Promise<Room> => {
    const { data } = await apiClient.get(`/rooms/${id}`);
    return data;
  },

  create: async (payload: CreateRoomPayload): Promise<Room> => {
    const { data } = await apiClient.post('/rooms', payload);
    return data;
  },

  update: async (id: string, payload: UpdateRoomPayload): Promise<Room> => {
    const { data } = await apiClient.put(`/rooms/${id}`, payload);
    return data;
  },

  remove: async (id: string): Promise<{ message: string; deleted?: boolean; deactivated?: boolean }> => {
    const { data } = await apiClient.delete(`/rooms/${id}`);
    return data;
  },
};
