-- ============================================================
-- Migração: categorias globais + categorias privadas por usuário
-- ============================================================

ALTER TABLE public.transaction_categories
  ADD COLUMN IF NOT EXISTS is_global BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.transaction_categories
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.transaction_categories
  DROP CONSTRAINT IF EXISTS transaction_categories_scope_check;

ALTER TABLE public.transaction_categories
  ADD CONSTRAINT transaction_categories_scope_check
  CHECK (
    (is_global = TRUE AND user_id IS NULL)
    OR (is_global = FALSE AND user_id IS NOT NULL)
  );

DROP INDEX IF EXISTS transaction_categories_user_type_name_idx;

-- Unicidade para categorias privadas (por usuário + tipo + nome)
CREATE UNIQUE INDEX IF NOT EXISTS transaction_categories_user_type_name_idx
  ON public.transaction_categories (user_id, type, lower(name))
  WHERE user_id IS NOT NULL;

-- Unicidade para categorias globais (tipo + nome)
CREATE UNIQUE INDEX IF NOT EXISTS transaction_categories_global_type_name_idx
  ON public.transaction_categories (type, lower(name))
  WHERE is_global = TRUE;

-- Política de leitura: usuário pode ver as próprias e todas globais
DROP POLICY IF EXISTS "Users can view own categories" ON public.transaction_categories;
CREATE POLICY "Users can view own and global categories"
  ON public.transaction_categories
  FOR SELECT
  USING (is_global = TRUE OR auth.uid() = user_id);

-- Política de inserção: usuário só cria categoria privada dele
DROP POLICY IF EXISTS "Users can insert own categories" ON public.transaction_categories;
CREATE POLICY "Users can insert own categories"
  ON public.transaction_categories
  FOR INSERT
  WITH CHECK (is_global = FALSE AND auth.uid() = user_id);

-- Política de update: usuário só altera categoria privada dele
DROP POLICY IF EXISTS "Users can update own categories" ON public.transaction_categories;
CREATE POLICY "Users can update own categories"
  ON public.transaction_categories
  FOR UPDATE
  USING (is_global = FALSE AND auth.uid() = user_id)
  WITH CHECK (is_global = FALSE AND auth.uid() = user_id);

-- Política de delete: usuário só remove categoria privada dele
DROP POLICY IF EXISTS "Users can delete own categories" ON public.transaction_categories;
CREATE POLICY "Users can delete own categories"
  ON public.transaction_categories
  FOR DELETE
  USING (is_global = FALSE AND auth.uid() = user_id);

-- Seed de categorias globais de entrada
INSERT INTO public.transaction_categories (user_id, name, type, planning_group, sort_order, is_global)
VALUES
  (NULL, 'Salário', 'income', NULL, 10, TRUE),
  (NULL, 'Renda extra', 'income', NULL, 20, TRUE)
ON CONFLICT (type, lower(name)) WHERE is_global = TRUE DO NOTHING;

-- Seed de categorias globais de saída
INSERT INTO public.transaction_categories (user_id, name, type, planning_group, sort_order, is_global)
VALUES
  (NULL, 'Moradia', 'expense', 'needs', 10, TRUE),
  (NULL, 'Alimentação', 'expense', 'needs', 20, TRUE),
  (NULL, 'Transporte', 'expense', 'needs', 30, TRUE),
  (NULL, 'Saúde', 'expense', 'needs', 40, TRUE),
  (NULL, 'Educação', 'expense', 'wants', 50, TRUE)
ON CONFLICT (type, lower(name)) WHERE is_global = TRUE DO NOTHING;
