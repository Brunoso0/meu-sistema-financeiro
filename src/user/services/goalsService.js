import { supabase } from '../../lib/supabase';

export const goalsService = {
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

  async getGoals() {
    const userId = await this.getAuthenticatedUserId();

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  async addGoal(goalData) {
    const userId = await this.getAuthenticatedUserId();

    const payload = {
      title: goalData.title,
      target_amount: Number(goalData.target_amount) || 0,
      current_amount: Number(goalData.current_amount) || 0,
      user_id: userId,
    };

    const { data, error } = await supabase
      .from('goals')
      .insert([payload])
      .select();

    if (error) throw error;
    return data?.[0] || null;
  },

  async updateGoal(id, goalData) {
    const userId = await this.getAuthenticatedUserId();

    const payload = {
      title: goalData.title,
      target_amount: Number(goalData.target_amount) || 0,
      current_amount: Number(goalData.current_amount) || 0,
    };

    const { data, error } = await supabase
      .from('goals')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select();

    if (error) throw error;
    return data?.[0] || null;
  },

  async deleteGoal(id) {
    const userId = await this.getAuthenticatedUserId();

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  },
};
