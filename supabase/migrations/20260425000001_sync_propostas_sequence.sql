-- Migration to sync propostas and chamados sequences with max id
-- This fixes the 'duplicate key value violates unique constraint' errors
-- which occurs when the sequence is out of sync with existing data.

SELECT setval(
  'public.propostas_id_seq', 
  COALESCE((SELECT MAX(id) FROM public.propostas), 0) + 1, 
  false
);

SELECT setval(
  'public.chamados_id_seq', 
  COALESCE((SELECT MAX(id) FROM public.chamados), 0) + 1, 
  false
);
