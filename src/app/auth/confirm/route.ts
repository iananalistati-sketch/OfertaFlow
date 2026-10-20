import { NextRequest, NextResponse } from 'next/server';
import { configured } from '../../../lib/config';
import { serverClient } from '../../../lib/supabase/server';

export async function GET(request: NextRequest) {
  const loginUrl = new URL('/admin/login', request.url);
  if (!configured) return NextResponse.redirect(loginUrl);
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const code = url.searchParams.get('code');
  const supabase = await serverClient();

  // Supabase pode retornar um code (PKCE) ou token_hash (modelo personalizado).
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return NextResponse.redirect(new URL(error ? '/admin/login' : '/admin', request.url));
  }
  if (tokenHash && type === 'email') {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
    return NextResponse.redirect(new URL(error ? '/admin/login' : '/admin', request.url));
  }
  return NextResponse.redirect(loginUrl);
}
