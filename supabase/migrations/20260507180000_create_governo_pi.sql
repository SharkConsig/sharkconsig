-- Migration: Normalização Modelo Governo Piauí
-- Identificado por: cpf, nome, matricula, vinculo, data_nascimento, telefone, orgao, margem_cartao_consignado, margem_cartao_beneficio

-- 1. Entidade Cliente (Unicidade por CPF)
CREATE TABLE IF NOT EXISTS public.governo_pi_clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpf TEXT UNIQUE NOT NULL,
    nome TEXT,
    data_nascimento DATE,
    telefone_1 TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Entidade Identificação (Relacionamento N:1 com Cliente) - Usada para Matricula
CREATE TABLE IF NOT EXISTS public.governo_pi_identificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.governo_pi_clientes(id) ON DELETE CASCADE,
    matricula TEXT NOT NULL,
    vinculo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cliente_id, matricula)
);

-- 3. Entidade Lotação / Margens (Relacionamento N:1 com Identificação)
CREATE TABLE IF NOT EXISTS public.governo_pi_lotacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identificacao_id UUID REFERENCES public.governo_pi_identificacoes(id) ON DELETE CASCADE,
    orgao TEXT,
    margem_cartao_consignado NUMERIC(15, 2),
    margem_cartao_beneficio NUMERIC(15, 2),
    lote_id UUID REFERENCES public.lotes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_gpi_cli_cpf ON public.governo_pi_clientes(cpf);
CREATE INDEX IF NOT EXISTS idx_gpi_ident_cli ON public.governo_pi_identificacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_gpi_lot_ident ON public.governo_pi_lotacoes(identificacao_id);

-- RLS
ALTER TABLE public.governo_pi_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governo_pi_identificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governo_pi_lotacoes ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
DROP POLICY IF EXISTS "Acesso total clientes_pi" ON public.governo_pi_clientes;
CREATE POLICY "Acesso total clientes_pi" ON public.governo_pi_clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total identificacoes_pi" ON public.governo_pi_identificacoes;
CREATE POLICY "Acesso total identificacoes_pi" ON public.governo_pi_identificacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total lotacoes_pi" ON public.governo_pi_lotacoes;
CREATE POLICY "Acesso total lotacoes_pi" ON public.governo_pi_lotacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Permissões
GRANT ALL ON public.governo_pi_clientes TO authenticated, anon;
GRANT ALL ON public.governo_pi_identificacoes TO authenticated, anon;
GRANT ALL ON public.governo_pi_lotacoes TO authenticated, anon;
