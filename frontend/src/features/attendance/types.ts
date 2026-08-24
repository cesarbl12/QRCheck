export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'ENTRADA' | 'SALIDA';
  timestamp: string;
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
