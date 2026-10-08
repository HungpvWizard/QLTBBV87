import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import AssetList from './pages/AssetList';
import MaintenanceList from './pages/MaintenanceList';
import TransferHistory from './pages/TransferHistory';
import RepairRequests from './pages/RepairRequests';
import CategoryList from './pages/CategoryList';
import Settings from './pages/Settings';
import UsersPage from './pages/UsersPage';
import EquipmentsPage from './pages/EquipmentsPage';
import ReportsPage from './pages/ReportsPage';
import KpiPage from './pages/KpiPage';
import { ServerRedirectModal } from './components/ServerRedirectModal';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <ServerRedirectModal />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="assets" element={<AssetList />} />
            <Route path="transfers" element={<TransferHistory />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="kpi" element={<KpiPage />} />
            <Route path="maintenance" element={<MaintenanceList />} />
            <Route path="repair-requests" element={<RepairRequests />} />
            <Route path="categories" element={<CategoryList />} />
            <Route path="equipments" element={<EquipmentsPage />} />
            <Route path="settings" element={<Settings />} />
            <Route path="users" element={
              <ProtectedRoute requiredRoles={['Admin', 'Manager']}>
                <UsersPage />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ToastProvider>
  );
}

export default App;
