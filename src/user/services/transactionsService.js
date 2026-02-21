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

  // Adicionar novo lançamento (suporta objeto único ou array)
  async addTransaction(transactionData) {
    const userId = await this.getAuthenticatedUserId();

    const payload = Array.isArray(transactionData)
      ? transactionData.map((item) => ({ ...item, user_id: userId }))
      : [{ ...transactionData, user_id: userId }];

    const { data, error } = await supabase
      .from('transactions')
      .insert(payload);
    
    if (error) throw error;
    return data;
  },

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