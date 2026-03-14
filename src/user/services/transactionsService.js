import { supabase } from '../../lib/supabase';

function isMissingPaidMonthsColumn(error) {
  return error?.code === 'PGRST204' && String(error?.message || '').includes('paid_months');
}

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

  async addTransaction(transactionData) {
    const userId = await this.getAuthenticatedUserId();

    const normalizeItem = (item) => ({
      ...item,
      user_id: userId,
    });

    const payload = Array.isArray(transactionData)
      ? transactionData.map((item) => normalizeItem(item))
      : [normalizeItem(transactionData)];

    const { data, error } = await supabase
      .from('transactions')
      .insert(payload);
    
    if (error) throw error;
    return data;
  },

  async addInstallmentPurchase({
    description,
    amounts,
    dates,
    category,
    cardId,
    installmentGroupId,
  }) {
    const userId = await this.getAuthenticatedUserId();

    const payload = amounts.map((installmentAmount, index) => ({
      user_id: userId,
      description,
      amount: Number(installmentAmount),
      type: 'expense',
      category,
      recurring: false,
      date: dates[index],
      card_id: cardId,
      installment_current: index + 1,
      installment_total: amounts.length,
      installment_group_id: installmentGroupId,
    }));

    const { data, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select('*');

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
  },

  async deleteInstallmentGroup(installmentGroupId) {
    const userId = await this.getAuthenticatedUserId();

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .eq('installment_group_id', installmentGroupId);

    if (error) throw error;
  },

  async updateTransactionPaidStatus(id, isPaid) {
    const userId = await this.getAuthenticatedUserId();

    const { error } = await supabase
      .from('transactions')
      .update({ is_paid: Boolean(isPaid) })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  },

  async updateRecurringMonthPaidStatus(id, monthKey, isPaid, currentPaidMonths = []) {
    const userId = await this.getAuthenticatedUserId();

    const normalizedMonth = String(monthKey || '').trim();
    if (!/^\d{4}-\d{2}$/.test(normalizedMonth)) {
      throw new Error('Mês inválido para atualização de recorrência.');
    }

    const baseMonths = Array.isArray(currentPaidMonths)
      ? currentPaidMonths.map((item) => String(item))
      : [];

    const nextMonths = isPaid
      ? [...new Set([...baseMonths, normalizedMonth])]
      : baseMonths.filter((item) => item !== normalizedMonth);

    const { error } = await supabase
      .from('transactions')
      .update({ paid_months: nextMonths })
      .eq('id', id)
      .eq('user_id', userId);

    if (!error) {
      return { degraded: false };
    }

    if (isMissingPaidMonthsColumn(error)) {
      await this.updateTransactionPaidStatus(id, isPaid);
      return { degraded: true };
    }

    throw error;
  }
};