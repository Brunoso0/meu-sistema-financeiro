-- ============================================================
-- Migração: garante policy de UPDATE para a tabela transactions
-- Necessário para alternar status pago/pendente no dashboard.
-- ============================================================

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;

CREATE POLICY "Users can update own transactions"
ON public.transactions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
