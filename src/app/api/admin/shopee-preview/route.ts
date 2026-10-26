import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { serverClient } from '../../../../lib/supabase/server';
import { configured } from '../../../../lib/config';
import { ShopeeAdapter, ShopeeApiError } from '../../../../lib/adapters/shopee';

export const runtime = 'nodejs';

const schema = z.object({
  keyword: z.string().trim().min(2).max(60),
});

export async function POST(request: NextRequest) {
  if (!configured) return NextResponse.json({ error: 'Supabase ainda não configurado.' }, { status: 503 });

  // Endpoint privado para diagnóstico: apenas o próprio site pode chamá-lo via navegador.
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Origem não autorizada.' }, { status: 403 });
  }

  const db = await serverClient();
  const { data: { user }, error: userError } = await db.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Faça login para continuar.' }, { status: 401 });
  }
  const { data: admin, error: adminError } = await db.from('admin_users')
    .select('user_id').eq('user_id', user.id).maybeSingle();
  if (adminError || !admin) {
    return NextResponse.json({ error: 'Acesso administrativo não autorizado.' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Digite um termo de busca de 2 a 60 caracteres.' }, { status: 400 });

  try {
    const result = await new ShopeeAdapter().searchOffers(parsed.data.keyword, 8);
    return NextResponse.json({
      offers: result.offers,
      checkedAt: result.checkedAt,
      hasNextPage: result.hasNextPage,
      note: 'Prévia da API. Nada foi gravado ou publicado. Confira as regras de divulgação da sua conta Shopee.',
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof ShopeeApiError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('[OfertaFlow Shopee] Falha inesperada na consulta.');
    return NextResponse.json({ error: 'Não foi possível consultar a Shopee.' }, { status: 502 });
  }
}
