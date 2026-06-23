-- Migration: Criação e Normalização das tabelas da Prefeitura de Contagem (PC)
-- Modelo Prefeitura de Contagem: cpf, nome, data_de_nascimento, telefone_1, telefone_2, orgao, matricula, data_de_admissao, situacao_do_funcionario, margem_emprestimo_bruta, margem_emprestimo_liquida, margem_cartao_bruta, margem_cartao_liquida

DROP TABLE IF EXISTS public.base_consulta_prefeitura_contagem CASCADE;
DROP TABLE IF EXISTS public.prefeitura_contagem_matriculas CASCADE;
DROP TABLE IF EXISTS public.prefeitura_contagem_clientes CASCADE;

-- 1. Tabela de Clientes (Dados Pessoais)
CREATE TABLE IF NOT EXISTS public.prefeitura_contagem_clientes (
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

-- 2. Tabela de Matrículas (Dados de Vínculo e Margens de Empréstimo/Cartão)
CREATE TABLE IF NOT EXISTS public.prefeitura_contagem_matriculas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.prefeitura_contagem_clientes(id) ON DELETE CASCADE,
    matricula TEXT NOT NULL,
    orgao TEXT,
    data_admissao DATE,
    situacao_funcionario TEXT,
    margem_emprestimo_bruta NUMERIC(15, 2) DEFAULT 0.00,
    margem_emprestimo_liquida NUMERIC(15, 2) DEFAULT 0.00,
    margem_cartao_bruta NUMERIC(15, 2) DEFAULT 0.00,
    margem_cartao_liquida NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cliente_id, matricula)
);

-- 3. Tabela de Busca Rápida / Materialização de Contagem
CREATE TABLE IF NOT EXISTS public.base_consulta_prefeitura_contagem (
    cpf TEXT,
    nome TEXT,
    data_nascimento DATE,
    matricula TEXT,
    orgao TEXT,
    data_admissao DATE,
    situacao_funcionario TEXT,
    telefone_1 TEXT,
    telefone_2 TEXT,
    telefone_3 TEXT,
    margem_emprestimo_bruta NUMERIC(15, 2) DEFAULT 0.00,
    margem_emprestimo_liquida NUMERIC(15, 2) DEFAULT 0.00,
    margem_cartao_bruta NUMERIC(15, 2) DEFAULT 0.00,
    margem_cartao_liquida NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de Otimização de Performance
CREATE INDEX IF NOT EXISTS idx_pc_cli_cpf ON public.prefeitura_contagem_clientes(cpf);
CREATE INDEX IF NOT EXISTS idx_pc_mat_cli ON public.prefeitura_contagem_matriculas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_base_pc_cpf ON public.base_consulta_prefeitura_contagem(cpf);
CREATE INDEX IF NOT EXISTS idx_base_pc_orgao ON public.base_consulta_prefeitura_contagem(orgao);
CREATE INDEX IF NOT EXISTS idx_base_pc_data_nasc ON public.base_consulta_prefeitura_contagem(data_nascimento);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.prefeitura_contagem_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prefeitura_contagem_matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.base_consulta_prefeitura_contagem ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
DROP POLICY IF EXISTS "Acesso total clientes_pc" ON public.prefeitura_contagem_clientes;
CREATE POLICY "Acesso total clientes_pc" ON public.prefeitura_contagem_clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total matriculas_pc" ON public.prefeitura_contagem_matriculas;
CREATE POLICY "Acesso total matriculas_pc" ON public.prefeitura_contagem_matriculas FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total base_consulta_pc" ON public.base_consulta_prefeitura_contagem;
CREATE POLICY "Acesso total base_consulta_pc" ON public.base_consulta_prefeitura_contagem FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Conceder permissões
GRANT ALL ON public.prefeitura_contagem_clientes TO authenticated, anon, service_role;
GRANT ALL ON public.prefeitura_contagem_matriculas TO authenticated, anon, service_role;
GRANT ALL ON public.base_consulta_prefeitura_contagem TO authenticated, anon, service_role;

-- Função de sincronização com controle de backpressure
CREATE OR REPLACE FUNCTION public.refresh_base_consulta_prefeitura_contagem()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
    inserted_rows int;
BEGIN
    PERFORM set_config('work_mem', '256MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    PERFORM set_config('statement_timeout', '1800000', true);

    TRUNCATE TABLE public.base_consulta_prefeitura_contagem;
    
    INSERT INTO public.base_consulta_prefeitura_contagem (
        cpf, nome, data_nascimento, matricula, orgao, data_admissao, situacao_funcionario, telefone_1, telefone_2, telefone_3, margem_emprestimo_bruta, margem_emprestimo_liquida, margem_cartao_bruta, margem_cartao_liquida
    )
    SELECT 
        c.cpf, c.nome, c.data_nascimento, m.matricula, m.orgao, m.data_admissao, m.situacao_funcionario, c.telefone_1, c.telefone_2, c.telefone_3, m.margem_emprestimo_bruta, m.margem_emprestimo_liquida, m.margem_cartao_bruta, m.margem_cartao_liquida
    FROM public.prefeitura_contagem_clientes c
    INNER JOIN public.prefeitura_contagem_matriculas m ON c.id = m.cliente_id;

    GET DIAGNOSTICS inserted_rows = ROW_COUNT;
    RETURN 'SUCCESS. Rows inserted into PREFEITURA CONTAGEM: ' || inserted_rows || ' (' || (now() - start_time) || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_base_consulta_prefeitura_contagem() TO authenticated, service_role, anon;

-- Redefinição da função agregadora para incluir Contagem
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

    RETURN 'ALL REFRESHED: siape, governo_sp, prefeitura_sp, governo_pi, governo_ma, governo_rr, governo_rj, prefeitura_santo_andre, prefeitura_contagem';
EXCEPTION WHEN OTHERS THEN
    RETURN 'ERROR REFRESHING ALL: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_all_base_consultas() TO authenticated, service_role, anon;
