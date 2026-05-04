import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/create-subject.dto';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(currentUser: JwtPayload, classId?: string) {
    const where: any = { schoolId: currentUser.schoolId! };
    if (classId) where.classId = classId;
    return this.prisma.subject.findMany({
      where,
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        class: { select: { id: true, name: true } },
      },
    });
  }

  /** Teacher yoki class_teacher faqat o'ziga biriktirilgan fanlarni oladi */
  async findMine(currentUser: JwtPayload) {
    return this.prisma.subject.findMany({
      where: { schoolId: currentUser.schoolId!, teacherId: currentUser.sub },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        class: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateSubjectDto, currentUser: JwtPayload) {
    return this.prisma.subject.create({
      data: { ...dto, schoolId: currentUser.schoolId!, branchId: currentUser.branchId! },
      include: { teacher: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async update(id: string, dto: UpdateSubjectDto, currentUser: JwtPayload) {
    const subject = await this.prisma.subject.findFirst({ where: { id, schoolId: currentUser.schoolId! } });
    if (!subject) throw new NotFoundException('Fan topilmadi');
    return this.prisma.subject.update({ where: { id }, data: dto });
  }

  async remove(id: string, currentUser: JwtPayload) {
    const subject = await this.prisma.subject.findFirst({ where: { id, schoolId: currentUser.schoolId! } });
    if (!subject) throw new NotFoundException('Fan topilmadi');
    await this.prisma.subject.delete({ where: { id } });
    return { message: 'Fan o\'chirildi' };
  }
}
