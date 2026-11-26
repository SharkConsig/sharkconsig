-- Migration for MODELO GOVBR OPORTUNIDADES
-- Hierarchy: CPF (Client) 1 -> Matricula (Registration) N -> Instituidor (Institution/Margin) N

-- 1. Clients Table
CREATE TABLE IF NOT EXISTS public.governo_br_clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpf TEXT UNIQUE NOT NULL,
    nome TEXT DEFAULT 'NAO INFORMADO',
    data_nascimento DATE,
    telefone_1 TEXT,
    telefone_2 TEXT,
    telefone_3 TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Matriculas Table (Registration)
CREATE TABLE IF NOT EXISTS public.governo_br_matriculas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES public.governo_br_clientes(id) ON DELETE CASCADE,
    matricula TEXT NOT NULL,
    regime_contratacao TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(cliente_id, matricula)
);

-- 3. Instituidores Table (Margins/Lotacao equivalent)
CREATE TABLE IF NOT EXISTS public.governo_br_instituidores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricula_id UUID NOT NULL REFERENCES public.governo_br_matriculas(id) ON DELETE CASCADE,
    origem TEXT, -- Maps to 'origem' in CSV
    margem_emprestimo NUMERIC(15, 2),
    margem_cartao NUMERIC(15, 2),
    lote_id UUID REFERENCES public.lotes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.governo_br_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governo_br_matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governo_br_instituidores ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Acesso total governo_br_clientes" ON public.governo_br_clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total governo_br_matriculas" ON public.governo_br_matriculas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total governo_br_instituidores" ON public.governo_br_instituidores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gbr_cli_cpf ON public.governo_br_clientes(cpf);
CREATE INDEX IF NOT EXISTS idx_gbr_mat_cli ON public.governo_br_matriculas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_gbr_inst_mat ON public.governo_br_instituidores(matricula_id);

-- Update Global Search Base function (refresh_base_consulta_rapida)
-- I need to recreate it including GOVBR.
CREATE OR REPLACE FUNCTION refresh_base_consulta_rapida()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
BEGIN
    -- Optimization
    PERFORM set_config('work_mem', '256MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    
    TRUNCATE TABLE public.base_consulta_rapida;

    -- SIAPE
    INSERT INTO public.base_consulta_rapida (
        cpf, nome, data_nascimento, telefone_1, telefone_2, telefone_3,
        numero_matricula, orgao, situacao_funcional, regime_juridico, 
        salario, uf, instituidor_nome,
        saldo_70, margem_35, bruta_5, utilizada_5, liquida_5, 
        beneficio_bruta_5, beneficio_utilizada_5, beneficio_liquida_5,
        banco, tipo, tipo_prefix, prazo, convenio
    )
    SELECT 
        c.cpf, c.nome, c.data_nascimento, c.telefone_1, c.telefone_2, c.telefone_3,
        m.numero_matricula, m.orgao, m.situacao_funcional, m.regime_juridico, 
        m.salario, m.uf, inst.nome,
        inst.saldo_70, inst.margem_35, inst.bruta_5, inst.utilizada_5, inst.liquida_5, 
        inst.beneficio_bruta_5, inst.beneficio_utilizada_5, inst.beneficio_liquida_5,
        ic.banco, ic.tipo, LEFT(ic.tipo, 5), ic.prazo, 'siape'
    FROM public.clientes c
    INNER JOIN public.matriculas m ON c.cpf = m.cliente_cpf
    LEFT JOIN public.instituidores inst ON m.id = inst.matricula_id
    LEFT JOIN public.itens_credito ic ON inst.id = ic.instituidor_id;

    -- GOVERNO SP
    INSERT INTO public.base_consulta_rapida (cpf, nome, data_nascimento, telefone_1, telefone_2, telefone_3, numero_matricula, orgao, situacao_funcional, regime_juridico, margem_35, bruta_5, liquida_5, beneficio_bruta_5, beneficio_liquida_5, convenio)
    SELECT c.cpf, c.nome, c.data_nascimento, c.telefone_1, c.telefone_2, c.telefone_3, i.identificacao, l.orgao, i.tipo_vinculo, l.lotacao, l.md_consignacoes, l.mb_cartao_credito, l.md_cartao_credito, l.mb_cartao_beneficio, l.md_cartao_beneficio, 'governo_sp'
    FROM public.governo_sp_clientes c
    INNER JOIN public.governo_sp_identificacoes i ON c.id = i.cliente_id
    INNER JOIN public.governo_sp_lotacoes l ON i.id = l.identificacao_id;

    -- PREFEITURA SP
    INSERT INTO public.base_consulta_rapida (cpf, nome, data_nascimento, telefone_1, telefone_2, telefone_3, numero_matricula, orgao, situacao_funcional, regime_juridico, margem_35, beneficio_bruta_5, beneficio_liquida_5, convenio)
    SELECT c.cpf, c.nome, c.data_nascimento, c.telefone_1, c.telefone_2, c.telefone_3, i.identificacao, l.orgao, i.tipo_vinculo, l.lotacao, l.md_consignacoes, l.mb_cartao_beneficio, l.md_cartao_beneficio, 'prefeitura_sp'
    FROM public.prefeitura_sp_clientes c
    INNER JOIN public.prefeitura_sp_identificacoes i ON c.id = i.cliente_id
    INNER JOIN public.prefeitura_sp_lotacoes l ON i.id = l.identificacao_id;

    -- GOVERNO PIAUI
    INSERT INTO public.base_consulta_rapida (cpf, nome, data_nascimento, telefone_1, telefone_2, telefone_3, numero_matricula, orgao, situacao_funcional, bruta_5, liquida_5, beneficio_bruta_5, beneficio_liquida_5, convenio)
    SELECT c.cpf, c.nome, c.data_nascimento, c.telefone_1, c.telefone_2, c.telefone_3, i.matricula, l.orgao, i.vinculo, l.margem_cartao_consignado, l.margem_cartao_consignado, l.margem_cartao_beneficio, l.margem_cartao_beneficio, 'governo_pi'
    FROM public.governo_pi_clientes c
    INNER JOIN public.governo_pi_identificacoes i ON c.id = i.cliente_id
    INNER JOIN public.governo_pi_lotacoes l ON i.id = l.identificacao_id;

    -- GOVERNO MARANHÃO
    INSERT INTO public.base_consulta_rapida (cpf, nome, data_nascimento, telefone_1, telefone_2, telefone_3, numero_matricula, orgao, situacao_funcional, margem_35, bruta_5, liquida_5, beneficio_bruta_5, beneficio_liquida_5, convenio)
    SELECT c.cpf, c.nome, c.data_nascimento, c.telefone_1, c.telefone_2, c.telefone_3, i.matricula, l.orgao, i.vinculo, l.margem_emprestimo_consignado, l.margem_cartao_consignado, l.margem_cartao_consignado, l.margem_cartao_beneficio, l.margem_cartao_beneficio, 'governo_ma'
    FROM public.governo_ma_clientes c
    INNER JOIN public.governo_ma_identificacoes i ON c.id = i.cliente_id
    INNER JOIN public.governo_ma_lotacoes l ON i.id = l.identificacao_id;

    -- GOVBR OPORTUNIDADES
    INSERT INTO public.base_consulta_rapida (
        cpf, nome, data_nascimento, telefone_1, telefone_2, telefone_3,
        numero_matricula, orgao, situacao_funcional,
        margem_35, bruta_5, convenio
    )
    SELECT 
        c.cpf, c.nome, c.data_nascimento, c.telefone_1, c.telefone_2, c.telefone_3,
        m.matricula, inst.origem, m.regime_contratacao,
        inst.margem_emprestimo, inst.margem_cartao, 'governo_br'
    FROM public.governo_br_clientes c
    INNER JOIN public.governo_br_matriculas m ON c.id = m.cliente_id
    INNER JOIN public.governo_br_instituidores inst ON m.id = inst.matricula_id;

    RETURN 'SUCCESS (' || (now() - start_time) || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
