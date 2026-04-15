import { apiClient } from './client';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TransportRoute {
  id: string;
  name: string;
  description?: string;
  stops: string[];
  departureTime: string;
  arrivalTime: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  capacity: number;
  isActive: boolean;
  studentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TransportStudent {
  id: string;
  routeId: string;
  studentId: string;
  stopName?: string;
  createdAt: string;
  student: { id: string; firstName: string; lastName: string; phone?: string };
}

export interface TransportStats {
  totalRoutes: number;
  activeRoutes: number;
  totalAssigned: number;
}

export interface CreateRouteDto {
  name: string;
  description?: string;
  stops?: string[];
  departureTime: string;
  arrivalTime: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  capacity?: number;
  isActive?: boolean;
}

export interface AssignStudentDto {
  studentId: string;
  stopName?: string;
}

// ── API ────────────────────────────────────────────────────────────────────────

export const transportApi = {
  getStats: (): Promise<TransportStats> =>
    apiClient.get('/transport/stats').then(r => r.data),

  getRoutes: (): Promise<TransportRoute[]> =>
    apiClient.get('/transport/routes').then(r => r.data),

  getRoute: (id: string): Promise<TransportRoute & { assignments: TransportStudent[] }> =>
    apiClient.get(`/transport/routes/${id}`).then(r => r.data),

  createRoute: (data: CreateRouteDto): Promise<TransportRoute> =>
    apiClient.post('/transport/routes', data).then(r => r.data),

  updateRoute: (id: string, data: Partial<CreateRouteDto>): Promise<TransportRoute> =>
    apiClient.put(`/transport/routes/${id}`, data).then(r => r.data),

  deleteRoute: (id: string): Promise<void> =>
    apiClient.delete(`/transport/routes/${id}`).then(r => r.data),

  getStudentsByRoute: (routeId: string): Promise<TransportStudent[]> =>
    apiClient.get(`/transport/routes/${routeId}/students`).then(r => r.data),

  assignStudent: (routeId: string, data: AssignStudentDto): Promise<TransportStudent> =>
    apiClient.post(`/transport/routes/${routeId}/students`, data).then(r => r.data),

  removeStudent: (routeId: string, studentId: string): Promise<void> =>
    apiClient.delete(`/transport/routes/${routeId}/students/${studentId}`).then(r => r.data),

  getMyRoute: (): Promise<TransportRoute | null> =>
    apiClient.get('/transport/my-route').then(r => r.data),
};
