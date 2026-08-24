export interface Employee {
  id: string;
  fullName: string;
  position: string;
  contact: string;
  rfc: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  qrToken: string;
  active: boolean;
  hasPhoto: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeFormValues {
  fullName: string;
  position: string;
  contact: string;
  rfc: string;
  scheduledStart: string;
  scheduledEnd: string;
}
