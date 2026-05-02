-- Fix permissions for metas_config and campanhas_bonificacao
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.metas_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.campanhas_bonificacao TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.metas_config TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.campanhas_bonificacao TO service_role;

GRANT ALL ON TABLE public.metas_config TO postgres;
GRANT ALL ON TABLE public.campanhas_bonificacao TO postgres;

-- Ensure RLS is active and correct
ALTER TABLE public.metas_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanhas_bonificacao ENABLE ROW LEVEL SECURITY;

-- Re-create policies if needed (dropping first to be safe)
DROP POLICY IF EXISTS "Acesso total para autenticados em metas_config" ON public.metas_config;
CREATE POLICY "Acesso total para autenticados em metas_config" ON public.metas_config
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total para autenticados em campanhas_bonificacao" ON public.campanhas_bonificacao;
CREATE POLICY "Acesso total para autenticados em campanhas_bonificacao" ON public.campanhas_bonificacao
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);
