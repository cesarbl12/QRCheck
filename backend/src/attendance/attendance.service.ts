import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceType, Prisma } from '../prisma/client';
import { QueryAttendanceDto } from './dto/query-attendance.dto';

const SCAN_COOLDOWN_SECONDS = 5;

type AttendanceWithEmployee = Prisma.AttendanceGetPayload<{
  include: { employee: true };
}>;

interface Evaluation {
  isLate: boolean | null;
  lateByMinutes: number | null;
  overtimeMinutes: number | null;
}

export interface EmployeeAttendanceSummary {
  employeeId: string;
  employeeName: string;
  daysPresent: number;
  totalWorkedMinutes: number;
  lateCount: number;
  totalLateMinutes: number;
  totalOvertimeMinutes: number;
  incompleteDays: number;
}

@Injectable()
export class AttendanceService {
  private readonly timezone: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.timezone = this.config.get<string>('APP_TIMEZONE') ?? 'America/Tijuana';
  }

  async scan(token: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { qrToken: token },
    });

    if (!employee || !employee.active) {
      throw new NotFoundException('Gafete no reconocido');
    }

    const { start, end } = this.todayRangeUtc();
    const last = await this.prisma.attendance.findFirst({
      where: { employeeId: employee.id, timestamp: { gte: start, lte: end } },
      orderBy: { timestamp: 'desc' },
    });

    if (last) {
      const secondsSinceLast = (Date.now() - last.timestamp.getTime()) / 1000;
      if (secondsSinceLast < SCAN_COOLDOWN_SECONDS) {
        return {
          employeeName: employee.fullName,
          type: last.type,
          timestamp: last.timestamp,
          duplicate: true,
        };
      }
    }

    const type =
      !last || last.type === AttendanceType.SALIDA
        ? AttendanceType.ENTRADA
        : AttendanceType.SALIDA;

    const attendance = await this.prisma.attendance.create({
      data: { employeeId: employee.id, type },
    });

    return {
      employeeName: employee.fullName,
      type: attendance.type,
      timestamp: attendance.timestamp,
      duplicate: false,
    };
  }

  async findAll(query: QueryAttendanceDto) {
    const records = await this.prisma.attendance.findMany({
      where: this.buildWhere(query),
      include: { employee: true },
      orderBy: { timestamp: 'desc' },
      take: 500,
    });

    return records.map((record) => this.withEvaluation(record));
  }

  async summary(query: QueryAttendanceDto): Promise<EmployeeAttendanceSummary[]> {
    const records = await this.prisma.attendance.findMany({
      where: this.buildWhere(query),
      include: { employee: true },
      orderBy: { timestamp: 'asc' },
    });

    const byEmployee = new Map<string, Map<string, AttendanceWithEmployee[]>>();

    for (const record of records) {
      const dayKey = DateTime.fromJSDate(record.timestamp).setZone(this.timezone).toISODate();
      if (!dayKey) continue;

      if (!byEmployee.has(record.employeeId)) {
        byEmployee.set(record.employeeId, new Map());
      }
      const dayMap = byEmployee.get(record.employeeId)!;
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, []);
      }
      dayMap.get(dayKey)!.push(record);
    }

    const summaries: EmployeeAttendanceSummary[] = [];

    for (const [employeeId, dayMap] of byEmployee) {
      let employeeName = '';
      let totalWorkedMinutes = 0;
      let lateCount = 0;
      let totalLateMinutes = 0;
      let totalOvertimeMinutes = 0;
      let incompleteDays = 0;

      for (const dayRecords of dayMap.values()) {
        employeeName = dayRecords[0].employee.fullName;
        let pendingEntrada: Date | null = null;

        for (const record of dayRecords) {
          const evaluation = this.evaluate(record);

          if (record.type === AttendanceType.ENTRADA) {
            if (evaluation.isLate) {
              lateCount += 1;
              totalLateMinutes += evaluation.lateByMinutes ?? 0;
            }
            pendingEntrada = record.timestamp;
          } else {
            if (pendingEntrada) {
              totalWorkedMinutes +=
                (record.timestamp.getTime() - pendingEntrada.getTime()) / 60000;
              pendingEntrada = null;
            }
            totalOvertimeMinutes += evaluation.overtimeMinutes ?? 0;
          }
        }

        if (pendingEntrada) incompleteDays += 1;
      }

      summaries.push({
        employeeId,
        employeeName,
        daysPresent: dayMap.size,
        totalWorkedMinutes: Math.round(totalWorkedMinutes),
        lateCount,
        totalLateMinutes,
        totalOvertimeMinutes,
        incompleteDays,
      });
    }

    summaries.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
    return summaries;
  }

  private buildWhere(query: QueryAttendanceDto): Prisma.AttendanceWhereInput {
    const where: Prisma.AttendanceWhereInput = {};
    if (query.employeeId) where.employeeId = query.employeeId;

    if (query.dateFrom || query.dateTo) {
      where.timestamp = {
        ...(query.dateFrom
          ? {
              gte: DateTime.fromISO(query.dateFrom, { zone: this.timezone })
                .startOf('day')
                .toUTC()
                .toJSDate(),
            }
          : {}),
        ...(query.dateTo
          ? {
              lte: DateTime.fromISO(query.dateTo, { zone: this.timezone })
                .endOf('day')
                .toUTC()
                .toJSDate(),
            }
          : {}),
      };
    }

    return where;
  }

  private todayRangeUtc() {
    const now = DateTime.now().setZone(this.timezone);
    return {
      start: now.startOf('day').toUTC().toJSDate(),
      end: now.endOf('day').toUTC().toJSDate(),
    };
  }

  private evaluate(record: AttendanceWithEmployee): Evaluation {
    const { employee } = record;
    const scheduled =
      record.type === AttendanceType.ENTRADA
        ? employee.scheduledStart
        : employee.scheduledEnd;

    if (!scheduled) {
      return { isLate: null, lateByMinutes: null, overtimeMinutes: null };
    }

    const local = DateTime.fromJSDate(record.timestamp).setZone(this.timezone);
    const scheduledLocal = local.set({
      hour: scheduled.getUTCHours(),
      minute: scheduled.getUTCMinutes(),
      second: 0,
      millisecond: 0,
    });

    const diffMinutes = Math.round(local.diff(scheduledLocal, 'minutes').minutes);

    if (record.type === AttendanceType.ENTRADA) {
      return {
        isLate: diffMinutes > 0,
        lateByMinutes: diffMinutes > 0 ? diffMinutes : 0,
        overtimeMinutes: null,
      };
    }

    return {
      isLate: null,
      lateByMinutes: null,
      overtimeMinutes: diffMinutes > 0 ? diffMinutes : 0,
    };
  }

  private withEvaluation(record: AttendanceWithEmployee) {
    return {
      id: record.id,
      employeeId: record.employeeId,
      employeeName: record.employee.fullName,
      type: record.type,
      timestamp: record.timestamp,
      ...this.evaluate(record),
    };
  }
}
