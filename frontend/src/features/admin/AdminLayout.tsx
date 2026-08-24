import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">QRCheck</div>
        <nav className="admin-nav">
          <NavLink to="/admin/employees" className="admin-nav__link">
            Empleados
          </NavLink>
          <NavLink to="/admin/attendance" className="admin-nav__link">
            Asistencia
          </NavLink>
          <NavLink to="/admin/registro" className="admin-nav__link">
            Registro
          </NavLink>
        </nav>
        <div className="admin-sidebar__footer">
          <span className="muted">{user?.username}</span>
          <button type="button" className="link-button" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
