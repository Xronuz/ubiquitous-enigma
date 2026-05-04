export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  DIRECTOR = 'director',
  BRANCH_ADMIN = 'branch_admin',
  VICE_PRINCIPAL = 'vice_principal',
  TEACHER = 'teacher',
  CLASS_TEACHER = 'class_teacher',
  ACCOUNTANT = 'accountant',
  LIBRARIAN = 'librarian',
  STUDENT = 'student',
  PARENT = 'parent',
}

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TRIAL = 'trial',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum ModuleName {
  AUTH = 'auth',
  USERS = 'users',
  CLASSES = 'classes',
  SCHEDULE = 'schedule',
  NOTIFICATIONS = 'notifications',
  MESSAGING = 'messaging',
  REPORTS = 'reports',
  ATTENDANCE = 'attendance',
  GRADES = 'grades',
  PAYMENTS = 'payments',
  EXAMS = 'exams',
  HOMEWORK = 'homework',
  DISPLAY = 'display',
  FINANCE_DASHBOARD = 'finance_dashboard',
  LEARNING_CENTER = 'learning_center',
  CANTEEN = 'canteen',
  LIBRARY = 'library',
  TRANSPORT = 'transport',
  INVENTORY = 'inventory',
  PSYCHOLOGY = 'psychology',
}

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  EXCUSED = 'excused',
}

export enum GradeType {
  HOMEWORK = 'homework',
  CLASSWORK = 'classwork',
  TEST = 'test',
  EXAM = 'exam',
  QUARTERLY = 'quarterly',
  FINAL = 'final',
}

export enum ExamFrequency {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  FINAL = 'final',
  ON_DEMAND = 'on_demand',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  OVERDUE = 'overdue',
}

export enum PaymentProvider {
  PAYME = 'payme',
  CLICK = 'click',
  UZUM = 'uzum',
  CASH = 'cash',
}

export enum NotificationType {
  SMS = 'sms',
  EMAIL = 'email',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORT = 'export',
}

export enum Language {
  UZ = 'uz',
  RU = 'ru',
}
