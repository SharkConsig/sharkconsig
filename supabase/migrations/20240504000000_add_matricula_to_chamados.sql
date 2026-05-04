-- Migration to add matricula column to chamados table
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS matricula VARCHAR(255);
COMMENT ON COLUMN public.chamados.matricula IS 'Número da matrícula do cliente vinculado ao chamado';
