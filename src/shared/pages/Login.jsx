import React, { useState } from 'react';
import { authService } from '../services/authService';
import Button from '../components/Button';
import { Wallet, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import '../styles/login.css';

export default function Login() {
  const MAX_FAILED_ATTEMPTS = 5;
  const BLOCK_TIME_MS = 30_000;

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ fullName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState(0);

  const remainingBlockSeconds = Math.max(0, Math.ceil((blockedUntil - Date.now()) / 1000));
  const isBlocked = remainingBlockSeconds > 0;

  const toggleMode = () => {
    setIsRegisterMode((prev) => !prev);
    setLoginError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isBlocked) {
      setLoginError(`Muitas tentativas. Aguarde ${remainingBlockSeconds}s e tente novamente.`);
      return;
    }

    try {
      setLoading(true);
      setLoginError('');
      await authService.login(formData.email, formData.password);
      setFailedAttempts(0);
    } catch (error) {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);

      if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
        setBlockedUntil(Date.now() + BLOCK_TIME_MS);
        setFailedAttempts(0);
        setLoginError('Muitas tentativas inválidas. Aguarde 30s e tente novamente.');
      } else {
        setLoginError('Credenciais inválidas.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (isBlocked) {
      toast.error(`Muitas tentativas. Aguarde ${remainingBlockSeconds}s e tente novamente.`);
      return;
    }

    try {
      setLoading(true);
      await authService.register(registerData.email, registerData.password, registerData.fullName);
      toast.success('Conta criada! Verifique seu e-mail para confirmar o cadastro.');
      setFailedAttempts(0);
      setFormData({ email: registerData.email, password: '' });
      setRegisterData({ fullName: '', email: '', password: '' });
      setIsRegisterMode(false);
    } catch (error) {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);

      if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
        setBlockedUntil(Date.now() + BLOCK_TIME_MS);
        setFailedAttempts(0);
        toast.error('Muitas tentativas inválidas. Aguarde 30s e tente novamente.');
      } else {
        toast.error('Não foi possível concluir o cadastro. Verifique os dados e tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-wrapper">
        <div className="login-brand">
          <div className="login-brand-icon">
            <Wallet size={26} />
          </div>
          <h1>Controle Financeiro</h1>
          <p>{isRegisterMode ? 'Crie sua conta para começar' : 'Faça login para gerenciar seus gastos'}</p>
        </div>

        <div className="login-card">
          {isRegisterMode ? (
            <form onSubmit={handleRegisterSubmit} className="login-form">
              <div className="field-group">
                <label htmlFor="fullName">NOME COMPLETO</label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome completo"
                  value={registerData.fullName}
                  onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                  required
                />
              </div>

              <div className="field-group">
                <label htmlFor="registerEmail">EMAIL</label>
                <input
                  id="registerEmail"
                  type="email"
                  placeholder="seu@email.com"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  required
                />
              </div>

              <div className="field-group">
                <label htmlFor="registerPassword">SENHA</label>
                <input
                  id="registerPassword"
                  type="password"
                  placeholder="Digite uma senha"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  required
                />
              </div>

              <Button type="submit" icon={Lock} className="login-submit-btn">
                {loading ? 'Criando conta...' : isBlocked ? `Aguarde ${remainingBlockSeconds}s` : 'Criar Conta'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="login-form">
              <div className="field-group">
                <label htmlFor="email">EMAIL</label>
                <input
                  id="email"
                  type="email"
                  placeholder="admin@teste.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="field-group">
                <label htmlFor="password">SENHA</label>
                <input
                  id="password"
                  type="password"
                  placeholder="admin123"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>

              {loginError && (
                <div className="login-error-box">
                  <AlertCircle size={16} />
                  {loginError}
                </div>
              )}

              <Button type="submit" icon={Lock} className="login-submit-btn">
                {loading ? 'Entrando...' : isBlocked ? `Aguarde ${remainingBlockSeconds}s` : 'Entrar no Sistema'}
              </Button>
            </form>
          )}

          <div className="login-switch-row">
            {isRegisterMode ? 'Já possui conta?' : 'Ainda não possui conta?'}{' '}
            <button type="button" className="login-switch-btn" onClick={toggleMode}>
              {isRegisterMode ? 'Entrar' : 'Crie uma'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
