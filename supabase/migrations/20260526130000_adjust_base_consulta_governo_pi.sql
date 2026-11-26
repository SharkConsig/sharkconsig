-- Migration: Recreate base_consulta_governo_pi table to match exact requested columns of GOVERNO PIAUÍ convenio.

-- 1. DROP the existing base_consulta_governo_pi table if it exists
DROP TABLE IF EXISTS public.base_consulta_governo_pi CASCADE;

-- 2. CREATE base_consulta_governo_pi with EXACTLY the requested columns
CREATE UNLOGGED TABLE public.base_consulta_governo_pi (
    cpf TEXT,
    nome TEXT,
    data_nascimento DATE,
    telefone_1 TEXT,
    telefone_2 TEXT,
    telefone_3 TEXT,
    matricula TEXT,
    vinculo TEXT,
    orgao TEXT,
    margem_cartao_consignado NUMERIC(15, 2),
    margem_cartao_beneficio NUMERIC(15, 2)
);

-- 3. Create indices for performance
CREATE INDEX IF NOT EXISTS idx_base_gov_pi_cpf ON public.base_consulta_governo_pi(cpf);
CREATE INDEX IF NOT EXISTS idx_base_gov_pi_data_nasc ON public.base_consulta_governo_pi(data_nascimento);
CREATE INDEX IF NOT EXISTS idx_base_gov_pi_orgao ON public.base_consulta_governo_pi(orgao);

-- 4. Enable Row Level Security and setup access permissions
ALTER TABLE public.base_consulta_governo_pi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total para autenticados" ON public.base_consulta_governo_pi;
CREATE POLICY "Acesso total para autenticados" ON public.base_consulta_governo_pi 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.base_consulta_governo_pi TO authenticated, service_role, anon;

-- 5. Re-create the refresh_base_consulta_governo_pi() function using correct columns mapping
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
        cpf, nome, data_nascimento, 
        telefone_1, telefone_2, telefone_3, 
        matricula, vinculo, orgao, 
        margem_cartao_consignado, margem_cartao_beneficio
    )
    SELECT 
        c.cpf, 
        c.nome, 
        c.data_nascimento, 
        c.telefone_1, 
        NULL::TEXT as telefone_2, 
        NULL::TEXT as telefone_3, 
        i.matricula, 
        i.vinculo, 
        l.orgao, 
        l.margem_cartao_consignado, 
        l.margem_cartao_beneficio
    FROM public.governo_pi_clientes c
    INNER JOIN public.governo_pi_identificacoes i ON c.id = i.cliente_id
    INNER JOIN public.governo_pi_lotacoes l ON i.id = l.identificacao_id;

    GET DIAGNOSTICS inserted_rows = ROW_COUNT;
    RETURN 'SUCCESS. Rows inserted into GOVERNO PI: ' || inserted_rows || ' (' || (now() - start_time) || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_base_consulta_governo_pi() TO authenticated, service_role, anon;
