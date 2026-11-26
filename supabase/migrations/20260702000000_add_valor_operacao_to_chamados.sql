-- Migration: Adicionar coluna valor_operacao aos chamados
-- valor_operacao: valor da operacao selecionado para o chamado

ALTER TABLE public.chamados 
ADD COLUMN IF NOT EXISTS valor_operacao NUMERIC(15, 2) DEFAULT NULL;
