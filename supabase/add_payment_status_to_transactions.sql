-- ============================================================
-- Migração: adiciona controle de pagamento em transações
-- Execute este script no SQL Editor do Supabase.
-- ============================================================

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT FALSE;

-- Para histórico já existente: considera entradas como pagas
-- e mantém saídas como pendentes por padrão.
UPDATE transactions
SET is_paid = CASE
  WHEN type = 'income' THEN TRUE
  ELSE FALSE
END
WHERE is_paid IS DISTINCT FROM CASE
  WHEN type = 'income' THEN TRUE
  ELSE FALSE
END;

CREATE INDEX IF NOT EXISTS idx_transactions_is_paid
  ON transactions (is_paid);