import { supabase } from '../../lib/supabase';
import {
  getDefaultTransactionCategories,
  sortTransactionCategories,
} from '../utils/finance';

function normalizePayload(category) {
  return {
    id: category.id,
    user_id: category.user_id,
    is_global: Boolean(category.is_global),
    name: category.name,
    type: category.type,
    planning_group: category.planning_group ?? category.planningGroup ?? null,
    sort_order: category.sort_order ?? category.sortOrder ?? 999,
    is_default: Boolean(category.is_default),
  };
}

export const categoryService = {
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

  getFallbackCategories() {
    return sortTransactionCategories(getDefaultTransactionCategories());
  },

  sortCategories(categories = []) {
    return sortTransactionCategories(categories.map((category) => normalizePayload(category)));
  },

  async seedDefaultCategories(userId) {
    const payload = getDefaultTransactionCategories().map((category) => ({
      user_id: userId,
      name: category.name,
      type: category.type,
      planning_group: category.planning_group,
      sort_order: category.sort_order,
    }));

    const { data, error } = await supabase
      .from('transaction_categories')
      .insert(payload)
      .select('*');

    if (error) throw error;
    return this.sortCategories(data ?? []);
  },

  async getCategories() {
    const userId = await this.getAuthenticatedUserId();

    const { data, error } = await supabase
      .from('transaction_categories')
      .select('*')
      .or(`user_id.eq.${userId},is_global.eq.true`)
      .order('type', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    if (!data?.length) return this.getFallbackCategories();
    return this.sortCategories(data);
  },

  async addCategory({ name, type, planningGroup }) {
    const userId = await this.getAuthenticatedUserId();
    const trimmedName = String(name || '').trim();

    if (!trimmedName) {
      throw new Error('Nome da categoria é obrigatório.');
    }

    if (!['income', 'expense'].includes(type)) {
      throw new Error('Tipo de categoria inválido.');
    }

    const payload = {
      user_id: userId,
      is_global: false,
      name: trimmedName,
      type,
      planning_group: planningGroup || null,
      sort_order: 999,
    };

    const { data, error } = await supabase
      .from('transaction_categories')
      .insert([payload])
      .select('*')
      .single();

    if (error) throw error;
    return normalizePayload(data);
  },
};