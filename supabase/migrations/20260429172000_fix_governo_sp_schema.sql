-- Migration: Final fix for Governo SP schema
-- This migration ensures all tables have the correct columns and permissions

-- Drop tables if they exist in a wrong state to ensure clean start
DROP TABLE IF EXISTS public.governo_sp_lotacoes CASCADE;
DROP TABLE IF EXISTS public.governo_sp_identificacoes CASCADE;
DROP TABLE IF EXISTS public.governo_sp_clientes CASCADE;
DROP TABLE IF EXISTS public.base_governo_sp CASCADE;

-- 1. Entidade Cliente (Unicidade por CPF)
CREATE TABLE public.governo_sp_clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpf TEXT UNIQUE NOT NULL,
    nome TEXT,
    data_nascimento DATE,
    telefone_1 TEXT,
    telefone_2 TEXT,
    telefone_3 TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Entidade Identificação (Relacionamento N:1 com Cliente)
CREATE TABLE public.governo_sp_identificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.governo_sp_clientes(id) ON DELETE CASCADE,
    identificacao TEXT NOT NULL,
    data_nomeacao DATE,
    tipo_vinculo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cliente_id, identificacao)
);

-- 3. Entidade Lotação (Relacionamento N:1 com Identificação)
CREATE TABLE public.governo_sp_lotacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identificacao_id UUID REFERENCES public.governo_sp_identificacoes(id) ON DELETE CASCADE,
    lotacao TEXT,
    orgao TEXT,
    mb_consignacoes NUMERIC(15, 2),
    md_consignacoes NUMERIC(15, 2),
    mb_cartao_credito NUMERIC(15, 2),
    md_cartao_credito NUMERIC(15, 2),
    mb_cartao_beneficio NUMERIC(15, 2),
    md_cartao_beneficio NUMERIC(15, 2),
    lote_id UUID REFERENCES public.lotes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_gsp_cli_cpf ON public.governo_sp_clientes(cpf);
CREATE INDEX idx_gsp_ident_cli ON public.governo_sp_identificacoes(cliente_id);
CREATE INDEX idx_gsp_lot_ident ON public.governo_sp_lotacoes(identificacao_id);
CREATE INDEX idx_gsp_lot_lote ON public.governo_sp_lotacoes(lote_id);

-- RLS
ALTER TABLE public.governo_sp_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governo_sp_identificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governo_sp_lotacoes ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Acesso total clientes" ON public.governo_sp_clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total identificacoes" ON public.governo_sp_identificacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total lotacoes" ON public.governo_sp_lotacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Permissões
GRANT ALL ON public.governo_sp_clientes TO authenticated, anon;
GRANT ALL ON public.governo_sp_identificacoes TO authenticated, anon;
GRANT ALL ON public.governo_sp_lotacoes TO authenticated, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
