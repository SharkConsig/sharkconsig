-- Migration to add additional margin columns to chamados table
ALTER TABLE public.chamados 
ADD COLUMN IF NOT EXISTS margem_liquida_5 DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS margem_beneficio_5 DECIMAL(15, 2);

-- Comment for record
COMMENT ON COLUMN public.chamados.margem_liquida_5 IS 'Margem Líquida 5% correspondente ao chamado';
COMMENT ON COLUMN public.chamados.margem_beneficio_5 IS 'Margem Benefício Líquida 5% correspondente ao chamado';
