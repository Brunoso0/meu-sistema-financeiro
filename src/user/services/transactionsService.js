import { supabase } from '../../lib/supabase';

export const transactionService = {
  // Buscar transações do usuário logado
  async getTransactions() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Adicionar novo lançamento
  async addTransaction(transactionData, userId) {
    const { data, error } = await supabase
      .from('transactions')
      .insert([{ ...transactionData, user_id: userId }]);
    
    if (error) throw error;
    return data;
  },

  // Remover lançamento
  async deleteTransaction(id) {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};