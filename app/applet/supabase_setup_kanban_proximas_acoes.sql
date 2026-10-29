-- ==============================================================================
-- CRIAÇÃO DA TABELA DEDICADA DE PRÓXIMAS AÇÕES E VENCIMENTOS DO KANBAN
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.kanban_proximas_acoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  etapa_kanban TEXT NOT NULL DEFAULT 'TODAS',
  sla_minutos INTEGER NOT NULL DEFAULT 120,
  apenas_dias_uteis BOOLEAN NOT NULL DEFAULT true,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.kanban_proximas_acoes ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para leitura e escrita dos colaboradores
DROP POLICY IF EXISTS "Leitura pública de kanban_proximas_acoes" ON public.kanban_proximas_acoes;
CREATE POLICY "Leitura pública de kanban_proximas_acoes" 
  ON public.kanban_proximas_acoes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Inserção para autenticados em kanban_proximas_acoes" ON public.kanban_proximas_acoes;
CREATE POLICY "Inserção para autenticados em kanban_proximas_acoes" 
  ON public.kanban_proximas_acoes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Atualização para autenticados em kanban_proximas_acoes" ON public.kanban_proximas_acoes;
CREATE POLICY "Atualização para autenticados em kanban_proximas_acoes" 
  ON public.kanban_proximas_acoes FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Exclusão para autenticados em kanban_proximas_acoes" ON public.kanban_proximas_acoes;
CREATE POLICY "Exclusão para autenticados em kanban_proximas_acoes" 
  ON public.kanban_proximas_acoes FOR DELETE USING (true);

-- Inserção de Ações Padrão de Inicialização
INSERT INTO public.kanban_proximas_acoes (titulo, descricao, etapa_kanban, sla_minutos, apenas_dias_uteis, ativo, ordem) VALUES
  ('Realizar Primeiro Contato Imediato', 'Abordagem inicial de novos leads recebidos', 'EM ABORDAGEM', 60, true, true, 1),
  ('Enviar Régua de Retomada 1', 'Primeiro contato da cadência de retomada via WhatsApp', 'EM RETOMADA', 120, true, true, 2),
  ('Enviar Régua de Retomada 2', 'Segundo contato de acompanhamento da oportunidade', 'EM RETOMADA', 1440, true, true, 3),
  ('Enviar Régua de Retomada 3', 'Terceiro contato de acompanhamento da oportunidade', 'EM RETOMADA', 2880, true, true, 4),
  ('Enviar Simulação e Esclarecer Dúvidas', 'Envio de propostas detalhadas e cálculos de margem', 'EM NEGOCIAÇÃO', 120, true, true, 5),
  ('Recolher Documentação / Formalização', 'Solicitar RG, comprovante de residência e extrato', 'EM NEGOCIAÇÃO', 240, true, true, 6),
  ('Resgatar Oportunidade Esfriada', 'Reativação de clientes com contato após 48h úteis', 'EM REATIVAÇÃO', 2880, true, true, 7),
  ('Intervenção Especial de Atendimento', 'Ação prioritária solicitada a outro colaborador ou supervisor', 'AÇÃO ESPECIAL', 60, true, true, 8),
  ('Cadência de Longo Prazo / Nutrição', 'Acompanhamento periódico de clientes sem interesse imediato', 'SEM INTERESSE', 10080, true, true, 9)
ON CONFLICT DO NOTHING;
