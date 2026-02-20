import { supabase } from '../../lib/supabase';

export const transactionService = {
  async getAuthenticatedUserId() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user?.id) {
      throw new Error('Usuário não autenticado.');
    }

    return user.id;
  },

  // Buscar transações do usuário logado
  async getTransactions() {
    const userId = await this.getAuthenticatedUserId();

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Adicionar novo lançamento
  async addTransaction(transactionData) {
    const userId = await this.getAuthenticatedUserId();

    const { data, error } = await supabase
      .from('transactions')
      .insert([{ ...transactionData, user_id: userId }]);
    
    if (error) throw error;
    return data;
  },

  // Remover lançamento
  async deleteTransaction(id) {
    const userId = await this.getAuthenticatedUserId();

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
  }
};