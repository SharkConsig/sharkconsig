-- Migration: Criação e Normalização das tabelas da Prefeitura de Porto Velho (PVH)
-- Modelo Prefeitura de Porto Velho: cpf, nome, matricula, vinculo, data_nascimento, telefone_1, telefone_2, convenio, margem_emprestimo, margem_cartao_consignado

DROP TABLE IF EXISTS public.base_consulta_prefeitura_porto_velho CASCADE;
DROP TABLE IF EXISTS public.prefeitura_porto_velho_lotacoes CASCADE;
DROP TABLE IF EXISTS public.prefeitura_porto_velho_identificacoes CASCADE;
DROP TABLE IF EXISTS public.prefeitura_porto_velho_clientes CASCADE;

-- 1. Tabela de Clientes (Dados Pessoais)
CREATE TABLE IF NOT EXISTS public.prefeitura_porto_velho_clientes (
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
CREATE TABLE IF NOT EXISTS public.prefeitura_porto_velho_identificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.prefeitura_porto_velho_clientes(id) ON DELETE CASCADE,
    matricula TEXT NOT NULL,
    vinculo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cliente_id, matricula)
);

-- 3. Tabela de Lotações (Dados de Lotação e Margens)
CREATE TABLE IF NOT EXISTS public.prefeitura_porto_velho_lotacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identificacao_id UUID REFERENCES public.prefeitura_porto_velho_identificacoes(id) ON DELETE CASCADE,
    orgao TEXT,
    margem_emprestimo NUMERIC(15, 2) DEFAULT 0.00,
    margem_cartao_consignado NUMERIC(15, 2) DEFAULT 0.00,
    lote_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Busca Rápida / Materialização de Porto Velho
CREATE TABLE IF NOT EXISTS public.base_consulta_prefeitura_porto_velho (
    cpf TEXT,
    nome TEXT,
    data_nascimento DATE,
    matricula TEXT,
    vinculo TEXT,
    orgao TEXT,
    telefone_1 TEXT,
    telefone_2 TEXT,
    telefone_3 TEXT,
    margem_emprestimo NUMERIC(15, 2) DEFAULT 0.00,
    margem_cartao_consignado NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de Otimização de Performance
CREATE INDEX IF NOT EXISTS idx_pvh_cli_cpf ON public.prefeitura_porto_velho_clientes(cpf);
CREATE INDEX IF NOT EXISTS idx_pvh_ident_cli ON public.prefeitura_porto_velho_identificacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pvh_lot_ident ON public.prefeitura_porto_velho_lotacoes(identificacao_id);
CREATE INDEX IF NOT EXISTS idx_base_pvh_cpf ON public.base_consulta_prefeitura_porto_velho(cpf);
CREATE INDEX IF NOT EXISTS idx_base_pvh_orgao ON public.base_consulta_prefeitura_porto_velho(orgao);
CREATE INDEX IF NOT EXISTS idx_base_pvh_data_nasc ON public.base_consulta_prefeitura_porto_velho(data_nascimento);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.prefeitura_porto_velho_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prefeitura_porto_velho_identificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prefeitura_porto_velho_lotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.base_consulta_prefeitura_porto_velho ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
DROP POLICY IF EXISTS "Acesso total clientes_pvh" ON public.prefeitura_porto_velho_clientes;
CREATE POLICY "Acesso total clientes_pvh" ON public.prefeitura_porto_velho_clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total identificacoes_pvh" ON public.prefeitura_porto_velho_identificacoes;
CREATE POLICY "Acesso total identificacoes_pvh" ON public.prefeitura_porto_velho_identificacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total lotacoes_pvh" ON public.prefeitura_porto_velho_lotacoes;
CREATE POLICY "Acesso total lotacoes_pvh" ON public.prefeitura_porto_velho_lotacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total base_consulta_pvh" ON public.base_consulta_prefeitura_porto_velho;
CREATE POLICY "Acesso total base_consulta_pvh" ON public.base_consulta_prefeitura_porto_velho FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Conceder permissões
GRANT ALL ON public.prefeitura_porto_velho_clientes TO authenticated, anon, service_role;
GRANT ALL ON public.prefeitura_porto_velho_identificacoes TO authenticated, anon, service_role;
GRANT ALL ON public.prefeitura_porto_velho_lotacoes TO authenticated, anon, service_role;
GRANT ALL ON public.base_consulta_prefeitura_porto_velho TO authenticated, anon, service_role;

-- Implementação real da função
CREATE OR REPLACE FUNCTION public.refresh_base_consulta_prefeitura_porto_velho()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
    inserted_rows int;
BEGIN
    PERFORM set_config('work_mem', '256MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    PERFORM set_config('statement_timeout', '1800000', true);

    TRUNCATE TABLE public.base_consulta_prefeitura_porto_velho;
    
    INSERT INTO public.base_consulta_prefeitura_porto_velho (
        cpf, nome, data_nascimento, matricula, vinculo, orgao, telefone_1, telefone_2, telefone_3, margem_emprestimo, margem_cartao_consignado
    )
    SELECT 
        c.cpf, c.nome, c.data_nascimento, m.matricula, m.vinculo, l.orgao, c.telefone_1, c.telefone_2, c.telefone_3, l.margem_emprestimo, l.margem_cartao_consignado
    FROM public.prefeitura_porto_velho_clientes c
    INNER JOIN public.prefeitura_porto_velho_identificacoes m ON c.id = m.cliente_id
    INNER JOIN public.prefeitura_porto_velho_lotacoes l ON m.id = l.identificacao_id;

    GET DIAGNOSTICS inserted_rows = ROW_COUNT;
    RETURN 'SUCCESS. Rows inserted into PREFEITURA PORTO VELHO: ' || inserted_rows || ' (' || (now() - start_time) || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_base_consulta_prefeitura_porto_velho() TO authenticated, service_role, anon;
