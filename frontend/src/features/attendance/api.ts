import { api } from '../../api/client';
import type { AttendanceRecord, EmployeeAttendanceSummary } from './types';

export async function listAttendance(params?: {
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const res = await api.get<AttendanceRecord[]>('/attendance', { params });
  return res.data;
}

export async function getAttendanceSummary(params?: {
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const res = await api.get<EmployeeAttendanceSummary[]>('/attendance/summary', { params });
  return res.data;
}

export interface ScanResult {
  employeeName: string;
  type: 'ENTRADA' | 'SALIDA';
  timestamp: string;
  duplicate: boolean;
}

export async function scanBadge(token: string) {
  const res = await api.post<ScanResult>('/attendance/scan', { token });
  return res.data;
}
