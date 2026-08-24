import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { LoginPage } from './features/auth/LoginPage';
import { ScannerPage } from './features/scanner/ScannerPage';
import { AdminLayout } from './features/admin/AdminLayout';
import { EmployeesListPage } from './features/admin/employees/EmployeesListPage';
import { EmployeeFormPage } from './features/admin/employees/EmployeeFormPage';
import { EmployeeBadgePage } from './features/admin/employees/EmployeeBadgePage';
import { AttendanceDashboardPage } from './features/admin/attendance/AttendanceDashboardPage';
import { AttendanceLogPage } from './features/admin/attendance/AttendanceLogPage';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'ADMIN' ? '/admin/employees' : '/scanner'} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute allow="SCANNER" />}>
        <Route path="/scanner" element={<ScannerPage />} />
      </Route>

      <Route element={<ProtectedRoute allow="ADMIN" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="employees" replace />} />
          <Route path="employees" element={<EmployeesListPage />} />
          <Route path="employees/new" element={<EmployeeFormPage />} />
          <Route path="employees/:id/edit" element={<EmployeeFormPage />} />
          <Route path="employees/:id/badge" element={<EmployeeBadgePage />} />
          <Route path="attendance" element={<AttendanceDashboardPage />} />
          <Route path="registro" element={<AttendanceLogPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
