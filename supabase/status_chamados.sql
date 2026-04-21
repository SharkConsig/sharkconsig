-- Tabela para gerenciar os status dos chamados
CREATE TABLE IF NOT EXISTS public.status_chamados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT UNIQUE NOT NULL,
    cor TEXT DEFAULT 'slate',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.status_chamados ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
-- Leitura permitida para todos os usuários autenticados
CREATE POLICY "Leitura permitida para usuários autenticados" 
ON public.status_chamados FOR SELECT 
TO authenticated 
USING (true);

-- Escrita (Insert, Update, Delete) permitida apenas para Administrador e Desenvolvedor
CREATE POLICY "Apenas Admin e Dev podem gerenciar status" 
ON public.status_chamados FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.perfis 
        WHERE id = auth.uid() AND role IN ('Administrador', 'Desenvolvedor')
    )
);

-- Inserir status iniciais se não existirem
INSERT INTO public.status_chamados (nome, cor) VALUES
('ABERTO', 'blue'),
('EM ATENDIMENTO', 'orange'),
('AGUARDANDO CORRETOR', 'purple'),
('FECHADO', 'slate'),
('CONCLUÍDO', 'green')
ON CONFLICT (nome) DO NOTHING;
