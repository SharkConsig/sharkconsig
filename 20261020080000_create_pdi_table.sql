-- Migration: 20261020080000_create_pdi_table.sql
-- Modulo PDI: Tabela para persistencia dos dados do Plano de Desenvolvimento Individual

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.pdi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id VARCHAR(100) NOT NULL UNIQUE,
    etapa_profissional VARCHAR(100) DEFAULT 'Desenvolvimento',
    prontidao VARCHAR(100) DEFAULT 'Em Desenvolvimento Ativo',
    lideranca_direta VARCHAR(255) DEFAULT '',
    area VARCHAR(255) DEFAULT '',
    cargo VARCHAR(255) DEFAULT '',
    objetivos_profissionais TEXT DEFAULT '',
    interesses_crescimento TEXT DEFAULT '',
    habilidades_tecnicas JSONB DEFAULT '[]'::jsonb,
    habilidades_comportamentais JSONB DEFAULT '[]'::jsonb,
    pontos_fortes JSONB DEFAULT '[]'::jsonb,
    competencias_novas JSONB DEFAULT '[]'::jsonb,
    feedbacks JSONB DEFAULT '[]'::jsonb,
    comportamentos JSONB DEFAULT '[]'::jsonb,
    acoes JSONB DEFAULT '[]'::jsonb,
    registro_semanal JSONB DEFAULT '{}'::jsonb,
    evidencias JSONB DEFAULT '[]'::jsonb,
    avaliacao_inicial TEXT DEFAULT '',
    revisoes_periodicas TEXT DEFAULT '',
    evolucoes_percebidas TEXT DEFAULT '',
    pontos_atencao TEXT DEFAULT '',
    validacao_rotina TEXT DEFAULT '',
    proximos_passos_evolucao TEXT DEFAULT '',
    competencias_proximo_nivel TEXT DEFAULT '',
    preparacao_novas_responsabilidades TEXT DEFAULT '',
    necessidades_treinamento TEXT DEFAULT '',
    criterios_efetivacao TEXT DEFAULT '',
    decisoes_acordadas TEXT DEFAULT '',
    dados JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices de alta performance
CREATE INDEX IF NOT EXISTS idx_pdi_colaborador_id ON public.pdi (colaborador_id);
CREATE INDEX IF NOT EXISTS idx_pdi_updated_at ON public.pdi (updated_at DESC);

-- Permissoes de acesso
GRANT ALL ON TABLE public.pdi TO authenticated;
GRANT ALL ON TABLE public.pdi TO anon;
GRANT ALL ON TABLE public.pdi TO service_role;

-- Row Level Security (RLS)
ALTER TABLE public.pdi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total para todos em pdi" ON public.pdi;
CREATE POLICY "Acesso total para todos em pdi" ON public.pdi
    FOR ALL USING (true) WITH CHECK (true);
