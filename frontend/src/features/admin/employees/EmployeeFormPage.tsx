import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createEmployee,
  fetchEmployeePhotoBlobUrl,
  getEmployee,
  updateEmployee,
  uploadEmployeePhoto,
} from '../../employees/api';
import type { EmployeeFormValues } from '../../employees/types';
import { PhotoCapture } from '../../employees/PhotoCapture';

const EMPTY_FORM: EmployeeFormValues = {
  fullName: '',
  position: '',
  contact: '',
  rfc: '',
  scheduledStart: '',
  scheduledEnd: '',
};

export function EmployeeFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [values, setValues] = useState<EmployeeFormValues>(EMPTY_FORM);
  const [hasSchedule, setHasSchedule] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getEmployee(id).then((employee) => {
      setValues({
        fullName: employee.fullName,
        position: employee.position,
        contact: employee.contact,
        rfc: employee.rfc ?? '',
        scheduledStart: employee.scheduledStart ?? '',
        scheduledEnd: employee.scheduledEnd ?? '',
      });
      setHasSchedule(Boolean(employee.scheduledStart || employee.scheduledEnd));
      if (employee.hasPhoto) {
        fetchEmployeePhotoBlobUrl(employee.id).then((url) => {
          objectUrlRef.current = url;
          setPhotoPreviewUrl(url);
        });
      }
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function update<K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handlePhotoCapture(blob: Blob) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(blob);
    objectUrlRef.current = url;
    setPhotoBlob(blob);
    setPhotoPreviewUrl(url);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isEditing && !photoBlob) {
      setError('Toma o sube una foto del empleado para generar su gafete.');
      return;
    }

    setSaving(true);

    const payload: EmployeeFormValues = {
      ...values,
      scheduledStart: hasSchedule ? values.scheduledStart : '',
      scheduledEnd: hasSchedule ? values.scheduledEnd : '',
    };

    try {
      let employeeId = id;
      if (isEditing && employeeId) {
        await updateEmployee(employeeId, payload);
      } else {
        const employee = await createEmployee(payload);
        employeeId = employee.id;
      }

      if (photoBlob && employeeId) {
        await uploadEmployeePhoto(employeeId, photoBlob);
      }

      if (!isEditing && employeeId) {
        navigate(`/admin/employees/${employeeId}/badge`, { replace: true });
        return;
      }
      navigate('/admin/employees');
    } catch {
      setError('No se pudo guardar el empleado. Revisa los datos ingresados.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="muted">Cargando...</p>;

  return (
    <div>
      <h1>{isEditing ? 'Editar empleado' : 'Nuevo empleado'}</h1>

      <form className="card form" onSubmit={handleSubmit}>
        <label>
          Nombre completo
          <input
            value={values.fullName}
            onChange={(e) => update('fullName', e.target.value)}
            required
          />
        </label>

        <label>
          Puesto / área
          <input
            value={values.position}
            onChange={(e) => update('position', e.target.value)}
            required
          />
        </label>

        <label>
          Contacto (correo o teléfono)
          <input
            value={values.contact}
            onChange={(e) => update('contact', e.target.value)}
            required
          />
        </label>

        <label>
          RFC
          <input
            value={values.rfc}
            onChange={(e) => update('rfc', e.target.value.toUpperCase())}
            maxLength={13}
            required
          />
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={hasSchedule}
            onChange={(e) => setHasSchedule(e.target.checked)}
          />
          Este empleado tiene horario fijo
        </label>

        {hasSchedule && (
          <div className="form-row">
            <label>
              Hora de entrada
              <input
                type="time"
                value={values.scheduledStart}
                onChange={(e) => update('scheduledStart', e.target.value)}
                required={hasSchedule}
              />
            </label>
            <label>
              Hora de salida
              <input
                type="time"
                value={values.scheduledEnd}
                onChange={(e) => update('scheduledEnd', e.target.value)}
                required={hasSchedule}
              />
            </label>
          </div>
        )}

        <label>
          Foto (aparecerá en el gafete)
          <PhotoCapture previewUrl={photoPreviewUrl} onCapture={handlePhotoCapture} />
        </label>

        {error && <p className="error-text">{error}</p>}

        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" className="button-secondary" onClick={() => navigate(-1)}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
