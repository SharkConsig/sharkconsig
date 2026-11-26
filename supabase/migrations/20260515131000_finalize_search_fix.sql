-- Migration: Finalize search fix for Telefone 3 and add convenio column
-- 1. Add missing column and indexes for performance
ALTER TABLE public.base_consulta_rapida ADD COLUMN IF NOT EXISTS convenio TEXT;
CREATE INDEX IF NOT EXISTS idx_base_rapida_telefone_1 ON public.base_consulta_rapida(telefone_1);
CREATE INDEX IF NOT EXISTS idx_base_rapida_telefone_2 ON public.base_consulta_rapida(telefone_2);
CREATE INDEX IF NOT EXISTS idx_base_rapida_telefone_3 ON public.base_consulta_rapida(telefone_3);
CREATE INDEX IF NOT EXISTS idx_base_rapida_convenio ON public.base_consulta_rapida(convenio);

-- 2. Update Refresh Function to ensure all 3 telephones are captured and convenio is set
CREATE OR REPLACE FUNCTION refresh_base_consulta_rapida()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
BEGIN
    -- Session Optimization
    PERFORM set_config('work_mem', '256MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    PERFORM set_config('statement_timeout', '3600000', true);
    
    -- Clear current table
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
    INSERT INTO public.base_consulta_rapida (
        cpf, nome, data_nascimento, telefone_1, telefone_2, telefone_3,
        numero_matricula, orgao, situacao_funcional, regime_juridico, 
        margem_35, bruta_5, liquida_5, 
        beneficio_bruta_5, beneficio_liquida_5, convenio
    )
    SELECT 
        c.cpf, c.nome, c.data_nascimento, c.telefone_1, c.telefone_2, c.telefone_3,
        i.identificacao, l.orgao, i.tipo_vinculo, l.lotacao,
        l.md_consignacoes, l.mb_cartao_credito, l.md_cartao_credito,
        l.mb_cartao_beneficio, l.md_cartao_beneficio, 'governo_sp'
    FROM public.governo_sp_clientes c
    INNER JOIN public.governo_sp_identificacoes i ON c.id = i.cliente_id
    INNER JOIN public.governo_sp_lotacoes l ON i.id = l.identificacao_id;

    -- PREFEITURA SP
    INSERT INTO public.base_consulta_rapida (
        cpf, nome, data_nascimento, telefone_1, telefone_2, telefone_3,
        numero_matricula, orgao, situacao_funcional, regime_juridico, 
        margem_35, beneficio_bruta_5, beneficio_liquida_5, convenio
    )
    SELECT 
        c.cpf, c.nome, c.data_nascimento, c.telefone_1, c.telefone_2, c.telefone_3,
        i.identificacao, l.orgao, i.tipo_vinculo, l.lotacao,
        l.md_consignacoes, l.mb_cartao_beneficio, l.md_cartao_beneficio, 'prefeitura_sp'
    FROM public.prefeitura_sp_clientes c
    INNER JOIN public.prefeitura_sp_identificacoes i ON c.id = i.cliente_id
    INNER JOIN public.prefeitura_sp_lotacoes l ON i.id = l.identificacao_id;

    -- GOVERNO PIAUÍ
    INSERT INTO public.base_consulta_rapida (
        cpf, nome, data_nascimento, telefone_1, telefone_2, telefone_3,
        numero_matricula, orgao, situacao_funcional,
        bruta_5, liquida_5, 
        beneficio_bruta_5, beneficio_liquida_5, convenio
    )
    SELECT 
        c.cpf, c.nome, c.data_nascimento, c.telefone_1, c.telefone_2, c.telefone_3,
        i.matricula, l.orgao, i.vinculo,
        l.margem_cartao_consignado, l.margem_cartao_consignado,
        l.margem_cartao_beneficio, l.margem_cartao_beneficio, 'governo_pi'
    FROM public.governo_pi_clientes c
    INNER JOIN public.governo_pi_identificacoes i ON c.id = i.cliente_id
    INNER JOIN public.governo_pi_lotacoes l ON i.id = l.identificacao_id;

    -- GOVERNO MARANHÃO
    INSERT INTO public.base_consulta_rapida (
        cpf, nome, data_nascimento, telefone_1, telefone_2, telefone_3,
        numero_matricula, orgao, situacao_funcional,
        margem_35, bruta_5, liquida_5, 
        beneficio_bruta_5, beneficio_liquida_5, convenio
    )
    SELECT 
        c.cpf, c.nome, c.data_nascimento, c.telefone_1, c.telefone_2, c.telefone_3,
        i.matricula, l.orgao, i.vinculo,
        l.margem_emprestimo_consignado, l.margem_cartao_consignado, l.margem_cartao_consignado,
        l.margem_cartao_beneficio, l.margem_cartao_beneficio, 'governo_ma'
    FROM public.governo_ma_clientes c
    INNER JOIN public.governo_ma_identificacoes i ON c.id = i.cliente_id
    INNER JOIN public.governo_ma_lotacoes l ON i.id = l.identificacao_id;

    RETURN 'SUCCESS (' || (now() - start_time) || ')';
EXCEPTION 
    WHEN OTHERS THEN
        RETURN 'ERROR: ' || SQLERRM || ' (Code: ' || SQLSTATE || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
