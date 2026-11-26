-- Migration to add chamado_id to propostas referencing chamados(id)
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS chamado_id INTEGER REFERENCES public.chamados(id) ON DELETE SET NULL;

-- Create an index to optimize lookups of proposals by ticket
CREATE INDEX IF NOT EXISTS idx_propostas_chamado_id ON public.propostas(chamado_id);
