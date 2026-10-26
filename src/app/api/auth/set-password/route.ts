import { NextResponse } from 'next/server';
import { z } from 'zod';
import { configured } from '../../../../lib/config';
import { serverClient } from '../../../../lib/supabase/server';

const passwordSchema = z.object({
  password: z.string().min(12, 'Use pelo menos 12 caracteres.').max(128),
});

export async function POST(request: Request) {
  if (!configured) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });

  const parsed = passwordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'A senha precisa ter entre 12 e 128 caracteres.' }, { status: 400 });
  }

  const supabase = await serverClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Sua sessão expirou. Entre novamente pelo link de acesso.' }, { status: 401 });
  }

  const { data: admin, error: adminError } = await supabase.from('admin_users')
    .select('user_id').eq('user_id', user.id).maybeSingle();
  if (adminError || !admin) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });

  // A API de autenticação Supabase faz o hash e armazena a senha; o app nunca a registra no banco.
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return NextResponse.json({ error: 'Não foi possível atualizar a senha. Confirme o acesso por e-mail e tente novamente.' }, { status: 400 });
  }
  return NextResponse.json({ message: 'Senha atualizada! Nos próximos acessos, utilize seu e-mail e senha.' });
}
