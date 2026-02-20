import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './shared/pages/Login.jsx';
import Register from './shared/pages/Register.jsx';
import UserDashboard from './user/pages/Dashboard.jsx';
import AdminDashboard from './admin/pages/Dashboard.jsx';
import { useAuth } from './shared/hooks/useAuth'; // Hook que criaremos

export default function App() {
  const { user, profile, loading } = useAuth();

  if (loading) return <div>Carregando...</div>;

  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />

        {/* Redirecionamento Baseado em Role */}
        <Route path="/" element={
          user ? (
            profile?.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />
          ) : <Navigate to="/login" />
        } />

        {/* Rotas de Usuário */}
        <Route path="/dashboard" element={user ? <UserDashboard /> : <Navigate to="/login" />} />

        {/* Rotas de Admin */}
        <Route path="/admin" element={profile?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}