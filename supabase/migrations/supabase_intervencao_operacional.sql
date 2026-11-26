-- Adicionar colunas para suporte a intervenção operacional e redistribuição de produção meta
ALTER TABLE public.propostas
ADD COLUMN IF NOT EXISTS intervencao_operacional BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS intervencao_operacional_id TEXT,
ADD COLUMN IF NOT EXISTS intervencao_operacional_nome TEXT,
ADD COLUMN IF NOT EXISTS intervencao_motivo TEXT,
ADD COLUMN IF NOT EXISTS intervencao_data TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS intervencao_autor_id TEXT,
ADD COLUMN IF NOT EXISTS intervencao_autor_nome TEXT;

-- Índice para otimizar filtros e consultas no Dashboard
CREATE INDEX IF NOT EXISTS idx_propostas_intervencao_operacional_id 
ON public.propostas(intervencao_operacional_id) 
WHERE intervencao_operacional_id IS NOT NULL;

-- Comentários descritivos nas colunas
COMMENT ON COLUMN public.propostas.intervencao_operacional IS 'Indica se houve intervenção do operacional para fechamento do contrato com redistribuição de 50% da meta';
COMMENT ON COLUMN public.propostas.intervencao_operacional_id IS 'ID do usuário Operacional beneficiário dos 50% de produção meta';
COMMENT ON COLUMN public.propostas.intervencao_operacional_nome IS 'Nome do usuário Operacional beneficiário';
COMMENT ON COLUMN public.propostas.intervencao_motivo IS 'Justificativa da intervenção/retrabalho registrado';
COMMENT ON COLUMN public.propostas.intervencao_data IS 'Data e hora em que a intervenção foi registrada';
COMMENT ON COLUMN public.propostas.intervencao_autor_id IS 'ID do usuário que registrou a intervenção';
COMMENT ON COLUMN public.propostas.intervencao_autor_nome IS 'Nome do usuário que registrou a intervenção';
