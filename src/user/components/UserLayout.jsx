import React, { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  ChartNoAxesColumn,
  Target,
  ListOrdered,
  CreditCard,
  TrendingUp,
  PieChart,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { authService } from '../../shared/services/authService';
import { useAuth } from '../../shared/hooks/useAuth';
import { toast } from 'react-toastify';
import '../styles/clareza.css';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: ChartNoAxesColumn, end: true },
  { to: '/dashboard/planejamento', label: 'Planejamento', icon: Target },
  { to: '/dashboard/lancamentos', label: 'Lançamentos', icon: ListOrdered },
  { to: '/dashboard/cartoes', label: 'Cartões', icon: CreditCard },
  { to: '/dashboard/investimentos', label: 'Investimentos', icon: TrendingUp },
  { to: '/dashboard/relatorios', label: 'Relatórios', icon: PieChart },
];

export default function UserLayout() {
  const { profile } = useAuth();
  const [theme, setTheme] = useState(() => localStorage.getItem('dashboard-theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dashboard-theme', theme);
  }, [theme]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      toast.info('Logout realizado com sucesso.');
    } catch {
      toast.error('Erro ao sair da conta.');
    }
  };

  return (
    <div className="clar-layout-root">
      <aside className="clar-sidebar">
        <div className="clar-logo">
          <TrendingUp size={18} />
          <span>Meu Controle Financeiro</span>
        </div>

        <nav className="clar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `clar-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="clar-sidebar-footer">
          <button
            type="button"
            className="clar-theme-toggle"
            onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            title="Alternar tema"
            aria-label="Alternar tema"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            <span>{theme === 'light' ? 'Modo escuro' : 'Modo claro'}</span>
          </button>

          <button type="button" className="clar-logout" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Sair</span>
          </button>

          <small className="clar-user">{profile?.full_name || profile?.email || 'Usuário'}</small>
        </div>
      </aside>

      <main className="clar-main">
        <Outlet />
      </main>
    </div>
  );
}
