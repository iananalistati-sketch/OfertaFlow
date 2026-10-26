import { NextResponse } from 'next/server';
import { z } from 'zod';
import { configured } from '../../../../lib/config';
import { serverClient } from '../../../../lib/supabase/server';

const credentialsSchema = z.object({
  email: z.email().trim().max(254),
  password: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  if (!configured) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });

  const parsed = credentialsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Informe seu e-mail e sua senha.' }, { status: 400 });

  const supabase = await serverClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user?.id) {
    return NextResponse.json({ error: 'E-mail ou senha inválidos.' }, { status: 401 });
  }

  // Autenticar não é suficiente: somente usuários presentes em admin_users podem acessar.
  const { data: admin, error: adminError } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (adminError || !admin) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: 'Acesso administrativo não autorizado.' }, { status: 403 });
  }

  return NextResponse.json({ message: 'Acesso autorizado.' });
}
