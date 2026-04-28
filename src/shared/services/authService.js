import { supabase } from '../../lib/supabase';

export const authService = {
  async sendPasswordReset(email) {
    const redirectTo = `${window.location.origin}/reset-password`;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    return data;
  },

  async register(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });
    if (error) throw error;
    return data;
  },

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