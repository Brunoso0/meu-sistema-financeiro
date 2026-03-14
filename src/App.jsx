import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './shared/pages/Login.jsx';
import Register from './shared/pages/Register.jsx';
import AdminDashboard from './admin/pages/Dashboard.jsx';
import { useAuth } from './shared/hooks/useAuth';
import UserLayout from './user/components/UserLayout.jsx';
import DashboardHome from './user/pages/DashboardHome.jsx';
import Planning from './user/pages/Planning.jsx';
import Transactions from './user/pages/Transactions.jsx';
import Cards from './user/pages/Cards.jsx';
import Investments from './user/pages/Investments.jsx';
import Reports from './user/pages/Reports.jsx';

export default function App() {
  const { user, profile, loading } = useAuth();

  if (loading) return <div>Carregando...</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />

        <Route path="/" element={
          user ? (
            profile?.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />
          ) : <Navigate to="/login" />
        } />

        <Route path="/dashboard" element={user ? <UserLayout /> : <Navigate to="/login" />}>
          <Route index element={<DashboardHome />} />
          <Route path="planejamento" element={<Planning />} />
          <Route path="lancamentos" element={<Transactions />} />
          <Route path="cartoes" element={<Cards />} />
          <Route path="investimentos" element={<Investments />} />
          <Route path="relatorios" element={<Reports />} />
        </Route>

        <Route path="/admin" element={profile?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}