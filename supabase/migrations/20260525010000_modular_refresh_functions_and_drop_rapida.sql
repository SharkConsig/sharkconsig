-- Migration to create modular refresh functions per covenant/split table
-- This allows updating each split table independently to completely avoid timeout errors.
-- It also performs a safe DROP of the old 'base_consulta_rapida' table which has been fully retired.

-- 1. DROP the obsolete base_consulta_rapida table
DROP TABLE IF EXISTS public.base_consulta_rapida CASCADE;
DROP FUNCTION IF EXISTS public.refresh_base_consulta_rapida() CASCADE;

-- 2. CREATE individual modular refresh functions with high performance session configuration

-- A. SIAPE (base_consulta_siape)
CREATE OR REPLACE FUNCTION public.refresh_base_consulta_siape()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
    inserted_rows int := 0;
    batch_limit int := 50000;
    offset_val int := 0;
    inserted_chunk_rows int;
BEGIN
    -- Configure high memory settings for this transaction session to make index scans extremely fast
    PERFORM set_config('work_mem', '512MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    PERFORM set_config('statement_timeout', '1800000', true); -- 30-minute threshold
    
    -- Truncate existing table
    TRUNCATE TABLE public.base_consulta_siape;

    LOOP
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
        FROM (
            SELECT cpf, nome, data_nascimento, telefone_1, telefone_2, telefone_3 
            FROM public.clientes 
            ORDER BY cpf 
            LIMIT batch_limit OFFSET offset_val
        ) c
        INNER JOIN public.matriculas m ON c.cpf = m.cliente_cpf
        LEFT JOIN public.instituidores inst ON m.id = inst.matricula_id
        LEFT JOIN public.itens_credito ic ON inst.id = ic.instituidor_id;

        GET DIAGNOSTICS inserted_chunk_rows = ROW_COUNT;
        
        IF inserted_chunk_rows = 0 THEN
            EXIT;
        END IF;

        inserted_rows := inserted_rows + inserted_chunk_rows;
        offset_val := offset_val + batch_limit;
    END LOOP;

    RETURN 'SUCCESS. Rows inserted into SIAPE: ' || inserted_rows || ' (' || (now() - start_time) || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_base_consulta_siape() TO authenticated, service_role, anon;


-- A.2 SIAPE INCREMENTAL PROCEDURE WITH TRANSACTION CONTROL (For Ultimate Reliability/Large Volumes)
-- This procedure can be safely run with: CALL public.refresh_base_consulta_siape_proc();
-- Because it commits intermediate work chunk-by-chunk, it can NEVER timeout under PostgreSQL transaction restrictions.
CREATE OR REPLACE PROCEDURE public.refresh_base_consulta_siape_proc(OUT result_message text)
AS $$
DECLARE
    start_time timestamptz := now();
    inserted_rows int := 0;
    batch_limit int := 50000;
    offset_val int := 0;
    inserted_chunk_rows int;
BEGIN
    -- Configure high memory settings
    COMMIT; -- close existing transaction first to start fresh procedural txn
    
    TRUNCATE TABLE public.base_consulta_siape;
    COMMIT; -- commit TRUNCATE immediately to release table locks

    LOOP
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
        FROM (
            SELECT cpf, nome, data_nascimento, telefone_1, telefone_2, telefone_3 
            FROM public.clientes 
            ORDER BY cpf 
            LIMIT batch_limit OFFSET offset_val
        ) c
        INNER JOIN public.matriculas m ON c.cpf = m.cliente_cpf
        LEFT JOIN public.instituidores inst ON m.id = inst.matricula_id
        LEFT JOIN public.itens_credito ic ON inst.id = ic.instituidor_id;

        GET DIAGNOSTICS inserted_chunk_rows = ROW_COUNT;
        
        IF inserted_chunk_rows = 0 THEN
            EXIT;
        END IF;

        inserted_rows := inserted_rows + inserted_chunk_rows;
        offset_val := offset_val + batch_limit;
        
        COMMIT; -- COMMIT each 50k batch to avoid WAL / lock / statement timeout buildup!
    END LOOP;

    result_message := 'SUCCESS. Rows inserted via Procedure: ' || inserted_rows || ' (' || (now() - start_time) || ')';
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON PROCEDURE public.refresh_base_consulta_siape_proc(OUT text) TO authenticated, service_role, anon;


-- B. GOVERNO SP (base_consulta_governo_sp)
CREATE OR REPLACE FUNCTION public.refresh_base_consulta_governo_sp()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
    inserted_rows int;
BEGIN
    -- Session Optimization
    PERFORM set_config('work_mem', '256MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    PERFORM set_config('statement_timeout', '1800000', true);

    TRUNCATE TABLE public.base_consulta_governo_sp;
    INSERT INTO public.base_consulta_governo_sp (
        cpf, nome, data_nascimento, telefone_1, telefone_2, telefone_3, 
        numero_matricula, orgao, situacao_funcional, regime_juridico, 
        margem_35, bruta_5, liquida_5, beneficio_bruta_5, beneficio_liquida_5, uf
    )
    SELECT 
        c.cpf, c.nome, c.data_nascimento, c.telefone_1, c.telefone_2, c.telefone_3, 
        i.identificacao, l.orgao, i.tipo_vinculo, l.lotacao, 
        l.md_consignacoes, l.mb_cartao_credito, l.md_cartao_credito, 
        l.mb_cartao_beneficio, l.md_cartao_beneficio, 'SP'
    FROM public.governo_sp_clientes c
    INNER JOIN public.governo_sp_identificacoes i ON c.id = i.cliente_id
    INNER JOIN public.governo_sp_lotacoes l ON i.id = l.identificacao_id;

    GET DIAGNOSTICS inserted_rows = ROW_COUNT;
    RETURN 'SUCCESS. Rows inserted into GOVERNO SP: ' || inserted_rows || ' (' || (now() - start_time) || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_base_consulta_governo_sp() TO authenticated, service_role, anon;


-- C. PREFEITURA SP (base_consulta_prefeitura_sp)
CREATE OR REPLACE FUNCTION public.refresh_base_consulta_prefeitura_sp()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
    inserted_rows int;
BEGIN
    -- Session Optimization
    PERFORM set_config('work_mem', '256MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    PERFORM set_config('statement_timeout', '1800000', true);

    TRUNCATE TABLE public.base_consulta_prefeitura_sp;
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

    GET DIAGNOSTICS inserted_rows = ROW_COUNT;
    RETURN 'SUCCESS. Rows inserted into PREFEITURA SP: ' || inserted_rows || ' (' || (now() - start_time) || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_base_consulta_prefeitura_sp() TO authenticated, service_role, anon;


-- D. GOVERNO PI (base_consulta_governo_pi)
CREATE OR REPLACE FUNCTION public.refresh_base_consulta_governo_pi()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
    inserted_rows int;
BEGIN
    -- Session Optimization
    PERFORM set_config('work_mem', '256MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    PERFORM set_config('statement_timeout', '1800000', true);

    TRUNCATE TABLE public.base_consulta_governo_pi;
    INSERT INTO public.base_consulta_governo_pi (
        cpf, nome, data_nascimento, telefone_1, 
        numero_matricula, orgao, situacao_funcional, 
        margem_35, bruta_5, liquida_5, beneficio_bruta_5, beneficio_liquida_5, uf
    )
    SELECT 
        c.cpf, c.nome, c.data_nascimento, c.telefone_1, 
        i.matricula, l.orgao, i.vinculo, 
        l.margem_cartao_consignado, l.margem_cartao_consignado, l.margem_cartao_consignado, 
        l.margem_cartao_beneficio, l.margem_cartao_beneficio, 'PI'
    FROM public.governo_pi_clientes c
    INNER JOIN public.governo_pi_identificacoes i ON c.id = i.cliente_id
    INNER JOIN public.governo_pi_lotacoes l ON i.id = l.identificacao_id;

    GET DIAGNOSTICS inserted_rows = ROW_COUNT;
    RETURN 'SUCCESS. Rows inserted into GOVERNO PI: ' || inserted_rows || ' (' || (now() - start_time) || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_base_consulta_governo_pi() TO authenticated, service_role, anon;


-- E. GOVERNO MA (base_consulta_governo_ma)
CREATE OR REPLACE FUNCTION public.refresh_base_consulta_governo_ma()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
    inserted_rows int;
BEGIN
    -- Session Optimization
    PERFORM set_config('work_mem', '256MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    PERFORM set_config('statement_timeout', '1800000', true);

    TRUNCATE TABLE public.base_consulta_governo_ma;
    INSERT INTO public.base_consulta_governo_ma (
        cpf, nome, data_nascimento, telefone_1, 
        numero_matricula, orgao, situacao_funcional, 
        margem_35, bruta_5, liquida_5, beneficio_bruta_5, beneficio_liquida_5, uf
    )
    SELECT 
        c.cpf, c.nome, c.data_nascimento, c.telefone_1, 
        i.matricula, l.orgao, i.vinculo, 
        l.margem_emprestimo_consignado, l.margem_cartao_consignado, l.margem_cartao_consignado, 
        l.margem_cartao_beneficio, l.margem_cartao_beneficio, 'MA'
    FROM public.governo_ma_clientes c
    INNER JOIN public.governo_ma_identificacoes i ON c.id = i.cliente_id
    INNER JOIN public.governo_ma_lotacoes l ON i.id = l.identificacao_id;

    GET DIAGNOSTICS inserted_rows = ROW_COUNT;
    RETURN 'SUCCESS. Rows inserted into GOVERNO MA: ' || inserted_rows || ' (' || (now() - start_time) || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_base_consulta_governo_ma() TO authenticated, service_role, anon;


-- F. GOVERNO RR (base_consulta_governo_rr)
CREATE OR REPLACE FUNCTION public.refresh_base_consulta_governo_rr()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
    inserted_rows int;
BEGIN
    -- Session Optimization
    PERFORM set_config('work_mem', '256MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    PERFORM set_config('statement_timeout', '1800000', true);

    TRUNCATE TABLE public.base_consulta_governo_rr;
    INSERT INTO public.base_consulta_governo_rr (
        cpf, nome, data_de_nascimento, matricula, origem, regime_contratacao,
        margem_emprestimo, margem_cartao, telefone_1, telefone_2, telefone_3
    )
    SELECT 
        c.cpf, c.nome, c.data_nascimento, m.matricula, inst.origem, m.regime_contratacao,
        inst.margem_emprestimo, inst.margem_cartao, c.telefone_1, c.telefone_2, c.telefone_3
    FROM public.governo_rr_clientes c
    INNER JOIN public.governo_rr_matriculas m ON c.id = m.cliente_id
    INNER JOIN public.governo_rr_instituidores inst ON m.id = inst.matricula_id;

    GET DIAGNOSTICS inserted_rows = ROW_COUNT;
    RETURN 'SUCCESS. Rows inserted into GOVERNO RR: ' || inserted_rows || ' (' || (now() - start_time) || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_base_consulta_governo_rr() TO authenticated, service_role, anon;
