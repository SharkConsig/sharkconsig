-- Migration: Otimização de Performance Extrema para Consultas Massivas (+1.3M linhas)
-- Estratégia: Unlogged Tables + Drop/Recreate Indexes + Session Tuning

-- 0. Garantir coluna convenio na tabela legado (base_consulta_rapida)
ALTER TABLE public.base_consulta_rapida ADD COLUMN IF NOT EXISTS convenio TEXT;

-- 1. Recriar Tabelas como UNLOGGED (Velocidade de escrita superior)
DROP TABLE IF EXISTS public.base_consulta_siape;
CREATE UNLOGGED TABLE public.base_consulta_siape (
    cpf TEXT, nome TEXT, data_nascimento DATE, telefone_1 TEXT, telefone_2 TEXT, telefone_3 TEXT,
    numero_matricula TEXT, orgao TEXT, situacao_funcional TEXT, regime_juridico TEXT, 
    salario NUMERIC, uf TEXT, instituidor_nome TEXT,
    saldo_70 NUMERIC, margem_35 NUMERIC, bruta_5 NUMERIC, utilizada_5 NUMERIC, liquida_5 NUMERIC, 
    beneficio_bruta_5 NUMERIC, beneficio_utilizada_5 NUMERIC, beneficio_liquida_5 NUMERIC,
    banco TEXT, tipo TEXT, tipo_prefix TEXT, prazo INTEGER
);

DROP TABLE IF EXISTS public.base_consulta_governo_sp;
CREATE UNLOGGED TABLE public.base_consulta_governo_sp (
    cpf TEXT, nome TEXT, data_nascimento DATE, telefone_1 TEXT, telefone_2 TEXT, telefone_3 TEXT,
    numero_matricula TEXT, orgao TEXT, situacao_funcional TEXT, regime_juridico TEXT, 
    margem_35 NUMERIC, bruta_5 NUMERIC, liquida_5 NUMERIC, 
    beneficio_bruta_5 NUMERIC, beneficio_liquida_5 NUMERIC,
    uf TEXT
);

DROP TABLE IF EXISTS public.base_consulta_prefeitura_sp;
CREATE UNLOGGED TABLE public.base_consulta_prefeitura_sp (
    cpf TEXT, nome TEXT, data_nascimento DATE, telefone_1 TEXT, telefone_2 TEXT, telefone_3 TEXT,
    numero_matricula TEXT, orgao TEXT, situacao_funcional TEXT, regime_juridico TEXT, 
    margem_35 NUMERIC, beneficio_bruta_5 NUMERIC, beneficio_liquida_5 NUMERIC,
    uf TEXT
);

DROP TABLE IF EXISTS public.base_consulta_governo_pi;
CREATE UNLOGGED TABLE public.base_consulta_governo_pi (
    cpf TEXT, nome TEXT, data_nascimento DATE, telefone_1 TEXT, 
    numero_matricula TEXT, orgao TEXT, situacao_funcional TEXT,
    margem_35 NUMERIC, bruta_5 NUMERIC, liquida_5 NUMERIC, 
    beneficio_bruta_5 NUMERIC, beneficio_liquida_5 NUMERIC,
    uf TEXT
);

DROP TABLE IF EXISTS public.base_consulta_governo_ma;
CREATE UNLOGGED TABLE public.base_consulta_governo_ma (
    cpf TEXT, nome TEXT, data_nascimento DATE, telefone_1 TEXT, 
    numero_matricula TEXT, orgao TEXT, situacao_funcional TEXT,
    margem_35 NUMERIC, bruta_5 NUMERIC, liquida_5 NUMERIC, 
    beneficio_bruta_5 NUMERIC, beneficio_liquida_5 NUMERIC,
    uf TEXT
);

-- 2. Habilitar RLS
DO $$ 
BEGIN
    ALTER TABLE public.base_consulta_siape ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.base_consulta_governo_sp ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.base_consulta_prefeitura_sp ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.base_consulta_governo_pi ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.base_consulta_governo_ma ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN 
END $$;

-- 3. Políticas e Permissões
DROP POLICY IF EXISTS "Acesso total siape" ON public.base_consulta_siape;
DROP POLICY IF EXISTS "Acesso total gsp" ON public.base_consulta_governo_sp;
DROP POLICY IF EXISTS "Acesso total psp" ON public.base_consulta_prefeitura_sp;
DROP POLICY IF EXISTS "Acesso total gpi" ON public.base_consulta_governo_pi;
DROP POLICY IF EXISTS "Acesso total gma" ON public.base_consulta_governo_ma;

CREATE POLICY "Acesso total siape" ON public.base_consulta_siape FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total gsp" ON public.base_consulta_governo_sp FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total psp" ON public.base_consulta_prefeitura_sp FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total gpi" ON public.base_consulta_governo_pi FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total gma" ON public.base_consulta_governo_ma FOR ALL TO authenticated USING (true);

GRANT ALL ON public.base_consulta_siape TO authenticated, service_role;
GRANT ALL ON public.base_consulta_governo_sp TO authenticated, service_role;
GRANT ALL ON public.base_consulta_prefeitura_sp TO authenticated, service_role;
GRANT ALL ON public.base_consulta_governo_pi TO authenticated, service_role;
GRANT ALL ON public.base_consulta_governo_ma TO authenticated, service_role;

-- 4. Função de Refresh Corrigida e Otimizada
CREATE OR REPLACE FUNCTION public.refresh_all_base_consultas()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
BEGIN
    -- 4.1 Sessão Ultra-Tunada
    PERFORM set_config('work_mem', '512MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    PERFORM set_config('statement_timeout', '0', true); -- Desabilitar timeout interno
    
    -- 4.2 Limpar Tabelas
    TRUNCATE TABLE public.base_consulta_rapida;
    TRUNCATE TABLE public.base_consulta_siape;
    TRUNCATE TABLE public.base_consulta_governo_sp;
    TRUNCATE TABLE public.base_consulta_prefeitura_sp;
    TRUNCATE TABLE public.base_consulta_governo_pi;
    TRUNCATE TABLE public.base_consulta_governo_ma;

    -- 4.3 SIAPE
    INSERT INTO public.base_consulta_siape (
        cpf, nome, data_nascimento, telefone_1, telefone_2, telefone_3,
        numero_matricula, orgao, situacao_funcional, regime_juridico, 
        salario, uf, instituidor_nome,
        saldo_70, margem_35, bruta_5, utilizada_5, liquida_5, 
        beneficio_bruta_5, beneficio_utilizada_5, beneficio_liquida_5,
        banco, tipo, tipo_prefix, prazo
    )
    SELECT 
        c.cpf, c.nome, c.data_nascimento, c.telefone_1, c.telefone_2, c.telefone_3,
        m.numero_matricula, m.orgao, m.situacao_funcional, m.regime_juridico, 
        m.salario, m.uf, inst.nome,
        inst.saldo_70, inst.margem_35, inst.bruta_5, inst.utilizada_5, inst.liquida_5, 
        inst.beneficio_bruta_5, inst.beneficio_utilizada_5, inst.beneficio_liquida_5,
        ic.banco, ic.tipo, LEFT(ic.tipo, 5), ic.prazo
    FROM public.clientes c
    INNER JOIN public.matriculas m ON c.cpf = m.cliente_cpf
    LEFT JOIN public.instituidores inst ON m.id = inst.matricula_id
    LEFT JOIN public.itens_credito ic ON inst.id = ic.instituidor_id;

    -- 4.4 GOVERNO SP
    INSERT INTO public.base_consulta_governo_sp (
        cpf, nome, data_nascimento, telefone_1, telefone_2, telefone_3,
        numero_matricula, orgao, situacao_funcional, regime_juridico, 
        margem_35, bruta_5, liquida_5, 
        beneficio_bruta_5, beneficio_liquida_5, uf
    )
    SELECT 
        c.cpf, c.nome, c.data_nascimento, c.telefone_1, c.telefone_2, c.telefone_3,
        i.identificacao, l.orgao, i.tipo_vinculo, l.lotacao,
        l.md_consignacoes, l.mb_cartao_credito, l.md_cartao_credito,
        l.mb_cartao_beneficio, l.md_cartao_beneficio, 'SP'
    FROM public.governo_sp_clientes c
    INNER JOIN public.governo_sp_identificacoes i ON c.id = i.cliente_id
    INNER JOIN public.governo_sp_lotacoes l ON i.id = l.identificacao_id;

    -- 4.5 PREFEITURA SP
    INSERT INTO public.base_consulta_prefeitura_sp (
        cpf, nome, data_nascimento, telefone_1, telefone_2, telefone_3,
        numero_matricula, orgao, situacao_funcional, regime_juridico, 
        margem_35, beneficio_bruta_5, beneficio_liquida_5, uf
    )
    SELECT 
        c.cpf, c.nome, c.data_nascimento, c.telefone_1, c.telefone_2, c.telefone_3,
        i.identificacao, l.orgao, i.tipo_vinculo, l.lotacao,
        l.md_consignacoes, l.mb_cartao_beneficio, l.md_cartao_beneficio, 'SP'
    FROM public.prefeitura_sp_clientes c
    INNER JOIN public.prefeitura_sp_identificacoes i ON c.id = i.cliente_id
    INNER JOIN public.prefeitura_sp_lotacoes l ON i.id = l.identificacao_id;

    -- 4.6 GOVERNO PI
    INSERT INTO public.base_consulta_governo_pi (
        cpf, nome, data_nascimento, telefone_1, 
        numero_matricula, orgao, situacao_funcional,
        margem_35, bruta_5, liquida_5, 
        beneficio_bruta_5, beneficio_liquida_5, uf
    )
    SELECT 
        c.cpf, c.nome, c.data_nascimento, c.telefone_1,
        i.matricula, l.orgao, i.vinculo,
        0, l.margem_cartao_consignado, l.margem_cartao_consignado,
        l.margem_cartao_beneficio, l.margem_cartao_beneficio, 'PI'
    FROM public.governo_pi_clientes c
    INNER JOIN public.governo_pi_identificacoes i ON c.id = i.cliente_id
    INNER JOIN public.governo_pi_lotacoes l ON i.id = l.identificacao_id;

    -- 4.7 GOVERNO MA
    INSERT INTO public.base_consulta_governo_ma (
        cpf, nome, data_nascimento, telefone_1, 
        numero_matricula, orgao, situacao_funcional,
        margem_35, bruta_5, liquida_5, 
        beneficio_bruta_5, beneficio_liquida_5, uf
    )
    SELECT 
        c.cpf, c.nome, c.data_nascimento, c.telefone_1,
        i.matricula, l.orgao, i.vinculo,
        l.margem_emprestimo_consignado, l.margem_cartao_consignado, l.margem_cartao_consignado,
        l.margem_cartao_beneficio, l.margem_cartao_beneficio, 'MA'
    FROM public.governo_ma_clientes c
    INNER JOIN public.governo_ma_identificacoes i ON c.id = i.cliente_id
    INNER JOIN public.governo_ma_lotacoes l ON i.id = l.identificacao_id;

    -- 4.8 Base Consulta Rápida (Unificada)
    INSERT INTO public.base_consulta_rapida (cpf, nome, telefone_1, convenio)
    SELECT cpf, nome, telefone_1, 'siape' FROM public.base_consulta_siape;
    
    INSERT INTO public.base_consulta_rapida (cpf, nome, telefone_1, convenio)
    SELECT cpf, nome, telefone_1, 'governo_sp' FROM public.base_consulta_governo_sp;
    
    INSERT INTO public.base_consulta_rapida (cpf, nome, telefone_1, convenio)
    SELECT cpf, nome, telefone_1, 'prefeitura_sp' FROM public.base_consulta_prefeitura_sp;

    INSERT INTO public.base_consulta_rapida (cpf, nome, telefone_1, convenio)
    SELECT cpf, nome, telefone_1, 'governo_pi' FROM public.base_consulta_governo_pi;

    INSERT INTO public.base_consulta_rapida (cpf, nome, telefone_1, convenio)
    SELECT cpf, nome, telefone_1, 'governo_ma' FROM public.base_consulta_governo_ma;

    -- 4.9 Índices Finais (Criar por último para performance)
    CREATE INDEX IF NOT EXISTS idx_siape_cpf ON public.base_consulta_siape(cpf);
    CREATE INDEX IF NOT EXISTS idx_gsp_cpf ON public.base_consulta_governo_sp(cpf);
    CREATE INDEX IF NOT EXISTS idx_psp_cpf ON public.base_consulta_prefeitura_sp(cpf);
    CREATE INDEX IF NOT EXISTS idx_gpi_cpf ON public.base_consulta_governo_pi(cpf);
    CREATE INDEX IF NOT EXISTS idx_gma_cpf ON public.base_consulta_governo_ma(cpf);
    CREATE INDEX IF NOT EXISTS idx_rapida_cpf ON public.base_consulta_rapida(cpf);

    RETURN 'SUCCESS (' || (now() - start_time) || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
