import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  deactivateEmployee,
  fetchEmployeePhotoBlobUrl,
  listEmployees,
  reactivateEmployee,
} from '../../employees/api';
import type { Employee } from '../../employees/types';

function EmployeeAvatar({ employee }: { employee: Employee }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!employee.hasPhoto) return;
    let objectUrl: string | null = null;
    fetchEmployeePhotoBlobUrl(employee.id).then((u) => {
      objectUrl = u;
      setUrl(u);
    });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [employee.id, employee.hasPhoto]);

  return (
    <div className="avatar">
      {url ? (
        <img src={url} alt="" />
      ) : (
        <span className="avatar__placeholder">{employee.fullName.charAt(0)}</span>
      )}
    </div>
  );
}

export function EmployeesListPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await listEmployees({
        active: showInactive ? undefined : true,
        search: search || undefined,
      });
      setEmployees(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  async function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    await load();
  }

  async function handleToggleActive(employee: Employee) {
    if (employee.active) {
      if (!confirm(`¿Desactivar a ${employee.fullName}? Su QR dejará de funcionar.`)) return;
      await deactivateEmployee(employee.id);
    } else {
      await reactivateEmployee(employee.id);
    }
    await load();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Empleados</h1>
        <Link to="/admin/employees/new" className="button">
          + Nuevo empleado
        </Link>
      </div>

      <form className="toolbar" onSubmit={handleSearchSubmit}>
        <input
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Mostrar inactivos
        </label>
        <button type="submit">Buscar</button>
      </form>

      {loading ? (
        <p className="muted">Cargando...</p>
      ) : employees.length === 0 ? (
        <p className="muted">No hay empleados registrados.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th></th>
              <th>Nombre</th>
              <th>Puesto</th>
              <th>Contacto</th>
              <th>Horario</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id} className={employee.active ? '' : 'row-inactive'}>
                <td>
                  <EmployeeAvatar employee={employee} />
                </td>
                <td>{employee.fullName}</td>
                <td>{employee.position}</td>
                <td>{employee.contact}</td>
                <td>
                  {employee.scheduledStart && employee.scheduledEnd
                    ? `${employee.scheduledStart} - ${employee.scheduledEnd}`
                    : '—'}
                </td>
                <td>
                  <span className={`badge ${employee.active ? 'badge--active' : 'badge--inactive'}`}>
                    {employee.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="table-actions">
                  <Link to={`/admin/employees/${employee.id}/edit`}>Editar</Link>
                  <Link to={`/admin/employees/${employee.id}/badge`}>Gafete</Link>
                  <button type="button" className="link-button" onClick={() => handleToggleActive(employee)}>
                    {employee.active ? 'Desactivar' : 'Reactivar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
