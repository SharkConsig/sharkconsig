-- Migration: Cleanup duplicate lotacoes and instituidores in DB, add unique constraints, and define/update specialized split table refresh functions.

-- 1. DELETE EXISTING DUPLICATED RECORDS (Keeping only the absolute newest based on updated_at/created_at)

-- 1.1 governo_sp_lotacoes
DELETE FROM public.governo_sp_lotacoes a
WHERE a.id NOT IN (
    SELECT DISTINCT ON (identificacao_id) b.id
    FROM public.governo_sp_lotacoes b
    ORDER BY b.identificacao_id, b.updated_at DESC, b.created_at DESC
);

-- 1.2 prefeitura_sp_lotacoes
DELETE FROM public.prefeitura_sp_lotacoes a
WHERE a.id NOT IN (
    SELECT DISTINCT ON (identificacao_id) b.id
    FROM public.prefeitura_sp_lotacoes b
    ORDER BY b.identificacao_id, b.updated_at DESC, b.created_at DESC
);

-- 1.3 governo_pi_lotacoes
DELETE FROM public.governo_pi_lotacoes a
WHERE a.id NOT IN (
    SELECT DISTINCT ON (identificacao_id) b.id
    FROM public.governo_pi_lotacoes b
    ORDER BY b.identificacao_id, b.updated_at DESC, b.created_at DESC
);

-- 1.4 governo_ma_lotacoes
DELETE FROM public.governo_ma_lotacoes a
WHERE a.id NOT IN (
    SELECT DISTINCT ON (identificacao_id) b.id
    FROM public.governo_ma_lotacoes b
    ORDER BY b.identificacao_id, b.updated_at DESC, b.created_at DESC
);

-- 1.5 governo_rr_instituidores
DELETE FROM public.governo_rr_instituidores a
WHERE a.id NOT IN (
    SELECT DISTINCT ON (matricula_id) b.id
    FROM public.governo_rr_instituidores b
    ORDER BY b.matricula_id, b.updated_at DESC, b.created_at DESC
);


-- 2. ADD UNIQUE CONSTRAINTS (To prevent any future duplicates and align with Postgres USP_ERT / ON CONFLICT requirements)

-- 2.1 governo_sp_lotacoes
ALTER TABLE public.governo_sp_lotacoes DROP CONSTRAINT IF EXISTS unique_gsp_lot_ident;
ALTER TABLE public.governo_sp_lotacoes ADD CONSTRAINT unique_gsp_lot_ident UNIQUE (identificacao_id);

-- 2.2 prefeitura_sp_lotacoes
ALTER TABLE public.prefeitura_sp_lotacoes DROP CONSTRAINT IF EXISTS unique_psp_lot_ident;
ALTER TABLE public.prefeitura_sp_lotacoes ADD CONSTRAINT unique_psp_lot_ident UNIQUE (identificacao_id);

-- 2.3 governo_pi_lotacoes
ALTER TABLE public.governo_pi_lotacoes DROP CONSTRAINT IF EXISTS unique_gpi_lot_ident;
ALTER TABLE public.governo_pi_lotacoes ADD CONSTRAINT unique_gpi_lot_ident UNIQUE (identificacao_id);

-- 2.4 governo_ma_lotacoes
ALTER TABLE public.governo_ma_lotacoes DROP CONSTRAINT IF EXISTS unique_gma_lot_ident;
ALTER TABLE public.governo_ma_lotacoes ADD CONSTRAINT unique_gma_lot_ident UNIQUE (identificacao_id);

-- 2.5 governo_rr_instituidores
ALTER TABLE public.governo_rr_instituidores DROP CONSTRAINT IF EXISTS unique_grr_inst_mat;
ALTER TABLE public.governo_rr_instituidores ADD CONSTRAINT unique_grr_inst_mat UNIQUE (matricula_id);


-- 3. RECREATE REFRESH FUNCTIONS FOR EACH CONVENIO SPLIT TABLE (Ensuring fast execution and correct mappings)

-- 3.1 SIAPE
CREATE OR REPLACE FUNCTION public.refresh_base_consulta_siape()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
    inserted_rows int;
BEGIN
    PERFORM set_config('work_mem', '256MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    PERFORM set_config('statement_timeout', '1800000', true);

    TRUNCATE TABLE public.base_consulta_siape;
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
    RETURN 'SUCCESS. Rows inserted into SIAPE: ' || inserted_rows || ' (' || (now() - start_time) || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_base_consulta_siape() TO authenticated, service_role, anon;


-- 3.2 GOVERNO SP
CREATE OR REPLACE FUNCTION public.refresh_base_consulta_governo_sp()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
    inserted_rows int;
BEGIN
    PERFORM set_config('work_mem', '256MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    PERFORM set_config('statement_timeout', '1800000', true);

    TRUNCATE TABLE public.base_consulta_governo_sp;
    INSERT INTO public.base_consulta_governo_sp (
        cpf, nome, data_nascimento, telefone_1, telefone_2, telefone_3,
        identificacao, orgao, situacao_funcional, regime_juridico, 
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

    GET DIAGNOSTICS inserted_rows = ROW_COUNT;
    RETURN 'SUCCESS. Rows inserted into GOVERNO SP: ' || inserted_rows || ' (' || (now() - start_time) || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_base_consulta_governo_sp() TO authenticated, service_role, anon;


-- 3.3 PREFEITURA SP
CREATE OR REPLACE FUNCTION public.refresh_base_consulta_prefeitura_sp()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
    inserted_rows int;
BEGIN
    PERFORM set_config('work_mem', '256MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    PERFORM set_config('statement_timeout', '1800000', true);

    TRUNCATE TABLE public.base_consulta_prefeitura_sp;
    INSERT INTO public.base_consulta_prefeitura_sp (
        cpf, nome, data_nascimento, telefone_1, telefone_2, telefone_3, 
        identificacao, orgao, situacao_funcional, regime_juridico, 
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


-- 3.4 GOVERNO PIAUÍ
CREATE OR REPLACE FUNCTION public.refresh_base_consulta_governo_pi()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
    inserted_rows int;
BEGIN
    PERFORM set_config('work_mem', '256MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    PERFORM set_config('statement_timeout', '1800000', true);

    TRUNCATE TABLE public.base_consulta_governo_pi;
    INSERT INTO public.base_consulta_governo_pi (
        cpf, nome, data_nascimento, telefone_1, telefone_2, telefone_3,
        matricula, vinculo, orgao,
        margem_disponivel_emprestimo, margem_cartao_consignado, margem_cartao_beneficio
    )
    SELECT 
        c.cpf, c.nome, c.data_nascimento, c.telefone_1, c.telefone_2, c.telefone_3,
        i.matricula, i.vinculo, l.orgao,
        l.margem_disponivel_emprestimo, l.margem_cartao_consignado, l.margem_cartao_beneficio
    FROM public.governo_pi_clientes c
    INNER JOIN public.governo_pi_identificacoes i ON c.id = i.cliente_id
    INNER JOIN public.governo_pi_lotacoes l ON i.id = l.identificacao_id;

    GET DIAGNOSTICS inserted_rows = ROW_COUNT;
    RETURN 'SUCCESS. Rows inserted into GOVERNO PIAUÍ: ' || inserted_rows || ' (' || (now() - start_time) || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_base_consulta_governo_pi() TO authenticated, service_role, anon;


-- 3.5 GOVERNO MARANHÃO
CREATE OR REPLACE FUNCTION public.refresh_base_consulta_governo_ma()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
    inserted_rows int;
BEGIN
    PERFORM set_config('work_mem', '256MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    PERFORM set_config('statement_timeout', '1800000', true);

    TRUNCATE TABLE public.base_consulta_governo_ma;
    INSERT INTO public.base_consulta_governo_ma (
        cpf, nome, data_nascimento, telefone_1, numero_matricula, orgao, situacao_funcional,
        margem_35, bruta_5, liquida_5, beneficio_bruta_5, beneficio_liquida_5, uf
    )
    SELECT 
        c.cpf, c.nome, c.data_nascimento, c.telefone_1, i.matricula, l.orgao, i.vinculo,
        l.margem_emprestimo_consignado, l.margem_cartao_consignado, l.margem_cartao_consignado,
        l.margem_cartao_beneficio, l.margem_cartao_beneficio, 'MA'
    FROM public.governo_ma_clientes c
    INNER JOIN public.governo_ma_identificacoes i ON c.id = i.cliente_id
    INNER JOIN public.governo_ma_lotacoes l ON i.id = l.identificacao_id;

    GET DIAGNOSTICS inserted_rows = ROW_COUNT;
    RETURN 'SUCCESS. Rows inserted into GOVERNO MARANHÃO: ' || inserted_rows || ' (' || (now() - start_time) || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_base_consulta_governo_ma() TO authenticated, service_role, anon;


-- 3.6 GOVERNO RORAIMA (RR)
CREATE OR REPLACE FUNCTION public.refresh_base_consulta_governo_rr()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
    inserted_rows int;
BEGIN
    PERFORM set_config('work_mem', '256MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    PERFORM set_config('statement_timeout', '1800000', true);

    -- Check if base_consulta_governo_rr exists and empty it
    -- Note: governo_rr uses base_consulta_governo_rr split table
    TRUNCATE TABLE public.base_consulta_governo_rr;
    INSERT INTO public.base_consulta_governo_rr (
        cpf, nome, data_nascimento, matricula, origem, regime_contratacao,
        margem_emprestimo, margem_cartao, telefone_1, telefone_2, telefone_3
    )
    SELECT 
        c.cpf, c.nome, c.data_nascimento, m.matricula, inst.origem, m.regime_contratacao,
        inst.margem_emprestimo, inst.margem_cartao, c.telefone_1, c.telefone_2, c.telefone_3
    FROM public.governo_rr_clientes c
    INNER JOIN public.governo_rr_matriculas m ON c.id = m.cliente_id
    INNER JOIN public.governo_rr_instituidores inst ON m.id = inst.matricula_id;

    GET DIAGNOSTICS inserted_rows = ROW_COUNT;
    RETURN 'SUCCESS. Rows inserted into GOVERNO RORAIMA: ' || inserted_rows || ' (' || (now() - start_time) || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_base_consulta_governo_rr() TO authenticated, service_role, anon;
