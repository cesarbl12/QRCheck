import { api } from '../../api/client';
import type { Employee, EmployeeFormValues } from './types';

function toPayload(values: Partial<EmployeeFormValues>) {
  return {
    ...values,
    scheduledStart: values.scheduledStart || '',
    scheduledEnd: values.scheduledEnd || '',
  };
}

export async function listEmployees(params?: { active?: boolean; search?: string }) {
  const res = await api.get<Employee[]>('/employees', {
    params: {
      active: params?.active === undefined ? undefined : String(params.active),
      search: params?.search || undefined,
    },
  });
  return res.data;
}

export async function getEmployee(id: string) {
  const res = await api.get<Employee>(`/employees/${id}`);
  return res.data;
}

export async function createEmployee(values: EmployeeFormValues) {
  const res = await api.post<Employee>('/employees', toPayload(values));
  return res.data;
}

export async function updateEmployee(id: string, values: Partial<EmployeeFormValues>) {
  const res = await api.patch<Employee>(`/employees/${id}`, toPayload(values));
  return res.data;
}

export async function deactivateEmployee(id: string) {
  const res = await api.delete<Employee>(`/employees/${id}`);
  return res.data;
}

export async function reactivateEmployee(id: string) {
  const res = await api.patch<Employee>(`/employees/${id}`, { active: true });
  return res.data;
}

export async function regenerateQr(id: string) {
  const res = await api.post<Employee>(`/employees/${id}/qr/regenerate`);
  return res.data;
}

export async function fetchQrImageBlobUrl(id: string, format: 'png' | 'svg' = 'png') {
  const res = await api.get(`/employees/${id}/qr`, {
    params: { format },
    responseType: 'blob',
  });
  return URL.createObjectURL(res.data as Blob);
}

export async function uploadEmployeePhoto(id: string, photo: Blob, filename = 'photo.jpg') {
  const formData = new FormData();
  formData.append('photo', photo, filename);
  const res = await api.post<Employee>(`/employees/${id}/photo`, formData);
  return res.data;
}

export async function fetchEmployeePhotoBlobUrl(id: string) {
  const res = await api.get(`/employees/${id}/photo`, { responseType: 'blob' });
  return URL.createObjectURL(res.data as Blob);
}
