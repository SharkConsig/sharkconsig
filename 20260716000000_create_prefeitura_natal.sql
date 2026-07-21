-- Migration: Criação e Normalização das tabelas da Prefeitura de Natal (PN)
-- Modelo Prefeitura de Natal: cpf, nome, matricula, vinculo, data_nascimento, orgao, margem_emprestimo_consignado, margem_cartao_consignado, margem_cartao_beneficio, telefone_1, telefone_2, telefone_3

DROP TABLE IF EXISTS public.base_consulta_prefeitura_natal CASCADE;
DROP TABLE IF EXISTS public.prefeitura_natal_lotacoes CASCADE;
DROP TABLE IF EXISTS public.prefeitura_natal_identificacoes CASCADE;
DROP TABLE IF EXISTS public.prefeitura_natal_clientes CASCADE;

-- 1. Tabela de Clientes (Dados Pessoais)
CREATE TABLE IF NOT EXISTS public.prefeitura_natal_clientes (
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

-- 2. Tabela de Identificações (Dados de Vínculo)
CREATE TABLE IF NOT EXISTS public.prefeitura_natal_identificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.prefeitura_natal_clientes(id) ON DELETE CASCADE,
    matricula TEXT NOT NULL,
    vinculo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cliente_id, matricula)
);

-- 3. Tabela de Lotações (Dados de Lotação e Margens)
CREATE TABLE IF NOT EXISTS public.prefeitura_natal_lotacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identificacao_id UUID REFERENCES public.prefeitura_natal_identificacoes(id) ON DELETE CASCADE,
    orgao TEXT,
    margem_emprestimo_consignado NUMERIC(15, 2) DEFAULT 0.00,
    margem_cartao_consignado NUMERIC(15, 2) DEFAULT 0.00,
    margem_cartao_beneficio NUMERIC(15, 2) DEFAULT 0.00,
    lote_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Busca Rápida / Materialização de Natal
CREATE TABLE IF NOT EXISTS public.base_consulta_prefeitura_natal (
    cpf TEXT,
    nome TEXT,
    data_nascimento DATE,
    matricula TEXT,
    vinculo TEXT,
    orgao TEXT,
    telefone_1 TEXT,
    telefone_2 TEXT,
    telefone_3 TEXT,
    margem_emprestimo_consignado NUMERIC(15, 2) DEFAULT 0.00,
    margem_cartao_consignado NUMERIC(15, 2) DEFAULT 0.00,
    margem_cartao_beneficio NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de Otimização de Performance
CREATE INDEX IF NOT EXISTS idx_pn_cli_cpf ON public.prefeitura_natal_clientes(cpf);
CREATE INDEX IF NOT EXISTS idx_pn_ident_cli ON public.prefeitura_natal_identificacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pn_lot_ident ON public.prefeitura_natal_lotacoes(identificacao_id);
CREATE INDEX IF NOT EXISTS idx_base_pn_cpf ON public.base_consulta_prefeitura_natal(cpf);
CREATE INDEX IF NOT EXISTS idx_base_pn_orgao ON public.base_consulta_prefeitura_natal(orgao);
CREATE INDEX IF NOT EXISTS idx_base_pn_data_nasc ON public.base_consulta_prefeitura_natal(data_nascimento);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.prefeitura_natal_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prefeitura_natal_identificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prefeitura_natal_lotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.base_consulta_prefeitura_natal ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
DROP POLICY IF EXISTS "Acesso total clientes_pn" ON public.prefeitura_natal_clientes;
CREATE POLICY "Acesso total clientes_pn" ON public.prefeitura_natal_clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total identificacoes_pn" ON public.prefeitura_natal_identificacoes;
CREATE POLICY "Acesso total identificacoes_pn" ON public.prefeitura_natal_identificacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total lotacoes_pn" ON public.prefeitura_natal_lotacoes;
CREATE POLICY "Acesso total lotacoes_pn" ON public.prefeitura_natal_lotacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total base_consulta_pn" ON public.base_consulta_prefeitura_natal;
CREATE POLICY "Acesso total base_consulta_pn" ON public.base_consulta_prefeitura_natal FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Conceder permissões
GRANT ALL ON public.prefeitura_natal_clientes TO authenticated, anon, service_role;
GRANT ALL ON public.prefeitura_natal_identificacoes TO authenticated, anon, service_role;
GRANT ALL ON public.prefeitura_natal_lotacoes TO authenticated, anon, service_role;
GRANT ALL ON public.base_consulta_prefeitura_natal TO authenticated, anon, service_role;

-- Implementação real da função
CREATE OR REPLACE FUNCTION public.refresh_base_consulta_prefeitura_natal()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
    inserted_rows int;
BEGIN
    PERFORM set_config('work_mem', '256MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    PERFORM set_config('statement_timeout', '1800000', true);

    TRUNCATE TABLE public.base_consulta_prefeitura_natal;
    
    INSERT INTO public.base_consulta_prefeitura_natal (
        cpf, nome, data_nascimento, matricula, vinculo, orgao, telefone_1, telefone_2, telefone_3, margem_emprestimo_consignado, margem_cartao_consignado, margem_cartao_beneficio
    )
    SELECT 
        c.cpf, c.nome, c.data_nascimento, m.matricula, m.vinculo, l.orgao, c.telefone_1, c.telefone_2, c.telefone_3, l.margem_emprestimo_consignado, l.margem_cartao_consignado, l.margem_cartao_beneficio
    FROM public.prefeitura_natal_clientes c
    INNER JOIN public.prefeitura_natal_identificacoes m ON c.id = m.cliente_id
    INNER JOIN public.prefeitura_natal_lotacoes l ON m.id = l.identificacao_id;

    GET DIAGNOSTICS inserted_rows = ROW_COUNT;
    RETURN 'SUCCESS. Rows inserted into PREFEITURA NATAL: ' || inserted_rows || ' (' || (now() - start_time) || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_base_consulta_prefeitura_natal() TO authenticated, service_role, anon;
