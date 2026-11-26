-- Migration: Criação e Normalização das tabelas do AMAZON PREV
-- Modelo Amazon Prev: cpf, nome, data_nascimento, matricula, orgao, lotacao, situacao_funcional, salario, margem, telefone_1, telefone_2

DROP TABLE IF EXISTS public.base_consulta_amazon_prev CASCADE;
DROP TABLE IF EXISTS public.amazon_prev_matriculas CASCADE;
DROP TABLE IF EXISTS public.amazon_prev_clientes CASCADE;

-- 1. Tabela de Clientes (Dados Pessoais)
CREATE TABLE IF NOT EXISTS public.amazon_prev_clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpf TEXT UNIQUE NOT NULL,
    nome TEXT,
    data_nascimento DATE,
    telefone_1 TEXT,
    telefone_2 TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Matrículas (Vínculo, Lotação, Cargo/Situação e Margens)
CREATE TABLE IF NOT EXISTS public.amazon_prev_matriculas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.amazon_prev_clientes(id) ON DELETE CASCADE,
    matricula TEXT NOT NULL,
    orgao TEXT,
    lotacao TEXT,
    situacao_funcional TEXT,
    salario NUMERIC,
    margem NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cliente_id, matricula)
);

-- 3. Tabela de Busca Rápida / Materialização Amazon Prev
CREATE TABLE IF NOT EXISTS public.base_consulta_amazon_prev (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpf TEXT,
    nome TEXT,
    data_nascimento DATE,
    matricula TEXT,
    orgao TEXT,
    lotacao TEXT,
    situacao_funcional TEXT,
    salario NUMERIC,
    margem NUMERIC,
    telefone_1 TEXT,
    telefone_2 TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de Otimização de Performance
CREATE INDEX IF NOT EXISTS idx_amazon_prev_cli_cpf ON public.amazon_prev_clientes(cpf);
CREATE INDEX IF NOT EXISTS idx_amazon_prev_mat_cli ON public.amazon_prev_matriculas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_base_amazon_prev_cpf ON public.base_consulta_amazon_prev(cpf);
CREATE INDEX IF NOT EXISTS idx_base_amazon_prev_orgao ON public.base_consulta_amazon_prev(orgao);
CREATE INDEX IF NOT EXISTS idx_base_amazon_prev_lotacao ON public.base_consulta_amazon_prev(lotacao);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.amazon_prev_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amazon_prev_matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.base_consulta_amazon_prev ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
DROP POLICY IF EXISTS "Acesso total clientes_amazon_prev" ON public.amazon_prev_clientes;
CREATE POLICY "Acesso total clientes_amazon_prev" ON public.amazon_prev_clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total matriculas_amazon_prev" ON public.amazon_prev_matriculas;
CREATE POLICY "Acesso total matriculas_amazon_prev" ON public.amazon_prev_matriculas FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total base_consulta_amazon_prev" ON public.base_consulta_amazon_prev;
CREATE POLICY "Acesso total base_consulta_amazon_prev" ON public.base_consulta_amazon_prev FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Conceder permissões
GRANT ALL ON public.amazon_prev_clientes TO authenticated, anon, service_role;
GRANT ALL ON public.amazon_prev_matriculas TO authenticated, anon, service_role;
GRANT ALL ON public.base_consulta_amazon_prev TO authenticated, anon, service_role;

-- Função de sincronização
CREATE OR REPLACE FUNCTION public.refresh_base_consulta_amazon_prev()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
    inserted_rows int;
BEGIN
    PERFORM set_config('work_mem', '256MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    PERFORM set_config('statement_timeout', '1800000', true);

    TRUNCATE TABLE public.base_consulta_amazon_prev;
    
    INSERT INTO public.base_consulta_amazon_prev (
        cpf, nome, data_nascimento, matricula, orgao, lotacao, situacao_funcional,
        salario, margem, telefone_1, telefone_2
    )
    SELECT 
        c.cpf, c.nome, c.data_nascimento, m.matricula, m.orgao, m.lotacao, m.situacao_funcional,
        m.salario, m.margem, c.telefone_1, c.telefone_2
    FROM public.amazon_prev_clientes c
    INNER JOIN public.amazon_prev_matriculas m ON c.id = m.cliente_id;

    GET DIAGNOSTICS inserted_rows = ROW_COUNT;
    RETURN 'SUCCESS. Rows inserted into AMAZON PREV: ' || inserted_rows || ' (' || (now() - start_time) || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_base_consulta_amazon_prev() TO authenticated, service_role, anon;
