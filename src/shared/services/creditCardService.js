import { supabase } from '../../lib/supabase';

export const creditCardService = {
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

  async getCreditCards() {
    const userId = await this.getAuthenticatedUserId();

    try {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', userId)
        .order('bank_name', { ascending: true });

      if (error) {
        console.error('Erro na query credit_cards:', error);
        throw error;
      }
      return data ?? [];
    } catch (error) {
      console.error('Erro ao buscar cartões:', error);
      throw error;
    }
  },

  async addCreditCard(cardData) {
    const userId = await this.getAuthenticatedUserId();

    if (!cardData.bank_name?.trim()) {
      throw new Error('Nome do banco é obrigatório');
    }
    if (!cardData.closing_day || isNaN(cardData.closing_day)) {
      throw new Error('Dia de fechamento inválido');
    }
    if (!cardData.due_day || isNaN(cardData.due_day)) {
      throw new Error('Dia de vencimento inválido');
    }

    const payload = {
      bank_name: cardData.bank_name.trim(),
      interest_rate: Number(cardData.interest_rate) || 0,
      closing_day: Number(cardData.closing_day),
      due_day: Number(cardData.due_day),
      user_id: userId,
    };

    const { data, error } = await supabase
      .from('credit_cards')
      .insert([payload])
      .select();

    if (error) {
      console.error('Erro ao adicionar cartão:', error);
      throw error;
    }

    return data?.[0] || null;
  },
};