-- Migration: Criação e Normalização das tabelas do Governo do Amazonas (AM)
-- Modelo Governo do Amazonas: cpf, nome, data_nascimento, matricula, orgao, secretaria, cargo, situacao, margem_consignavel, margem_cartao, margem_cartao_beneficio, margem_cartao_beneficio_saque, telefone_1, telefone_2, telefone_3

DROP TABLE IF EXISTS public.base_consulta_governo_am CASCADE;
DROP TABLE IF EXISTS public.governo_am_matriculas CASCADE;
DROP TABLE IF EXISTS public.governo_am_clientes CASCADE;

-- 1. Tabela de Clientes (Dados Pessoais)
CREATE TABLE IF NOT EXISTS public.governo_am_clientes (
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

-- 2. Tabela de Matrículas (Dados de Vínculo, Cargo, Secretaria e Margens)
CREATE TABLE IF NOT EXISTS public.governo_am_matriculas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.governo_am_clientes(id) ON DELETE CASCADE,
    matricula TEXT NOT NULL,
    orgao TEXT,
    secretaria TEXT,
    cargo TEXT,
    situacao TEXT,
    tipo_servidor TEXT,
    margem_consignavel NUMERIC,
    margem_cartao NUMERIC,
    margem_cartao_beneficio NUMERIC,
    margem_cartao_beneficio_saque NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cliente_id, matricula)
);

-- 3. Tabela de Busca Rápida / Materialização de Governo AM
CREATE TABLE IF NOT EXISTS public.base_consulta_governo_am (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpf TEXT,
    nome TEXT,
    data_nascimento DATE,
    matricula TEXT,
    orgao TEXT,
    secretaria TEXT,
    cargo TEXT,
    situacao TEXT,
    tipo_servidor TEXT,
    margem_consignavel NUMERIC,
    margem_cartao NUMERIC,
    margem_cartao_beneficio NUMERIC,
    margem_cartao_beneficio_saque NUMERIC,
    telefone_1 TEXT,
    telefone_2 TEXT,
    telefone_3 TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de Otimização de Performance
CREATE INDEX IF NOT EXISTS idx_am_cli_cpf ON public.governo_am_clientes(cpf);
CREATE INDEX IF NOT EXISTS idx_am_mat_cli ON public.governo_am_matriculas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_base_am_cpf ON public.base_consulta_governo_am(cpf);
CREATE INDEX IF NOT EXISTS idx_base_am_orgao ON public.base_consulta_governo_am(orgao);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.governo_am_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governo_am_matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.base_consulta_governo_am ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
DROP POLICY IF EXISTS "Acesso total clientes_am" ON public.governo_am_clientes;
CREATE POLICY "Acesso total clientes_am" ON public.governo_am_clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total matriculas_am" ON public.governo_am_matriculas;
CREATE POLICY "Acesso total matriculas_am" ON public.governo_am_matriculas FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total base_consulta_am" ON public.base_consulta_governo_am;
CREATE POLICY "Acesso total base_consulta_am" ON public.base_consulta_governo_am FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Conceder permissões
GRANT ALL ON public.governo_am_clientes TO authenticated, anon, service_role;
GRANT ALL ON public.governo_am_matriculas TO authenticated, anon, service_role;
GRANT ALL ON public.base_consulta_governo_am TO authenticated, anon, service_role;

-- Função de sincronização
CREATE OR REPLACE FUNCTION public.refresh_base_consulta_governo_am()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
    inserted_rows int;
BEGIN
    PERFORM set_config('work_mem', '256MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    PERFORM set_config('statement_timeout', '1800000', true);

    TRUNCATE TABLE public.base_consulta_governo_am;
    
    INSERT INTO public.base_consulta_governo_am (
        cpf, nome, data_nascimento, matricula, orgao, secretaria, cargo, situacao, tipo_servidor,
        margem_consignavel, margem_cartao, margem_cartao_beneficio, margem_cartao_beneficio_saque,
        telefone_1, telefone_2, telefone_3
    )
    SELECT 
        c.cpf, c.nome, c.data_nascimento, m.matricula, m.orgao, m.secretaria, m.cargo, m.situacao, m.tipo_servidor,
        m.margem_consignavel, m.margem_cartao, m.margem_cartao_beneficio, m.margem_cartao_beneficio_saque,
        c.telefone_1, c.telefone_2, c.telefone_3
    FROM public.governo_am_clientes c
    INNER JOIN public.governo_am_matriculas m ON c.id = m.cliente_id;

    GET DIAGNOSTICS inserted_rows = ROW_COUNT;
    RETURN 'SUCCESS. Rows inserted into GOVERNO AM: ' || inserted_rows || ' (' || (now() - start_time) || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_base_consulta_governo_am() TO authenticated, service_role, anon;
