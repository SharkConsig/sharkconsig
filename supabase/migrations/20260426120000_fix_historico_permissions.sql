-- Migration to fix permissions on historico_propostas table
GRANT ALL ON public.historico_propostas TO authenticated;
GRANT ALL ON public.historico_propostas TO anon;
GRANT ALL ON public.historico_propostas TO service_role;

-- Ensure RLS is enabled
ALTER TABLE public.historico_propostas ENABLE ROW LEVEL SECURITY;

-- Ensure policies exist
DROP POLICY IF EXISTS "Acesso total para autenticados" ON public.historico_propostas;
CREATE POLICY "Acesso total para autenticados" ON public.historico_propostas FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total para anon" ON public.historico_propostas;
CREATE POLICY "Acesso total para anon" ON public.historico_propostas FOR ALL TO anon USING (true) WITH CHECK (true);

-- Also ensure sequence permissions
GRANT USAGE, SELECT ON SEQUENCE public.historico_propostas_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.historico_propostas_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.historico_propostas_id_seq TO service_role;
