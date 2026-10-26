import { NextResponse } from 'next/server';
import { configured } from '../../../../lib/config';
import { serverClient } from '../../../../lib/supabase/server';

export async function POST() {
  if (!configured) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  const supabase = await serverClient();
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) return NextResponse.json({ error: 'Não foi possível sair da conta.' }, { status: 500 });
  return NextResponse.json({ message: 'Sessão encerrada.' });
}
