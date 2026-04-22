import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome_completo, username, senha, funcao, avatar_url, supervisor_id, supervisor_nome } = body;

    if (!nome_completo || !username || !senha || !funcao) {
      return NextResponse.json(
        { error: "Campos obrigatórios ausentes" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();
    
    // Sanitiza o username (remove espaços, converte para minúsculo)
    const sanitizedUsername = username.trim().toLowerCase().replace(/\s+/g, '.');
    const email = `${sanitizedUsername}@sharkconsig.com`;

    // Previne salvar Base64 no metadata (isso trava o JWT do usuário)
    const safeAvatarUrl = avatar_url?.startsWith('data:image') 
      ? `https://picsum.photos/seed/${username}/200/200` 
      : (avatar_url || `https://picsum.photos/seed/${username}/200/200`);

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: {
        nome_completo,
        username,
        funcao,
        avatar_url: safeAvatarUrl,
        supervisor_id: supervisor_id || null,
        supervisor_nome: supervisor_nome || null
      },
    });

    if (error) {
      console.error("Erro ao criar usuário no Supabase:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ user: data.user }, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro na API create-user:", error);
    const message = error instanceof Error ? error.message : "Erro interno do servidor";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
