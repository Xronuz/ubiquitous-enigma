import {
  UserRole,
  SubscriptionPlan,
  SubscriptionStatus,
  BillingCycle,
  ModuleName,
  AttendanceStatus,
  GradeType,
  PaymentStatus,
  PaymentProvider,
  DayOfWeek,
  Language,
} from './enums';

// ─── Pagination ────────────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface CursorPaginationMeta {
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  meta: CursorPaginationMeta;
}

// ─── API Response ──────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  schoolId: string | null;
  branchId: string | null;
  isSuperAdmin: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

// ─── School ────────────────────────────────────────────────────────────────

export interface SchoolSummary {
  id: string;
  name: string;
  slug: string;
  subscriptionTier: SubscriptionPlan;
  isActive: boolean;
  createdAt: string;
}

export interface SchoolDetail extends SchoolSummary {
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  activeModules: ModuleName[];
  subscription: SubscriptionSummary | null;
}

export interface SubscriptionSummary {
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  nextBilling: string;
}

// ─── User ──────────────────────────────────────────────────────────────────

export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  isActive: boolean;
}

export interface UserDetail extends UserSummary {
  schoolId: string | null;
  language: Language;
  createdAt: string;
  updatedAt: string;
}

// ─── Class ─────────────────────────────────────────────────────────────────

export interface ClassSummary {
  id: string;
  name: string;
  gradeLevel: number;
  academicYear: string;
  studentCount: number;
}

export interface ClassDetail extends ClassSummary {
  schoolId: string;
  classTeacherId: string | null;
  classTeacher?: UserSummary;
  createdAt: string;
}

// ─── Subject ───────────────────────────────────────────────────────────────

export interface SubjectSummary {
  id: string;
  name: string;
  teacherId: string;
  teacher?: UserSummary;
}

// ─── Schedule ──────────────────────────────────────────────────────────────

export interface ScheduleSlot {
  id: string;
  classId: string;
  subjectId: string;
  subject?: SubjectSummary;
  roomNumber?: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  timeSlot: number;
}

// ─── Attendance ────────────────────────────────────────────────────────────

export interface AttendanceRecord {
  id: string;
  studentId: string;
  student?: UserSummary;
  date: string;
  status: AttendanceStatus;
  lessonId?: string;
  note?: string;
}

// ─── Grade ─────────────────────────────────────────────────────────────────

export interface GradeRecord {
  id: string;
  studentId: string;
  student?: UserSummary;
  subjectId: string;
  subject?: SubjectSummary;
  type: GradeType;
  score: number;
  maxScore: number;
  date: string;
  comment?: string;
}

// ─── Payment ───────────────────────────────────────────────────────────────

export interface PaymentRecord {
  id: string;
  studentId: string;
  student?: UserSummary;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  paidAt?: string;
  dueDate?: string;
  description?: string;
}

// ─── Notification ──────────────────────────────────────────────────────────

export interface NotificationRecord {
  id: string;
  recipientId: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

// ─── WebSocket events ──────────────────────────────────────────────────────

export interface WsScheduleLiveEvent {
  schoolId: string;
  currentLesson: ScheduleSlot | null;
  nextLesson: ScheduleSlot | null;
  announcements: string[];
}

export interface WsNotificationEvent {
  notification: NotificationRecord;
}

export interface WsPaymentReceivedEvent {
  payment: PaymentRecord;
}
