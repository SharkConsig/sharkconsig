-- Optimization for refresh_base_consulta_siape to prevent SQL query upstream timeout on 1.3M+ rows

-- 1. Ensure foreign key indexes exist on source tables for fast JOIN execution
CREATE INDEX IF NOT EXISTS idx_matriculas_cliente_cpf ON public.matriculas(cliente_cpf);
CREATE INDEX IF NOT EXISTS idx_instituidores_matricula_id ON public.instituidores(matricula_id);
CREATE INDEX IF NOT EXISTS idx_itens_credito_instituidor_id ON public.itens_credito(instituidor_id);

-- 2. Optimized refresh function with statement_timeout set to 0 and temporary index drop
CREATE OR REPLACE FUNCTION public.refresh_base_consulta_siape()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
    inserted_rows int;
BEGIN
    -- Configure execution parameters for high-volume batch processing
    PERFORM set_config('work_mem', '256MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    PERFORM set_config('statement_timeout', '0', true);

    -- Temporarily drop indexes on base_consulta_siape to avoid per-row index maintenance during 1.3M+ insert
    DROP INDEX IF EXISTS public.idx_base_consulta_siape_cpf;
    DROP INDEX IF EXISTS public.idx_base_consulta_siape_uf;
    DROP INDEX IF EXISTS public.idx_base_consulta_siape_orgao;
    DROP INDEX IF EXISTS public.idx_base_consulta_siape_regime_jur;
    DROP INDEX IF EXISTS public.idx_base_consulta_siape_situacao;
    DROP INDEX IF EXISTS public.idx_base_consulta_siape_data_nasc;
    DROP INDEX IF EXISTS public.idx_base_consulta_siape_margem;
    DROP INDEX IF EXISTS public.idx_base_consulta_siape_saldo_70;
    DROP INDEX IF EXISTS public.idx_base_consulta_siape_liquida_5;
    DROP INDEX IF EXISTS public.idx_base_consulta_siape_benef_liq_5;
    DROP INDEX IF EXISTS public.idx_base_consulta_siape_banco;
    DROP INDEX IF EXISTS public.idx_base_consulta_siape_prazo;
    DROP INDEX IF EXISTS public.idx_base_consulta_siape_tipo;
    DROP INDEX IF EXISTS public.idx_base_consulta_siape_tipo_prefix;

    -- Truncate existing base table
    TRUNCATE TABLE public.base_consulta_siape;

    -- Bulk populate table in a single high-speed query
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

    GET DIAGNOSTICS inserted_rows = ROW_COUNT;

    -- Re-create essential indexes for search performance after bulk insert
    CREATE INDEX IF NOT EXISTS idx_base_consulta_siape_cpf ON public.base_consulta_siape(cpf);
    CREATE INDEX IF NOT EXISTS idx_base_consulta_siape_uf ON public.base_consulta_siape(uf);
    CREATE INDEX IF NOT EXISTS idx_base_consulta_siape_orgao ON public.base_consulta_siape(orgao);
    CREATE INDEX IF NOT EXISTS idx_base_consulta_siape_situacao ON public.base_consulta_siape(situacao_funcional);
    CREATE INDEX IF NOT EXISTS idx_base_consulta_siape_margem ON public.base_consulta_siape(margem_35);
    CREATE INDEX IF NOT EXISTS idx_base_consulta_siape_liquida_5 ON public.base_consulta_siape(liquida_5);

    RETURN 'SUCCESS. Rows inserted into SIAPE: ' || inserted_rows || ' (' || (now() - start_time) || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_base_consulta_siape() TO authenticated, service_role, anon;
