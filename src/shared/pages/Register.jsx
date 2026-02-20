import React, { useState } from 'react';
import { authService } from '../services/authService';
import { Wallet } from 'lucide-react';
import { toast } from 'react-toastify';

// Use os componentes Card, Input e Button que você já tem no shared/components
export default function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await authService.register(formData.email, formData.password, formData.name);
      toast.success('Conta criada! Verifique seu e-mail.');
    } catch {
      toast.error('Não foi possível concluir o cadastro. Verifique os dados e tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex bg-emerald-100 p-4 rounded-2xl text-emerald-600 mb-4 shadow-sm">
            <Wallet size={32} />
          </div>
          <h1 className="text-2xl font-bold">Criar Conta</h1>
          <p className="text-slate-500">Comece a gerenciar suas finanças hoje</p>
        </div>
        
        {/* Formulário similar ao seu de Login, adicionando campo de Nome */}
      </div>
    </div>
  );
}