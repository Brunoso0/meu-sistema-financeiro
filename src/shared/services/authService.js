import { supabase } from '../../lib/supabase';

export const authService = {
  // Registro de novo usuário
  async register(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName } // Metadados iniciais
      }
    });
    if (error) throw error;
    return data;
  },

  // Login unificado
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async logout() {
    await supabase.auth.signOut();
  }
};