-- Add valor_producao and valor_producao_operacional to propostas
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS valor_producao NUMERIC(15, 2);
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS valor_producao_operacional NUMERIC(15, 2);
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS valor_operacao NUMERIC(15, 2);
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS valor_cliente NUMERIC(15, 2);
