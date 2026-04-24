-- Migration to reset sequences for chamados and propostas
-- This ensures that new records start from ID 1 after tables are cleared

-- Reset chamados sequence
ALTER SEQUENCE IF EXISTS public.chamados_id_seq RESTART WITH 1;

-- Reset propostas sequence
ALTER SEQUENCE IF EXISTS public.propostas_id_seq RESTART WITH 1;

-- If id_lead is used as a number and managed manually, we have ensured it starts from 1 in the application code when tables are empty.
-- However, we can also ensure any other related sequences are reset.
