import { useEffect, useState } from 'react';
import { categoryService } from '../services/categoryService';

export function useTransactionCategories() {
  const [categories, setCategories] = useState(() => categoryService.getFallbackCategories());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadCategories() {
      try {
        setLoading(true);
        const data = await categoryService.getCategories();
        if (active) {
          setCategories(categoryService.sortCategories(data));
        }
      } catch {
        if (active) {
          setCategories(categoryService.getFallbackCategories());
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadCategories();

    return () => {
      active = false;
    };
  }, []);

  const createCategory = async (payload) => {
    const category = await categoryService.addCategory(payload);
    setCategories((current) => categoryService.sortCategories([...current, category]));
    return category;
  };

  return {
    categories,
    categoriesLoading: loading,
    createCategory,
  };
}