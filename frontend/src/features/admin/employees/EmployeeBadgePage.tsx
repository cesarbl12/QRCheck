import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  fetchEmployeePhotoBlobUrl,
  fetchQrImageBlobUrl,
  getEmployee,
  regenerateQr,
} from '../../employees/api';
import type { Employee } from '../../employees/types';

export function EmployeeBadgePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  async function load() {
    if (!id) return;
    const emp = await getEmployee(id);
    setEmployee(emp);
    const url = await fetchQrImageBlobUrl(id);
    setQrUrl(url);
    if (emp.hasPhoto) {
      const photo = await fetchEmployeePhotoBlobUrl(id);
      setPhotoUrl(photo);
    } else {
      setPhotoUrl(null);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleRegenerate() {
    if (!id) return;
    if (
      !confirm(
        'Esto invalida el gafete impreso actual y genera uno nuevo. ¿Continuar?',
      )
    )
      return;
    setRegenerating(true);
    try {
      await regenerateQr(id);
      await load();
    } finally {
      setRegenerating(false);
    }
  }

  if (!employee || !qrUrl) return <p className="muted">Cargando...</p>;

  return (
    <div>
      <div className="page-header no-print">
        <h1>Gafete de {employee.fullName}</h1>
        <div className="form-actions">
          <button type="button" onClick={() => window.print()}>
            Imprimir
          </button>
          <button type="button" className="button-secondary" onClick={handleRegenerate} disabled={regenerating}>
            {regenerating ? 'Regenerando...' : 'Regenerar QR'}
          </button>
          <button type="button" className="button-secondary" onClick={() => navigate('/admin/employees')}>
            Volver
          </button>
        </div>
      </div>

      <div className="badge-print-area">
        <div className="id-badge">
          <div className="id-badge__brand">GBT</div>
          <div className="id-badge__photo">
            {photoUrl ? (
              <img src={photoUrl} alt={`Foto de ${employee.fullName}`} />
            ) : (
              <span className="id-badge__photo-placeholder">Sin foto</span>
            )}
          </div>
          <div className="id-badge__name">{employee.fullName}</div>
          <div className="id-badge__position">{employee.position}</div>
          <img src={qrUrl} alt={`Código QR de ${employee.fullName}`} className="id-badge__qr" />
        </div>
      </div>
    </div>
  );
}
