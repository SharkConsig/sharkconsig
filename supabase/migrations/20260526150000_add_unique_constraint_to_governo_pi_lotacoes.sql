-- Migration: Clean duplicates and add UNIQUE constraint to governo_pi_lotacoes
-- 1. Remove duplicate lotações keeping the most recent one based on updated_at
DELETE FROM public.governo_pi_lotacoes a
USING public.governo_pi_lotacoes b
WHERE a.identificacao_id = b.identificacao_id
  AND a.updated_at < b.updated_at;

-- 2. Fallback: in case of equal updated_at, remove duplicates keeping the one with higher/later UUID or ID
DELETE FROM public.governo_pi_lotacoes a
USING public.governo_pi_lotacoes b
WHERE a.identificacao_id = b.identificacao_id
  AND a.id < b.id;

-- 3. Add UNIQUE constraint to public.governo_pi_lotacoes(identificacao_id)
ALTER TABLE public.governo_pi_lotacoes 
ADD CONSTRAINT governo_pi_lotacoes_identificacao_id_key UNIQUE (identificacao_id);
