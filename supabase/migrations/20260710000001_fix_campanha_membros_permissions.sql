-- Fix permissions for campanha_membros table
GRANT ALL ON TABLE public.campanha_membros TO authenticated;
GRANT ALL ON TABLE public.campanha_membros TO anon;
GRANT ALL ON TABLE public.campanha_membros TO service_role;

-- Ensure RLS is enabled (as requested by user)
ALTER TABLE public.campanha_membros ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and recreate
DROP POLICY IF EXISTS "Acesso total para todos" ON public.campanha_membros;
DROP POLICY IF EXISTS "Acesso total para autenticados" ON public.campanha_membros;

CREATE POLICY "Acesso total para todos" ON public.campanha_membros
    FOR ALL USING (true) WITH CHECK (true);
