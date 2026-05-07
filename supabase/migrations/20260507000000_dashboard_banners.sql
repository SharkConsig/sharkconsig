-- Create dashboard_banners table
CREATE TABLE IF NOT EXISTS public.dashboard_banners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    image_url TEXT NOT NULL,
    title TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Fix permissions for dashboard_banners table
GRANT ALL ON TABLE public.dashboard_banners TO authenticated;
GRANT ALL ON TABLE public.dashboard_banners TO anon;
GRANT ALL ON TABLE public.dashboard_banners TO service_role;

-- Enable RLS
ALTER TABLE public.dashboard_banners ENABLE ROW LEVEL SECURITY;

-- Policies for dashboard_banners
DROP POLICY IF EXISTS "Visualização para todos autenticados" ON public.dashboard_banners;
CREATE POLICY "Visualização para todos autenticados" ON public.dashboard_banners
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Gestão total para autenticados" ON public.dashboard_banners;
CREATE POLICY "Gestão total para autenticados" ON public.dashboard_banners
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create bucket for banners if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('dashboard-banners', 'dashboard-banners', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Acesso Público para Banners" ON storage.objects;
CREATE POLICY "Acesso Público para Banners" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'dashboard-banners');

DROP POLICY IF EXISTS "Upload para Autenticados Banners" ON storage.objects;
CREATE POLICY "Upload para Autenticados Banners" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'dashboard-banners');

DROP POLICY IF EXISTS "Update para Autenticados Banners" ON storage.objects;
CREATE POLICY "Update para Autenticados Banners" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'dashboard-banners');

DROP POLICY IF EXISTS "Delete para Autenticados Banners" ON storage.objects;
CREATE POLICY "Delete para Autenticados Banners" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'dashboard-banners');

-- Enable real-time for dashboard_banners
ALTER PUBLICATION supabase_realtime ADD TABLE public.dashboard_banners;
