-- Migration: Adicionar telefones 2 e 3 para Governo Piauí
ALTER TABLE public.governo_pi_clientes ADD COLUMN IF NOT EXISTS telefone_2 TEXT;
ALTER TABLE public.governo_pi_clientes ADD COLUMN IF NOT EXISTS telefone_3 TEXT;
