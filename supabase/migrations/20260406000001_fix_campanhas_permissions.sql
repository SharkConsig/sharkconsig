-- Fix permissions for campanhas table
GRANT ALL ON TABLE public.campanhas TO authenticated;
GRANT ALL ON TABLE public.campanhas TO anon;
GRANT ALL ON TABLE public.campanhas TO service_role;

-- Ensure RLS is enabled
ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and recreate
DROP POLICY IF EXISTS "Acesso total para autenticados" ON public.campanhas;
DROP POLICY IF EXISTS "Acesso total para todos" ON public.campanhas;

CREATE POLICY "Acesso total para todos" ON public.campanhas
    FOR ALL USING (true) WITH CHECK (true);
