-- Migration to fix permissions on config tables
-- Sometimes policies need explicit GRANT to roles in Supabase

GRANT ALL ON public.convenios TO authenticated;
GRANT ALL ON public.bancos TO authenticated;
GRANT ALL ON public.tipos_operacao TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE public.convenios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_operacao ENABLE ROW LEVEL SECURITY;

-- Drop existing if any and recreate to be sure
DROP POLICY IF EXISTS "Acesso total para autenticados" ON public.convenios;
DROP POLICY IF EXISTS "Acesso total para autenticados" ON public.bancos;
DROP POLICY IF EXISTS "Acesso total para autenticados" ON public.tipos_operacao;

CREATE POLICY "Acesso total para autenticados" ON public.convenios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total para autenticados" ON public.bancos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total para autenticados" ON public.tipos_operacao FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Also useful for development if testing without full session in some views
GRANT ALL ON public.convenios TO anon;
GRANT ALL ON public.bancos TO anon;
GRANT ALL ON public.tipos_operacao TO anon;

CREATE POLICY "Acesso total para anon" ON public.convenios FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total para anon" ON public.bancos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total para anon" ON public.tipos_operacao FOR ALL TO anon USING (true) WITH CHECK (true);
