import { supabase } from '../../lib/supabase';

export const profileService = {
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

  async getProfile() {
    const userId = await this.getAuthenticatedUserId();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  async updatePlanningConfig(configData) {
    const userId = await this.getAuthenticatedUserId();

    const payload = {
      base_income: Number(configData.base_income) || 0,
      percent_needs: Number(configData.percent_needs) || 50,
      percent_wants: Number(configData.percent_wants) || 30,
      percent_investments: Number(configData.percent_investments) || 20,
    };

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
