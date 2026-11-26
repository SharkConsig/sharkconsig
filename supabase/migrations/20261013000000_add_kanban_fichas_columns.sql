-- ==============================================================================
-- MIGRAÇÃO / ALTERAÇÃO DE TABELA: public.kanban_fichas
-- CRM SharkConsig - Registro direto de Origem, Telefones Contatados, Telefone da Empresa e Tabulação
-- ==============================================================================

ALTER TABLE public.kanban_fichas 
    ADD COLUMN IF NOT EXISTS origem VARCHAR(100),
    ADD COLUMN IF NOT EXISTS telefones_contatados TEXT[],
    ADD COLUMN IF NOT EXISTS telefone_empresa VARCHAR(50),
    ADD COLUMN IF NOT EXISTS tabulacao VARCHAR(100);

-- Comentários descritivos
COMMENT ON COLUMN public.kanban_fichas.origem IS 'Origem do cliente selecionada no Kanban (DISPARO, TRÁFEGO, etc.)';
COMMENT ON COLUMN public.kanban_fichas.telefones_contatados IS 'Array com telefone(s) do cliente que conseguiram contato efetivo';
COMMENT ON COLUMN public.kanban_fichas.telefone_empresa IS 'Telefone da Acerto Fácil utilizado pelo operador';
COMMENT ON COLUMN public.kanban_fichas.tabulacao IS 'Tabulação registrada no atendimento (ex: CLIENTE CHAMADO, NÃO EXISTE WHATSAPP, WHATSAPP DIVERGENTE)';

-- Índices para buscas rápidas e economia de recursos computacionais
CREATE INDEX IF NOT EXISTS idx_kanban_fichas_origem ON public.kanban_fichas(origem);
CREATE INDEX IF NOT EXISTS idx_kanban_fichas_tabulacao ON public.kanban_fichas(tabulacao);
CREATE INDEX IF NOT EXISTS idx_kanban_fichas_telefone_empresa ON public.kanban_fichas(telefone_empresa);
