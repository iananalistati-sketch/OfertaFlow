import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverClient } from '../../../lib/supabase/server';
import { configured } from '../../../lib/config';

export async function POST(request: Request) {
  if (!configured) return NextResponse.json({ error:'Configure o Supabase primeiro.' }, {status:503});
  const parsed = z.object({email:z.email().trim().max(254)}).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({error:'E-mail inválido.'},{status:400});

  const supabase = await serverClient();
  const {error} = await supabase.auth.signInWithOtp({
    email:parsed.data.email,
    options:{
      shouldCreateUser:false, // Nunca criar contas administrativas via endpoint público.
      emailRedirectTo:new URL('/auth/confirm',request.url).toString(),
    },
  });
  if (error) return NextResponse.json({message:'Se houver um usuário autorizado, você receberá um link de acesso.'});
  return NextResponse.json({message:'Se houver um usuário autorizado, você receberá um link de acesso.'});
}
