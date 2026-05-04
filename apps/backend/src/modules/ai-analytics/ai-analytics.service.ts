import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';

export interface StudentRiskProfile {
  studentId: string;
  firstName: string;
  lastName: string;
  className?: string;
  riskScore: number; // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  gpa: number;
  attendanceRate: number;
  homeworkCompletion: number;
  disciplineIncidents: number;
  lastGradeTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  recommendations: string[];
}

@Injectable()
export class AiAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStudentRiskProfiles(user: JwtPayload): Promise<StudentRiskProfile[]> {
    const where = buildTenantWhere(user);

    const students = await this.prisma.user.findMany({
      where: { ...where, role: 'student', isActive: true },
      select: {
        id: true, firstName: true, lastName: true,
        studentClasses: {
          select: {
            class: { select: { id: true, name: true, gradeLevel: true } },
          },
          take: 1,
        },
      },
    });

    const profiles: StudentRiskProfile[] = [];

    for (const student of students.slice(0, 100)) { // Limit to 100 students for performance
      const studentId = student.id;

      // Get last 30 days of attendance
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [attendanceRecords, grades, homeworks, disciplineIncidents, coinTx] = await Promise.all([
        this.prisma.attendance.findMany({
          where: { studentId, date: { gte: thirtyDaysAgo } },
          select: { status: true },
        }),
        this.prisma.grade.findMany({
          where: { studentId },
          select: { score: true, maxScore: true, date: true },
          orderBy: { date: 'desc' },
          take: 20,
        }),
        this.prisma.homeworkSubmission.findMany({
          where: { studentId },
          select: { submittedAt: true },
        }),
        this.prisma.disciplineIncident.count({
          where: { studentId, createdAt: { gte: thirtyDaysAgo } },
        }),
        this.prisma.coinTransaction.findMany({
          where: { userId: studentId, createdAt: { gte: thirtyDaysAgo } },
          select: { amount: true, type: true },
        }),
      ]);

      // Calculate attendance rate
      const totalAttendance = attendanceRecords.length;
      const presentCount = attendanceRecords.filter(a => a.status === 'present').length;
      const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 100;

      // Calculate GPA
      const validGrades = grades.filter(g => g.maxScore > 0);
      const avgScore = validGrades.length > 0
        ? validGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / validGrades.length
        : 100;
      const gpa = (avgScore / 100) * 5;

      // Calculate homework completion (count of submissions vs count of homeworks assigned)
      const totalHomework = homeworks.length || 1;
      const completedHomework = homeworks.filter(h => h.submittedAt != null).length;
      const homeworkCompletion = (completedHomework / totalHomework) * 100;

      // Calculate grade trend
      let lastGradeTrend: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE';
      if (validGrades.length >= 4) {
        const firstHalf = validGrades.slice(0, Math.floor(validGrades.length / 2));
        const secondHalf = validGrades.slice(Math.floor(validGrades.length / 2));
        const firstAvg = firstHalf.reduce((s, g) => s + (g.score / g.maxScore), 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((s, g) => s + (g.score / g.maxScore), 0) / secondHalf.length;
        if (secondAvg > firstAvg + 0.05) lastGradeTrend = 'IMPROVING';
        else if (secondAvg < firstAvg - 0.05) lastGradeTrend = 'DECLINING';
      }

      // Calculate risk score (0-100, higher = more at risk)
      let riskScore = 0;
      riskScore += Math.max(0, (90 - attendanceRate) * 1.5); // Attendance weight
      riskScore += Math.max(0, (70 - avgScore) * 0.8); // Grades weight
      riskScore += Math.max(0, (80 - homeworkCompletion) * 0.5); // Homework weight
      riskScore += disciplineIncidents * 5; // Discipline weight
      riskScore = Math.min(100, Math.max(0, riskScore));

      // Determine risk level
      let riskLevel: StudentRiskProfile['riskLevel'];
      if (riskScore >= 70) riskLevel = 'CRITICAL';
      else if (riskScore >= 50) riskLevel = 'HIGH';
      else if (riskScore >= 30) riskLevel = 'MEDIUM';
      else riskLevel = 'LOW';

      // Generate recommendations
      const recommendations: string[] = [];
      if (attendanceRate < 80) recommendations.push("Davomatni yaxshilash choralarini ko'ring");
      if (avgScore < 60) recommendations.push("Qo'shimcha darslar tashkil eting");
      if (homeworkCompletion < 70) recommendations.push("Uy vazifalari nazoratini kuchaytiring");
      if (disciplineIncidents > 2) recommendations.push("Intizomiy suhbat o'tkazing");
      if (lastGradeTrend === 'DECLINING') recommendations.push("Ota-onalar bilan uchrashing");
      if (recommendations.length === 0) recommendations.push("Barqaror natijalar, muvaffaqiyatlarini rag'batlantiring");

      profiles.push({
        studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        className: student.studentClasses[0]?.class?.name,
        riskScore: Math.round(riskScore),
        riskLevel,
        gpa: Math.round(gpa * 10) / 10,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        homeworkCompletion: Math.round(homeworkCompletion * 10) / 10,
        disciplineIncidents,
        lastGradeTrend,
        recommendations,
      });
    }

    // Sort by risk score descending
    return profiles.sort((a, b) => b.riskScore - a.riskScore);
  }

  async getDashboardSummary(user: JwtPayload) {
    const profiles = await this.getStudentRiskProfiles(user);

    const total = profiles.length;
    const critical = profiles.filter(p => p.riskLevel === 'CRITICAL').length;
    const high = profiles.filter(p => p.riskLevel === 'HIGH').length;
    const medium = profiles.filter(p => p.riskLevel === 'MEDIUM').length;
    const low = profiles.filter(p => p.riskLevel === 'LOW').length;

    const avgGpa = total > 0 ? profiles.reduce((s, p) => s + p.gpa, 0) / total : 0;
    const avgAttendance = total > 0 ? profiles.reduce((s, p) => s + p.attendanceRate, 0) / total : 0;

    return {
      totalStudents: total,
      riskDistribution: { critical, high, medium, low },
      averages: {
        gpa: Math.round(avgGpa * 10) / 10,
        attendance: Math.round(avgAttendance * 10) / 10,
      },
      topAtRisk: profiles.slice(0, 10),
    };
  }
}
