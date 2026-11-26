-- Migration to add more indexes to base_consulta_rapida for campaign performance
-- And update refresh_base_consulta_rapida to handle them

CREATE INDEX IF NOT EXISTS idx_base_rapida_data_nasc ON public.base_consulta_rapida(data_nascimento);
CREATE INDEX IF NOT EXISTS idx_base_rapida_regime_jur ON public.base_consulta_rapida(regime_juridico);
CREATE INDEX IF NOT EXISTS idx_base_rapida_situacao ON public.base_consulta_rapida(situacao_funcional);
CREATE INDEX IF NOT EXISTS idx_base_rapida_saldo_70 ON public.base_consulta_rapida(saldo_70);
CREATE INDEX IF NOT EXISTS idx_base_rapida_liquida_5 ON public.base_consulta_rapida(liquida_5);
CREATE INDEX IF NOT EXISTS idx_base_rapida_benef_liq_5 ON public.base_consulta_rapida(beneficio_liquida_5);
CREATE INDEX IF NOT EXISTS idx_base_rapida_banco ON public.base_consulta_rapida(banco);
CREATE INDEX IF NOT EXISTS idx_base_rapida_prazo ON public.base_consulta_rapida(prazo);

-- Update the refresh function to handle these new indexes
CREATE OR REPLACE FUNCTION refresh_base_consulta_rapida()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
BEGIN
    -- Optimization
    PERFORM set_config('work_mem', '256MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    PERFORM set_config('statement_timeout', '1800000', true); -- 30 minutes for the refresh

    -- Drop indexes for bulk load
    DROP INDEX IF EXISTS public.idx_base_rapida_uf;
    DROP INDEX IF EXISTS public.idx_base_rapida_orgao;
    DROP INDEX IF EXISTS public.idx_base_rapida_margem;
    DROP INDEX IF EXISTS public.idx_base_rapida_tipo;
    DROP INDEX IF EXISTS public.idx_base_rapida_tipo_prefix;
    DROP INDEX IF EXISTS public.idx_base_rapida_cpf;
    DROP INDEX IF EXISTS public.idx_base_rapida_data_nasc;
    DROP INDEX IF EXISTS public.idx_base_rapida_regime_jur;
    DROP INDEX IF EXISTS public.idx_base_rapida_situacao;
    DROP INDEX IF EXISTS public.idx_base_rapida_saldo_70;
    DROP INDEX IF EXISTS public.idx_base_rapida_liquida_5;
    DROP INDEX IF EXISTS public.idx_base_rapida_benef_liq_5;
    DROP INDEX IF EXISTS public.idx_base_rapida_banco;
    DROP INDEX IF EXISTS public.idx_base_rapida_prazo;
    
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

    -- GOVERNO RORAIMA
    INSERT INTO public.base_consulta_rapida (
        cpf, nome, data_nascimento, telefone_1, telefone_2, telefone_3,
        numero_matricula, orgao, situacao_funcional,
        margem_35, bruta_5, convenio
    )
    SELECT 
        c.cpf, c.nome, c.data_nascimento, c.telefone_1, c.telefone_2, c.telefone_3,
        m.matricula, inst.origem, m.regime_contratacao,
        inst.margem_emprestimo, inst.margem_cartao, 'governo_rr'
    FROM public.governo_rr_clientes c
    INNER JOIN public.governo_rr_matriculas m ON c.id = m.cliente_id
    INNER JOIN public.governo_rr_instituidores inst ON m.id = inst.matricula_id;

    -- Recria os índices
    CREATE INDEX idx_base_rapida_cpf ON public.base_consulta_rapida(cpf);
    CREATE INDEX idx_base_rapida_uf ON public.base_consulta_rapida(uf);
    CREATE INDEX idx_base_rapida_orgao ON public.base_consulta_rapida(orgao);
    CREATE INDEX idx_base_rapida_margem ON public.base_consulta_rapida(margem_35);
    CREATE INDEX idx_base_rapida_tipo ON public.base_consulta_rapida(tipo);
    CREATE INDEX idx_base_rapida_tipo_prefix ON public.base_consulta_rapida(tipo_prefix);
    CREATE INDEX idx_base_rapida_data_nasc ON public.base_consulta_rapida(data_nascimento);
    CREATE INDEX idx_base_rapida_regime_jur ON public.base_consulta_rapida(regime_juridico);
    CREATE INDEX idx_base_rapida_situacao ON public.base_consulta_rapida(situacao_funcional);
    CREATE INDEX idx_base_rapida_saldo_70 ON public.base_consulta_rapida(saldo_70);
    CREATE INDEX idx_base_rapida_liquida_5 ON public.base_consulta_rapida(liquida_5);
    CREATE INDEX idx_base_rapida_benef_liq_5 ON public.base_consulta_rapida(beneficio_liquida_5);
    CREATE INDEX idx_base_rapida_banco ON public.base_consulta_rapida(banco);
    CREATE INDEX idx_base_rapida_prazo ON public.base_consulta_rapida(prazo);

    RETURN 'SUCCESS (' || (now() - start_time) || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
