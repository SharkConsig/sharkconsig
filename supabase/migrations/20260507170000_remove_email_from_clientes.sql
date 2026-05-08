-- Remove email column from client tables as it should only exist in propostas
ALTER TABLE public.clientes DROP COLUMN IF EXISTS email;
ALTER TABLE public.governo_sp_clientes DROP COLUMN IF EXISTS email;
ALTER TABLE public.prefeitura_sp_clientes DROP COLUMN IF EXISTS email;
ALTER TABLE public.base_consulta_rapida DROP COLUMN IF EXISTS email;

-- Update the refresh function to remove email
CREATE OR REPLACE FUNCTION refresh_base_consulta_rapida()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
BEGIN
    -- 1. Otimização de Sessão para Cargas Massivas
    PERFORM set_config('work_mem', '256MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    PERFORM set_config('statement_timeout', '3600000', true); -- 1 hora de timeout interno
    
    -- 2. Garante que o planejador tenha estatísticas atualizadas
    ANALYZE public.clientes;
    ANALYZE public.matriculas;
    ANALYZE public.instituidores;
    ANALYZE public.itens_credito;

    -- 3. Derruba os índices para acelerar a inserção em massa
    DROP INDEX IF EXISTS public.idx_base_rapida_uf;
    DROP INDEX IF EXISTS public.idx_base_rapida_orgao;
    DROP INDEX IF EXISTS public.idx_base_rapida_margem;
    DROP INDEX IF EXISTS public.idx_base_rapida_tipo;
    DROP INDEX IF EXISTS public.idx_base_rapida_tipo_prefix;
    DROP INDEX IF EXISTS public.idx_base_rapida_cpf;

    -- 4. Limpa a tabela atual
    TRUNCATE TABLE public.base_consulta_rapida;

    -- 5. Insere os dados consolidando oportunidades (Removido campo email)
    INSERT INTO public.base_consulta_rapida (
        cpf, nome, data_nascimento, telefone_1, telefone_2, telefone_3,
        numero_matricula, orgao, situacao_funcional, regime_juridico, 
        salario, uf, instituidor_nome,
        saldo_70, margem_35, bruta_5, utilizada_5, liquida_5, 
        beneficio_bruta_5, beneficio_utilizada_5, beneficio_liquida_5,
        banco, tipo, tipo_prefix, prazo
    )
    SELECT 
        c.cpf, 
        c.nome, 
        c.data_nascimento,
        c.telefone_1,
        c.telefone_2,
        c.telefone_3,
        m.numero_matricula,
        m.orgao, 
        m.situacao_funcional, 
        m.regime_juridico, 
        m.salario, 
        m.uf,
        inst.nome as instituidor_nome,
        inst.saldo_70, 
        inst.margem_35, 
        inst.bruta_5,
        inst.utilizada_5,
        inst.liquida_5, 
        inst.beneficio_bruta_5,
        inst.beneficio_utilizada_5,
        inst.beneficio_liquida_5,
        ic.banco, 
        ic.tipo,
        LEFT(ic.tipo, 5),
        ic.prazo
    FROM public.clientes c
    INNER JOIN public.matriculas m ON c.cpf = m.cliente_cpf
    LEFT JOIN public.instituidores inst ON m.id = inst.matricula_id
    LEFT JOIN public.itens_credito ic ON inst.id = ic.instituidor_id;

    -- 6. Recria os índices
    CREATE INDEX idx_base_rapida_cpf ON public.base_consulta_rapida(cpf);
    CREATE INDEX idx_base_rapida_uf ON public.base_consulta_rapida(uf);
    CREATE INDEX idx_base_rapida_orgao ON public.base_consulta_rapida(orgao);
    CREATE INDEX idx_base_rapida_margem ON public.base_consulta_rapida(margem_35);
    CREATE INDEX idx_base_rapida_tipo ON public.base_consulta_rapida(tipo);
    CREATE INDEX idx_base_rapida_tipo_prefix ON public.base_consulta_rapida(tipo_prefix);

    RETURN 'SUCCESS (' || (now() - start_time) || ')';
EXCEPTION 
    WHEN OTHERS THEN
        RETURN 'ERROR: ' || SQLERRM || ' (Code: ' || SQLSTATE || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
