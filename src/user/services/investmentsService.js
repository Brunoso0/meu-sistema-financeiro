import { supabase } from '../../lib/supabase';
import { transactionService } from './transactionsService';

export function isInvestmentsTableMissing(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  const hint = String(error?.hint || '').toLowerCase();
  const status = Number(error?.status || 0);

  if (code === 'PGRST205' && (message.includes('investments') || details.includes('investments'))) {
    return true;
  }

  if (status === 404 && (message.includes('investments') || details.includes('investments') || hint.includes('investments'))) {
    return true;
  }

  return false;
}

export const investmentsService = {
  async getAuthenticatedUserId() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user?.id) {
      throw new Error('Usuario nao autenticado.');
    }

    return user.id;
  },

  async getInvestments() {
    const userId = await this.getAuthenticatedUserId();

    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  async addInvestment(investmentData) {
    const userId = await this.getAuthenticatedUserId();

    const payload = {
      user_id: userId,
      name: String(investmentData.name || '').trim(),
      institution: String(investmentData.institution || '').trim() || null,
      annual_rate: Number(investmentData.annual_rate) || 0,
      goal_amount: Number(investmentData.goal_amount) || 0,
      current_amount: Number(investmentData.current_amount) || 0,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('investments')
      .insert([payload])
      .select('*');

    if (error) throw error;

    const created = data?.[0] || null;

    if (created && payload.current_amount > 0) {
      const today = new Date().toISOString().slice(0, 10);
      await transactionService.addTransaction({
        description: `Aporte inicial - ${payload.name}`,
        amount: payload.current_amount,
        type: 'expense',
        category: 'Investimento',
        recurring: false,
        date: today,
        is_paid: true,
      });
    }

    return created;
  },

  async updateInvestment(id, changes) {
    const userId = await this.getAuthenticatedUserId();

    const payload = {
      updated_at: new Date().toISOString(),
    };

    if (changes.annual_rate !== undefined) payload.annual_rate = Number(changes.annual_rate) || 0;
    if (changes.goal_amount !== undefined) payload.goal_amount = Number(changes.goal_amount) || 0;
    if (changes.current_amount !== undefined) payload.current_amount = Number(changes.current_amount) || 0;
    if (changes.name !== undefined) payload.name = String(changes.name || '').trim();
    if (changes.institution !== undefined) payload.institution = String(changes.institution || '').trim() || null;

    const { data, error } = await supabase
      .from('investments')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*');

    if (error) throw error;
    return data?.[0] || null;
  },

  async registerMovement({ investmentId, investmentName, kind, amount, date, description }) {
    const investmentList = await this.getInvestments();
    const investment = investmentList.find((item) => String(item.id) === String(investmentId));

    if (!investment) {
      throw new Error('Investimento nao encontrado.');
    }

    const numericAmount = Number(amount) || 0;
    if (numericAmount <= 0) {
      throw new Error('Valor da movimentacao deve ser maior que zero.');
    }

    const previousAmount = Number(investment.current_amount) || 0;
    const nextAmount = kind === 'withdrawal'
      ? previousAmount - numericAmount
      : previousAmount + numericAmount;

    if (nextAmount < 0) {
      throw new Error('Saldo insuficiente para realizar o resgate.');
    }

    const updated = await this.updateInvestment(investmentId, { current_amount: nextAmount });

    try {
      const isDeposit = kind === 'deposit';
      await transactionService.addTransaction({
        description: String(description || '').trim() || `${isDeposit ? 'Aporte' : 'Resgate'} - ${investmentName || investment.name}`,
        amount: numericAmount,
        type: isDeposit ? 'expense' : 'income',
        category: 'Investimento',
        recurring: false,
        date,
        is_paid: true,
      });
    } catch (error) {
      await this.updateInvestment(investmentId, { current_amount: previousAmount });
      throw error;
    }

    return updated;
  },
};
