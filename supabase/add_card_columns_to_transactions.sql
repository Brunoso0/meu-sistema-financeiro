-- ============================================================
-- Migração: adiciona colunas de cartão e parcelas à tabela transactions
-- Execute este script no SQL Editor do Supabase antes de usar
-- as funcionalidades de cartão de crédito e compras parceladas.
-- ============================================================

-- card_id: referência ao cartão de crédito utilizado (TEXT para
-- compatibilidade tanto com UUID quanto com bigint como PK)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS card_id TEXT,
  ADD COLUMN IF NOT EXISTS installment_current INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS installment_total   INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS installment_group_id TEXT;

-- Índice para buscar todas as parcelas de um grupo rapidamente
CREATE INDEX IF NOT EXISTS idx_transactions_installment_group
  ON transactions (installment_group_id)
  WHERE installment_group_id IS NOT NULL;

-- Índice para buscar transações por cartão (usado na tela de fatura)
CREATE INDEX IF NOT EXISTS idx_transactions_card_id
  ON transactions (card_id)
  WHERE card_id IS NOT NULL;
