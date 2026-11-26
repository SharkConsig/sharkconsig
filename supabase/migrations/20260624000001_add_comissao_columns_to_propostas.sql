-- Migration: Adicionar colunas de congelamento de comissao do banco às propostas
-- comissao_banco_porcentagem: percentual congelado da comissao (ex: 6.00%)
-- comissao_banco_valor: valor monetario congelado da comissao (ex: R$ 500,00)

ALTER TABLE public.propostas 
ADD COLUMN IF NOT EXISTS comissao_banco_porcentagem NUMERIC(15, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS comissao_banco_valor NUMERIC(15, 2) DEFAULT NULL;
