import { useEffect, useState, type FormEvent } from 'react';
import { getAttendanceSummary } from '../../attendance/api';
import type { EmployeeAttendanceSummary } from '../../attendance/types';
import { listEmployees } from '../../employees/api';
import type { Employee } from '../../employees/types';
import { getCatorcenaInfo, updateCatorcenaAnchor, type CatorcenaInfo } from '../../settings/api';

function formatMinutes(minutes: number) {
  if (minutes <= 0) return '0h 0m';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
}

function formatShortDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  });
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const PERIOD_LENGTH_DAYS = 14;

export function AttendanceDashboardPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [summary, setSummary] = useState<EmployeeAttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [catorcena, setCatorcena] = useState<CatorcenaInfo | null>(null);
  const [viewedPeriodNumber, setViewedPeriodNumber] = useState(1);
  const [showAnchorForm, setShowAnchorForm] = useState(false);
  const [anchorInput, setAnchorInput] = useState('');
  const [savingAnchor, setSavingAnchor] = useState(false);

  useEffect(() => {
    listEmployees({ active: undefined }).then(setEmployees);
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function init() {
    const info = await getCatorcenaInfo();
    setCatorcena(info);
    setViewedPeriodNumber(info.periodNumber);
    setAnchorInput(info.anchorDate);
    setDateFrom(info.periodStart);
    setDateTo(info.periodEnd);
    await loadSummary({ dateFrom: info.periodStart, dateTo: info.periodEnd });
  }

  function periodRange(anchorDate: string, periodNumber: number) {
    const start = addDays(anchorDate, (periodNumber - 1) * PERIOD_LENGTH_DAYS);
    const end = addDays(start, PERIOD_LENGTH_DAYS - 1);
    return { start, end };
  }

  async function goToPeriod(periodNumber: number) {
    if (!catorcena || periodNumber < 1) return;
    const range = periodRange(catorcena.anchorDate, periodNumber);
    setViewedPeriodNumber(periodNumber);
    setDateFrom(range.start);
    setDateTo(range.end);
    await loadSummary({ dateFrom: range.start, dateTo: range.end });
  }

  async function loadSummary(range: { dateFrom: string; dateTo: string }) {
    setLoading(true);
    try {
      const summaryData = await getAttendanceSummary({
        employeeId: employeeId || undefined,
        dateFrom: range.dateFrom || undefined,
        dateTo: range.dateTo || undefined,
      });
      setSummary(summaryData);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterSubmit(e: FormEvent) {
    e.preventDefault();
    loadSummary({ dateFrom, dateTo });
  }

  async function handleUseCurrentPeriod() {
    const info = await getCatorcenaInfo();
    setCatorcena(info);
    setViewedPeriodNumber(info.periodNumber);
    setAnchorInput(info.anchorDate);
    setDateFrom(info.periodStart);
    setDateTo(info.periodEnd);
    await loadSummary({ dateFrom: info.periodStart, dateTo: info.periodEnd });
  }

  async function handleSaveAnchor(e: FormEvent) {
    e.preventDefault();
    setSavingAnchor(true);
    try {
      const info = await updateCatorcenaAnchor(anchorInput);
      setCatorcena(info);
      setViewedPeriodNumber(info.periodNumber);
      setDateFrom(info.periodStart);
      setDateTo(info.periodEnd);
      setShowAnchorForm(false);
      await loadSummary({ dateFrom: info.periodStart, dateTo: info.periodEnd });
    } finally {
      setSavingAnchor(false);
    }
  }

  const totals = summary.reduce(
    (acc, row) => ({
      employeesPresent: acc.employeesPresent + 1,
      totalWorkedMinutes: acc.totalWorkedMinutes + row.totalWorkedMinutes,
      lateCount: acc.lateCount + row.lateCount,
      incompleteDays: acc.incompleteDays + row.incompleteDays,
    }),
    { employeesPresent: 0, totalWorkedMinutes: 0, lateCount: 0, incompleteDays: 0 },
  );

  const isCurrentPeriod = catorcena && viewedPeriodNumber === catorcena.periodNumber;
  const viewedRange = catorcena ? periodRange(catorcena.anchorDate, viewedPeriodNumber) : null;

  return (
    <div>
      <div className="page-header">
        <h1>Asistencia</h1>
      </div>

      {catorcena && viewedRange && (
        <div className="period-banner">
          <div className="period-banner__nav">
            <button
              type="button"
              className="button-secondary period-nav-btn"
              onClick={() => goToPeriod(viewedPeriodNumber - 1)}
              disabled={viewedPeriodNumber <= 1}
              aria-label="Catorcena anterior"
            >
              ‹
            </button>
            <div>
              <strong>Catorcena {viewedPeriodNumber}</strong>
              <span className="muted">
                {' '}
                · {formatShortDate(viewedRange.start)} – {formatShortDate(viewedRange.end)}
              </span>
              {!isCurrentPeriod && <span className="badge badge--neutral"> Viendo otro rango</span>}
            </div>
            <button
              type="button"
              className="button-secondary period-nav-btn"
              onClick={() => goToPeriod(viewedPeriodNumber + 1)}
              aria-label="Catorcena siguiente"
            >
              ›
            </button>
          </div>
          <div className="period-banner__actions">
            {!isCurrentPeriod && (
              <button type="button" className="button-secondary" onClick={handleUseCurrentPeriod}>
                Ver catorcena actual
              </button>
            )}
            <button
              type="button"
              className="link-button"
              onClick={() => setShowAnchorForm((s) => !s)}
            >
              Configurar inicio de catorcena
            </button>
          </div>
        </div>
      )}

      {showAnchorForm && (
        <form className="toolbar" onSubmit={handleSaveAnchor}>
          <label>
            Fecha de inicio de la catorcena actual
            <input
              type="date"
              value={anchorInput}
              onChange={(e) => setAnchorInput(e.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={savingAnchor}>
            {savingAnchor ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      )}

      <form className="toolbar" onSubmit={handleFilterSubmit}>
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
      ) : (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-card__value">{totals.employeesPresent}</span>
              <span className="kpi-card__label">Empleados con actividad</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-card__value">{formatMinutes(totals.totalWorkedMinutes)}</span>
              <span className="kpi-card__label">Horas trabajadas (total)</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-card__value">{totals.lateCount}</span>
              <span className="kpi-card__label">Llegadas tarde</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-card__value">{totals.incompleteDays}</span>
              <span className="kpi-card__label">Jornadas sin cerrar</span>
            </div>
          </div>

          <h2 className="section-title">Resumen por empleado</h2>
          {summary.length === 0 ? (
            <p className="muted">Sin actividad para el periodo seleccionado.</p>
          ) : (
            <table className="table table--spaced">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Días con actividad</th>
                  <th>Horas trabajadas</th>
                  <th>Llegadas tarde</th>
                  <th>Horas extra</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr key={row.employeeId}>
                    <td>{row.employeeName}</td>
                    <td>{row.daysPresent}</td>
                    <td>{formatMinutes(row.totalWorkedMinutes)}</td>
                    <td>
                      {row.lateCount > 0 ? (
                        <span className="badge badge--inactive">
                          {row.lateCount} ({formatMinutes(row.totalLateMinutes)})
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      {row.totalOvertimeMinutes > 0 ? (
                        <span className="badge badge--active">
                          {formatMinutes(row.totalOvertimeMinutes)}
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      {row.incompleteDays > 0 ? (
                        <span className="badge badge--inactive">
                          {row.incompleteDays} sin salida
                        </span>
                      ) : (
                        <span className="badge badge--active">Completo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
