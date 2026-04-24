-- Migration to fix permissions on propostas table
GRANT ALL ON public.propostas TO authenticated;
GRANT ALL ON public.propostas TO anon;
GRANT ALL ON public.propostas TO service_role;

-- Ensure RLS is enabled
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;

-- Recreate policies to be sure
DROP POLICY IF EXISTS "Acesso total para autenticados" ON public.propostas;
CREATE POLICY "Acesso total para autenticados" ON public.propostas FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total para anon" ON public.propostas;
CREATE POLICY "Acesso total para anon" ON public.propostas FOR ALL TO anon USING (true) WITH CHECK (true);
