-- Migration: Criação e Normalização das tabelas do Governo de Mato Grosso do Sul (MS)
-- Modelo Governo de Mato Grosso do Sul: cpf, nome, matricula, orgao, telefone_1, telefone_2, telefone_3

DROP TABLE IF EXISTS public.base_consulta_governo_ms CASCADE;
DROP TABLE IF EXISTS public.governo_ms_matriculas CASCADE;
DROP TABLE IF EXISTS public.governo_ms_clientes CASCADE;

-- 1. Tabela de Clientes (Dados Pessoais)
CREATE TABLE IF NOT EXISTS public.governo_ms_clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpf TEXT UNIQUE NOT NULL,
    nome TEXT,
    telefone_1 TEXT,
    telefone_2 TEXT,
    telefone_3 TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Matrículas (Dados de Vínculo e Margens se houver futuramente)
CREATE TABLE IF NOT EXISTS public.governo_ms_matriculas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.governo_ms_clientes(id) ON DELETE CASCADE,
    matricula TEXT NOT NULL,
    orgao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cliente_id, matricula)
);

-- 3. Tabela de Busca Rápida / Materialização de Governo MS
CREATE TABLE IF NOT EXISTS public.base_consulta_governo_ms (
    cpf TEXT,
    nome TEXT,
    matricula TEXT,
    orgao TEXT,
    telefone_1 TEXT,
    telefone_2 TEXT,
    telefone_3 TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de Otimização de Performance
CREATE INDEX IF NOT EXISTS idx_ms_cli_cpf ON public.governo_ms_clientes(cpf);
CREATE INDEX IF NOT EXISTS idx_ms_mat_cli ON public.governo_ms_matriculas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_base_ms_cpf ON public.base_consulta_governo_ms(cpf);
CREATE INDEX IF NOT EXISTS idx_base_ms_orgao ON public.base_consulta_governo_ms(orgao);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.governo_ms_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governo_ms_matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.base_consulta_governo_ms ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
DROP POLICY IF EXISTS "Acesso total clientes_ms" ON public.governo_ms_clientes;
CREATE POLICY "Acesso total clientes_ms" ON public.governo_ms_clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total matriculas_ms" ON public.governo_ms_matriculas;
CREATE POLICY "Acesso total matriculas_ms" ON public.governo_ms_matriculas FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total base_consulta_ms" ON public.base_consulta_governo_ms;
CREATE POLICY "Acesso total base_consulta_ms" ON public.base_consulta_governo_ms FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Conceder permissões
GRANT ALL ON public.governo_ms_clientes TO authenticated, anon, service_role;
GRANT ALL ON public.governo_ms_matriculas TO authenticated, anon, service_role;
GRANT ALL ON public.base_consulta_governo_ms TO authenticated, anon, service_role;

-- Função de sincronização
CREATE OR REPLACE FUNCTION public.refresh_base_consulta_governo_ms()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
    inserted_rows int;
BEGIN
    PERFORM set_config('work_mem', '256MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    PERFORM set_config('statement_timeout', '1800000', true);

    TRUNCATE TABLE public.base_consulta_governo_ms;
    
    INSERT INTO public.base_consulta_governo_ms (
        cpf, nome, matricula, orgao, telefone_1, telefone_2, telefone_3
    )
    SELECT 
        c.cpf, c.nome, m.matricula, m.orgao, c.telefone_1, c.telefone_2, c.telefone_3
    FROM public.governo_ms_clientes c
    INNER JOIN public.governo_ms_matriculas m ON c.id = m.cliente_id;

    GET DIAGNOSTICS inserted_rows = ROW_COUNT;
    RETURN 'SUCCESS. Rows inserted into GOVERNO MS: ' || inserted_rows || ' (' || (now() - start_time) || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_base_consulta_governo_ms() TO authenticated, service_role, anon;

-- Redefinição da função agregadora para incluir Governo MS
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
    res_ps_an text;
    res_pref_co text;
    res_gov_mg text;
    res_gov_ms text;
BEGIN
    SELECT public.refresh_base_consulta_siape() INTO res_siape;
    SELECT public.refresh_base_consulta_governo_sp() INTO res_gov_sp;
    SELECT public.refresh_base_consulta_prefeitura_sp() INTO res_pm_sp;
    SELECT public.refresh_base_consulta_governo_pi() INTO res_gov_pi;
    SELECT public.refresh_base_consulta_governo_ma() INTO res_gov_ma;
    SELECT public.refresh_base_consulta_governo_rr() INTO res_gov_rr;
    SELECT public.refresh_base_consulta_governo_rj() INTO res_gov_rj;
    SELECT public.refresh_base_consulta_prefeitura_santo_andre() INTO res_ps_an;
    SELECT public.refresh_base_consulta_prefeitura_contagem() INTO res_pref_co;
    SELECT public.refresh_base_consulta_governo_mg() INTO res_gov_mg;
    SELECT public.refresh_base_consulta_governo_ms() INTO res_gov_ms;

    RETURN 'ALL REFRESHED: siape, governo_sp, prefeitura_sp, governo_pi, governo_ma, governo_rr, governo_rj, prefeitura_santo_andre, prefeitura_contagem, governo_mg, governo_ms';
EXCEPTION WHEN OTHERS THEN
    RETURN 'ERROR REFRESHING ALL: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_all_base_consultas() TO authenticated, service_role, anon;
