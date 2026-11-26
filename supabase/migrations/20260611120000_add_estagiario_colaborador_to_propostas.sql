-- Migration to add estagiario_colaborador to propostas table
ALTER TABLE public.propostas 
ADD COLUMN IF NOT EXISTS estagiario_colaborador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS estagiario_colaborador_nome TEXT;
