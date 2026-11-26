-- Migration: Rename numero_matricula to identificacao in base_consulta_prefeitura_sp
-- This fixes the data conflict and ensures the identification number is correctly populated and displayed on the client page.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'base_consulta_prefeitura_sp' 
          AND column_name = 'numero_matricula'
    ) THEN
        ALTER TABLE public.base_consulta_prefeitura_sp RENAME COLUMN numero_matricula TO identificacao;
    END IF;
END $$;

-- Update the refresh function to use the correct renamed column
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
