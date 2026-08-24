import { useEffect, useState } from 'react';
import { listAttendance } from '../../attendance/api';
import type { AttendanceRecord } from '../../attendance/types';
import { listEmployees } from '../../employees/api';
import type { Employee } from '../../employees/types';

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function AttendanceLogPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [dateFrom, setDateFrom] = useState(todayIso());
  const [dateTo, setDateTo] = useState(todayIso());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listEmployees({ active: undefined }).then(setEmployees);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await listAttendance({
        employeeId: employeeId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setRecords(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Registro</h1>
      </div>

      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          <option value="">Todos los empleados</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.fullName}
            </option>
          ))}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <button type="submit">Filtrar</button>
      </form>

      {loading ? (
        <p className="muted">Cargando...</p>
      ) : records.length === 0 ? (
        <p className="muted">Sin registros para el filtro seleccionado.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Empleado</th>
              <th>Tipo</th>
              <th>Fecha y hora</th>
              <th>Puntualidad</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td>{record.employeeName}</td>
                <td>
                  <span
                    className={`badge ${record.type === 'ENTRADA' ? 'badge--active' : 'badge--neutral'}`}
                  >
                    {record.type}
                  </span>
                </td>
                <td>{new Date(record.timestamp).toLocaleString('es-MX')}</td>
                <td>
                  {record.type === 'ENTRADA' && record.isLate !== null && (
                    <span className={record.isLate ? 'badge badge--inactive' : 'badge badge--active'}>
                      {record.isLate ? `Tarde (${record.lateByMinutes} min)` : 'A tiempo'}
                    </span>
                  )}
                  {record.type === 'SALIDA' && record.overtimeMinutes !== null && (
                    <span
                      className={
                        record.overtimeMinutes > 0 ? 'badge badge--active' : 'badge badge--neutral'
                      }
                    >
                      {record.overtimeMinutes > 0
                        ? `+${record.overtimeMinutes} min extra`
                        : 'Salida regular'}
                    </span>
                  )}
                  {record.isLate === null && record.overtimeMinutes === null && (
                    <span className="muted">Sin horario asignado</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
