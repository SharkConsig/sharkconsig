-- Add email column to client tables
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.governo_sp_clientes ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.prefeitura_sp_clientes ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.base_consulta_rapida ADD COLUMN IF NOT EXISTS email TEXT;

-- Update the refresh function to include email and optimized for performance
CREATE OR REPLACE FUNCTION refresh_base_consulta_rapida()
RETURNS text AS $$
DECLARE
    start_time timestamptz := now();
BEGIN
    -- 1. Otimização de Sessão para Cargas Massivas
    -- Aumenta memória para joins e criação de índices
    PERFORM set_config('work_mem', '256MB', true);
    PERFORM set_config('maintenance_work_mem', '1GB', true);
    PERFORM set_config('statement_timeout', '3600000', true); -- 1 hora de timeout interno
    
    -- 2. Garante que o planejador tenha estatísticas atualizadas das tabelas de origem
    -- Isso evita planos de execução ineficientes (nested loops em milhões de linhas)
    ANALYZE public.clientes;
    ANALYZE public.matriculas;
    ANALYZE public.instituidores;
    ANALYZE public.itens_credito;

    -- 3. Derruba os índices para acelerar a inserção em massa (Bulk Load)
    -- Índices em tabelas muito grandes durante INSERT são o maior gargalo
    DROP INDEX IF EXISTS public.idx_base_rapida_uf;
    DROP INDEX IF EXISTS public.idx_base_rapida_orgao;
    DROP INDEX IF EXISTS public.idx_base_rapida_margem;
    DROP INDEX IF EXISTS public.idx_base_rapida_tipo;
    DROP INDEX IF EXISTS public.idx_base_rapida_tipo_prefix;
    DROP INDEX IF EXISTS public.idx_base_rapida_cpf;

    -- 4. Limpa a tabela atual (Operação rápida)
    TRUNCATE TABLE public.base_consulta_rapida;

    -- 5. Insere os dados consolidando oportunidades
    -- Usamos INNER JOIN para matrículas (um cliente sem matrícula não é uma oportunidade no CRM)
    -- e LEFT JOIN para itens de crédito para preservar margens e saldos mesmo sem contratos.
    INSERT INTO public.base_consulta_rapida (
        cpf, nome, data_nascimento, email, telefone_1, telefone_2, telefone_3,
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
        c.email,
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

    -- 6. Recria os índices para garantir performance nas consultas de filtro
    -- Com 1GB de maintenance_work_mem isso será consideravelmente mais rápido
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
