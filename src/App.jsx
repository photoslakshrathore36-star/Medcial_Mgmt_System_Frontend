import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Super Admin Pages
import SuperAdminLayout from './pages/superadmin/SuperAdminLayout';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import OrganizationsPage from './pages/superadmin/OrganizationsPage';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import OrdersPage from './pages/admin/OrdersPage';
import OrderDetailPage from './pages/admin/OrderDetailPage';
import WorkersPage from './pages/admin/WorkersPage';
import DepartmentsPage from './pages/admin/DepartmentsPage';
import DoctorsPage from './pages/admin/DoctorsPage';
import AreasPage from './pages/admin/AreasPage';
import VisitPlansPage from './pages/admin/VisitPlansPage';
import FieldTrackingPage from './pages/admin/FieldTrackingPage';
import ProductionTasksPage from './pages/admin/ProductionTasksPage';
import ReportsPage from './pages/admin/ReportsPage';
import SampleInventoryPage from './pages/admin/SampleInventoryPage';
import SettingsPage from './pages/admin/SettingsPage';
import VisitsTablePage from './pages/admin/VisitsTablePage';
import DoctorHistoryPage from './pages/admin/DoctorHistoryPage';

// Production Worker Pages
import WorkerLayout from './pages/worker/WorkerLayout';
import WorkerDashboard from './pages/worker/WorkerDashboard';
import WorkerTasksPage from './pages/worker/WorkerTasksPage';

// Field Worker Pages
import FieldLayout from './pages/field/FieldLayout';
import FieldDashboard from './pages/field/FieldDashboard';
import FieldSessionPage from './pages/field/FieldSessionPage';
import FieldVisitsPage from './pages/field/FieldVisitsPage';
import RoutePlannerPage from './pages/field/RoutePlannerPage';

// Login
import LoginPage from './pages/LoginPage';

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) {
    if (user.role === 'super_admin') return <Navigate to="/superadmin" />;
    if (user.role === 'admin') return <Navigate to="/admin" />;
    if (user.role === 'worker') return <Navigate to="/worker" />;
    if (user.role === 'field_worker') return <Navigate to="/field" />;
  }
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  const defaultRedirect = () => {
    if (!user) return '/login';
    if (user.role === 'super_admin') return '/superadmin';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'worker') return '/worker';
    return '/field';
  };

  return (
    <Routes>
      <Route path="/login" element={
        !user ? <LoginPage /> : <Navigate to={defaultRedirect()} />
      } />

      {/* SUPER ADMIN ROUTES */}
      <Route path="/superadmin" element={<ProtectedRoute roles={['super_admin']}><SuperAdminLayout /></ProtectedRoute>}>
        <Route index element={<SuperAdminDashboard />} />
        <Route path="organizations" element={<OrganizationsPage />} />
      </Route>

      {/* ADMIN ROUTES */}
      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="production-tasks" element={<ProductionTasksPage />} />
        <Route path="workers" element={<WorkersPage />} />
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="doctors" element={<DoctorsPage />} />
        <Route path="doctors/:id/history" element={<DoctorHistoryPage />} />
        <Route path="areas" element={<AreasPage />} />
        <Route path="visit-plans" element={<VisitPlansPage />} />
        <Route path="field-tracking" element={<FieldTrackingPage />} />
        <Route path="visits" element={<VisitsTablePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="inventory" element={<SampleInventoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* PRODUCTION WORKER ROUTES */}
      <Route path="/worker" element={<ProtectedRoute roles={['worker']}><WorkerLayout /></ProtectedRoute>}>
        <Route index element={<WorkerDashboard />} />
        <Route path="tasks" element={<WorkerTasksPage />} />
      </Route>

      {/* FIELD WORKER ROUTES */}
      <Route path="/field" element={<ProtectedRoute roles={['field_worker']}><FieldLayout /></ProtectedRoute>}>
        <Route index element={<FieldDashboard />} />
        <Route path="session" element={<FieldSessionPage />} />
        <Route path="visits" element={<FieldVisitsPage />} />
        <Route path="route" element={<RoutePlannerPage />} />
      </Route>

      <Route path="/" element={<Navigate to={defaultRedirect()} />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          duration: 3000,
          style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' }
        }} />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
