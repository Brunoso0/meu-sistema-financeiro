-- ============================================================
-- Migração: controle de pagamento mensal para recorrências
-- Evita marcar todos os meses como pagos ao marcar apenas um.
-- ============================================================

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS paid_months TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_transactions_paid_months
  ON public.transactions USING GIN (paid_months);
