import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

let supabaseAdminInstance: any = null;

function getSupabaseAdmin() {
  if (!supabaseAdminInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Configuração do Supabase Admin incompleta. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
    }

    supabaseAdminInstance = createClient(url, key);
  }
  return supabaseAdminInstance;
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // 1. Garantir que o bucket existe
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.id === 'avatars');

    if (!bucketExists) {
      const { error: createError } = await supabaseAdmin.storage.createBucket('avatars', {
        public: true,
        fileSizeLimit: 2097152, // 2MB
      });
      if (createError) throw createError;
    }

    // 2. Upload do arquivo
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) throw uploadError;

    // 3. Obter URL pública
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return NextResponse.json({ publicUrl });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Erro no proxy de upload:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
