-- Migration: 20260723000000_create_sla_and_gatilhos_crm.sql
-- Motor de Regras de SLA, Gatilhos e Escalonamento para CRM

-- 1. Tabela de Configuração de Regras de SLA por Status (Dinâmica)
CREATE TABLE IF NOT EXISTS public.sla_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_crm TEXT NOT NULL UNIQUE,
    prazo_horas_uteis NUMERIC NOT NULL DEFAULT 1.0,
    pergunta_forcada TEXT NOT NULL,
    faixa_valor_min_margem NUMERIC DEFAULT 0,
    faixa_valor_min_cartao NUMERIC DEFAULT 0,
    prazo_escalonamento_horas NUMERIC DEFAULT 0,
    alvo_escalonamento TEXT DEFAULT 'supervisao', -- 'supervisao' ou 'supervisao_gestao'
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed de regras padrão do documento de especificação
INSERT INTO public.sla_config (status_crm, prazo_horas_uteis, pergunta_forcada, faixa_valor_min_margem, faixa_valor_min_cartao, prazo_escalonamento_horas, alvo_escalonamento)
VALUES 
('ABERTO', 1, 'Fez o primeiro contato com o cliente?', 20000, 3000, 1, 'supervisao'),
('AGUARDANDO OPERACIONAL', 1, 'Fez o primeiro contato com o cliente?', 20000, 3000, 1, 'supervisao'),
('APROVADO', 24, 'A proposta foi enviada?', 30000, 5000, 12, 'supervisao'),
('PROPOSTA ENVIADA', 4, 'Ligou para o cliente? Ele está interagindo com a proposta?', 30000, 5000, 2, 'supervisao'),
('SEM INTERAÇÃO (PROPOSTA ENVIADA)', 3, 'Retomou o contato (ligação + mensagem)?', 30000, 5000, 1, 'supervisao'),
('EM NEGOCIAÇÃO', 36, 'Supervisão está ciente do caso? Há chance real de fechamento nas próximas 24h?', 30000, 5000, 20, 'supervisao'),
('SEM INTERESSE', 30, 'Enviou mensagem de outro número?', 30000, 5000, 15, 'supervisao'),
('PROPOSTA CADASTRADA', 96, 'O pós-venda foi realizado? O cliente fez a avaliação?', 0, 0, 0, 'supervisao')
ON CONFLICT (status_crm) DO NOTHING;

-- 2. Atualizar tabela de chamados com colunas de controle de SLA
ALTER TABLE public.chamados 
ADD COLUMN IF NOT EXISTS timestamp_ultima_mudanca_status TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS pergunta_pendente TEXT,
ADD COLUMN IF NOT EXISTS timestamp_gatilho_disparado TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS soneca_usada BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS timestamp_soneca TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escalonamento_status TEXT DEFAULT 'nenhum', -- 'nenhum', 'supervisao', 'supervisao_gestao'
ADD COLUMN IF NOT EXISTS timestamp_escalonamento TIMESTAMPTZ;

-- Permissões para sla_config
ALTER TABLE public.sla_config DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.sla_config TO authenticated, service_role, anon, public;

