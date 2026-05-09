-- Migração para integrar status dinâmicos nos chamados

-- 1. Adicionar a coluna status_id na tabela chamados
ALTER TABLE public.chamados 
ADD COLUMN IF NOT EXISTS status_id UUID REFERENCES public.status_chamados(id);

-- 2. Migrar dados existentes de status (texto) para status_id (UUID)
-- Assumindo que a tabela status_chamados já contém os nomes correspondentes
UPDATE public.chamados c
SET status_id = s.id
FROM public.status_chamados s
WHERE UPPER(TRIM(c.status)) = UPPER(TRIM(s.nome));

-- 3. Caso existam chamados com status 'ABERTOS' (plural), mapear para 'ABERTO'
UPDATE public.chamados c
SET status_id = s.id
FROM public.status_chamados s
WHERE (UPPER(TRIM(c.status)) = 'ABERTOS') AND (UPPER(TRIM(s.nome)) = 'ABERTO');

-- 4. Garantir que novos chamados continuem funcionando enquanto o código é atualizado
-- Não removemos a coluna 'status' de texto ainda para evitar quebra imediata
