-- Segurança de dados para Supabase
-- Execute no SQL Editor do Supabase (projeto alvo)

-- 1) Tabela de transações: isolamento por usuário
alter table public.transactions enable row level security;

-- Remove policies antigas, se existirem
DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update_own" ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete_own" ON public.transactions;

CREATE POLICY "transactions_select_own"
ON public.transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "transactions_insert_own"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_update_own"
ON public.transactions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_delete_own"
ON public.transactions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 2) Tabela de perfis: acesso apenas ao próprio perfil
alter table public.profiles enable row level security;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
