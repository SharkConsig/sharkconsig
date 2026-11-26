-- 1. Create indexes on created_at for fast sorting and limit queries
CREATE INDEX IF NOT EXISTS idx_historico_proposta_comercial_created_at 
ON public.historico_proposta_comercial (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_historico_proposta_comercial_novo_formato_created_at 
ON public.historico_proposta_comercial_novo_formato (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_historico_proposta_comercial_quitacao_contrato_created_at 
ON public.historico_proposta_comercial_quitacao_contrato (created_at DESC);

-- 2. Create RPC function for server-side ultra-fast aggregation
CREATE OR REPLACE FUNCTION public.get_proposals_stats()
RETURNS json AS $$
DECLARE
  count_reducao bigint;
  sum_reducao numeric;
  count_novo bigint;
  sum_novo numeric;
  count_quitacao bigint;
  sum_quitacao numeric;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(valor_liberado), 0)
  INTO count_reducao, sum_reducao
  FROM public.historico_proposta_comercial;

  SELECT COUNT(*), COALESCE(SUM(valor_liberado), 0)
  INTO count_novo, sum_novo
  FROM public.historico_proposta_comercial_novo_formato;

  SELECT COUNT(*), COALESCE(SUM(saldo_quitacao), 0)
  INTO count_quitacao, sum_quitacao
  FROM public.historico_proposta_comercial_quitacao_contrato;

  RETURN json_build_object(
    'countReducao', count_reducao,
    'totalReducaoValor', sum_reducao,
    'countNovoFormato', count_novo,
    'totalNovoFormatoValor', sum_novo,
    'countQuitacao', count_quitacao,
    'totalQuitacaoValor', sum_quitacao
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant access to everyone
GRANT EXECUTE ON FUNCTION public.get_proposals_stats() TO authenticated, service_role, anon;
