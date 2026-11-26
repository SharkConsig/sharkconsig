-- Migration: Criação e Normalização das tabelas de Governo Rio de Janeiro (RJ)
-- Modelo Governo Rio de Janeiro: cpf, nome, data_de_nascimento, telefone, orgao, matricula

DROP TABLE IF EXISTS public.base_consulta_governo_rj CASCADE;
DROP TABLE IF EXISTS public.governo_rj_matriculas CASCADE;
DROP TABLE IF EXISTS public.governo_rj_clientes CASCADE;

-- 1. Tabela de Clientes (Dados Pessoais)
CREATE TABLE IF NOT EXISTS public.governo_rj_clientes (
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

-- 2. Tabela de Matrículas (Dados de Vínculo)
CREATE TABLE IF NOT EXISTS public.governo_rj_matriculas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.governo_rj_clientes(id) ON DELETE CASCADE,
    matricula TEXT NOT NULL,
    orgao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cliente_id, matricula)
);

-- 3. Tabela de Busca Rápida / Materialização do RJ
CREATE TABLE IF NOT EXISTS public.base_consulta_governo_rj (
    cpf TEXT,
    nome TEXT,
    data_nascimento DATE,
    matricula TEXT,
    orgao TEXT,
    telefone_1 TEXT,
    telefone_2 TEXT,
    telefone_3 TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de Otimização de Performance para Filtros e Keyset Pagination
CREATE INDEX IF NOT EXISTS idx_grj_cli_cpf ON public.governo_rj_clientes(cpf);
CREATE INDEX IF NOT EXISTS idx_grj_mat_cli ON public.governo_rj_matriculas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_base_consulta_governo_rj_cpf ON public.base_consulta_governo_rj(cpf);
CREATE INDEX IF NOT EXISTS idx_base_consulta_governo_rj_orgao ON public.base_consulta_governo_rj(orgao);
CREATE INDEX IF NOT EXISTS idx_base_consulta_governo_rj_data_nasc ON public.base_consulta_governo_rj(data_nascimento);

-- Ativar Row Level Security (RLS) nas novas tabelas
ALTER TABLE public.governo_rj_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governo_rj_matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.base_consulta_governo_rj ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso CRUD Total para usuários Autenticados
DROP POLICY IF EXISTS "Acesso total clientes_rj" ON public.governo_rj_clientes;
CREATE POLICY "Acesso total clientes_rj" ON public.governo_rj_clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total matriculas_rj" ON public.governo_rj_matriculas;
CREATE POLICY "Acesso total matriculas_rj" ON public.governo_rj_matriculas FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total base_consulta_rj" ON public.base_consulta_governo_rj;
CREATE POLICY "Acesso total base_consulta_rj" ON public.base_consulta_governo_rj FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Conceder permissões para os papéis de autenticação (evita erro "permission denied")
GRANT ALL ON public.governo_rj_clientes TO authenticated, anon, service_role;
GRANT ALL ON public.governo_rj_matriculas TO authenticated, anon, service_role;
GRANT ALL ON public.base_consulta_governo_rj TO authenticated, anon, service_role;

-- Função de sincronização com controle de backpressure e otimização de memória
CREATE OR REPLACE FUNCTION public.refresh_base_consulta_governo_rj()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
    inserted_rows int;
BEGIN
    PERFORM set_config('work_mem', '256MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    PERFORM set_config('statement_timeout', '1800000', true); -- 30 mins

    TRUNCATE TABLE public.base_consulta_governo_rj;
    
    INSERT INTO public.base_consulta_governo_rj (
        cpf, nome, data_nascimento, matricula, orgao, telefone_1, telefone_2, telefone_3
    )
    SELECT 
        c.cpf, c.nome, c.data_nascimento, m.matricula, m.orgao, c.telefone_1, c.telefone_2, c.telefone_3
    FROM public.governo_rj_clientes c
    INNER JOIN public.governo_rj_matriculas m ON c.id = m.cliente_id;

    GET DIAGNOSTICS inserted_rows = ROW_COUNT;
    RETURN 'SUCCESS. Rows inserted into GOVERNO RIO DE JANEIRO: ' || inserted_rows || ' (' || (now() - start_time) || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_base_consulta_governo_rj() TO authenticated, service_role, anon;

-- Redefinição da função agregadora para atualizar todas as consultas rápidas, agora incluindo RJ
CREATE OR REPLACE FUNCTION public.refresh_all_base_consultas()
RETURNS text AS $$
DECLARE
    res_siape text;
    res_gov_sp text;
    res_pm_sp text;
    res_gov_pi text;
    res_gov_ma text;
    res_gov_rr text;
    res_gov_rj text;
BEGIN
    -- Refresh each split table
    SELECT public.refresh_base_consulta_siape() INTO res_siape;
    SELECT public.refresh_base_consulta_governo_sp() INTO res_gov_sp;
    SELECT public.refresh_base_consulta_prefeitura_sp() INTO res_pm_sp;
    SELECT public.refresh_base_consulta_governo_pi() INTO res_gov_pi;
    SELECT public.refresh_base_consulta_governo_ma() INTO res_gov_ma;
    SELECT public.refresh_base_consulta_governo_rr() INTO res_gov_rr;
    SELECT public.refresh_base_consulta_governo_rj() INTO res_gov_rj;

    RETURN 'ALL REFRESHED: siape, governo_sp, prefeitura_sp, governo_pi, governo_ma, governo_rr, governo_rj';
EXCEPTION WHEN OTHERS THEN
    RETURN 'ERROR REFRESHING ALL: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_all_base_consultas() TO authenticated, service_role, anon;
