import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';

export default function ResetPassword() {
  const [processing, setProcessing] = useState(true);
  const [password, setPassword] = useState('');
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        // Process possible session/access token in URL (Supabase may include it)
        // storeSession true will save the session in localStorage
        const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
        if (error) {
          // If there's no session to retrieve, user may need to open the link and then set password
          setReady(true);
        } else if (data?.session) {
          setReady(true);
        } else {
          setReady(true);
        }
      } catch (err) {
        setReady(true);
      } finally {
        setProcessing(false);
      }
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setProcessing(true);
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Senha atualizada com sucesso. Faça login.');
      navigate('/login');
    } catch (err) {
      toast.error('Não foi possível atualizar a senha. Tente novamente.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-wrapper">
        <div className="login-card">
          <h2>Recuperar Senha</h2>
          {processing ? (
            <p>Processando link...</p>
          ) : ready ? (
            <form onSubmit={handleSubmit} className="login-form">
              <div className="field-group">
                <label htmlFor="newPassword">Nova senha</label>
                <input
                  id="newPassword"
                  type="password"
                  placeholder="Digite sua nova senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit">{processing ? 'Atualizando...' : 'Atualizar Senha'}</Button>
            </form>
          ) : (
            <p>Link inválido ou expirado. Solicite um novo e-mail de recuperação.</p>
          )}
        </div>
      </div>
    </div>
  );
}
