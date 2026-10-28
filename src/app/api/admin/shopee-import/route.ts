import {NextResponse,type NextRequest} from 'next/server';
import {z} from 'zod';
import {serverClient} from '../../../../lib/supabase/server';
import {configured} from '../../../../lib/config';
import {ShopeeAdapter,ShopeeApiError} from '../../../../lib/adapters/shopee';
import {prepareShopeeImport} from '../../../../lib/automation/shopee-import';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const schema=z.object({keyword:z.string().trim().min(2).max(60)}).strict();
const response=(body:Record<string,unknown>,status:number)=>
  NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});

/**
 * Importação deliberadamente iniciada por administrador. Depois será utilizada
 * pelo agendador autorizado, sem enviar mensagens ou gerar links artificiais.
 * Nunca aceita dados de produto nem preços enviados diretamente pelo navegador.
 */
export async function POST(request:NextRequest){
  if(!configured)return response({error:'Supabase não configurado.'},503);
  const origin=request.headers.get('origin');
  if(origin && origin!==new URL(request.url).origin)
    return response({error:'Origem não autorizada.'},403);
  const db=await serverClient();
  const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user)return response({error:'Faça login para importar ofertas.'},401);
  const {data:admin,error:adminError}=await db.from('admin_users')
    .select('user_id').eq('user_id',user.id).maybeSingle();
  if(adminError||!admin)return response({error:'Acesso administrativo não autorizado.'},403);
  const length=Number(request.headers.get('content-length')||0);
  if(length>2048)return response({error:'Solicitação muito grande.'},413);
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return response({error:'Informe uma palavra-chave de 2 a 60 caracteres.'},400);
  const {data:account,error:accountError}=await db.from('affiliate_accounts')
    .select('id,status').eq('provider','shopee').neq('status','disabled')
    .order('created_at',{ascending:true}).limit(1).maybeSingle();
  if(accountError)return response({error:'Não foi possível consultar a conta Shopee.'},503);
  if(!account)return response({error:'Cadastre uma conta Shopee em Integrações antes de importar.'},409);

  let search:Awaited<ReturnType<ShopeeAdapter['searchOffers']>>;
  try{
    search=await new ShopeeAdapter().searchOffers(parsed.data.keyword,10);
  }catch(error){
    if(error instanceof ShopeeApiError)return response({error:error.message,code:error.code},error.status);
    return response({error:'Falha ao consultar a API Shopee.'},502);
  }
  if(!search.offers.length)return response({
    imported:0,skipped:0,tagged:0,warning:'A API não retornou produtos completos com link afiliado.',
    published:false
  },200);

  const {data:niches,error:nicheError}=await db.from('niches')
    .select('id,slug,name,interval_minutes,is_active,keywords').eq('is_active',true);
  if(nicheError)return response({error:'Falha ao consultar nichos.'},503);
  const configs=(niches||[]).map(n=>({
    slug:n.slug,name:n.name,intervalMinutes:n.interval_minutes,
    isActive:n.is_active,keywords:n.keywords||[]
  }));
  const prepared=prepareShopeeImport(search.offers,account.id,configs);
  if(prepared.rows.length===0)return response({
    imported:0,skipped:prepared.skipped,tagged:0,warning:'Produtos retornados foram rejeitados na validação.',
    published:false
  },200);
  // Chave UNIQUE completa de (account_id,external_id) impede duplicatas em importações futuras.
  // Mantemos status=draft mesmo com link oficial, pois a autorização do canal ainda é desconhecida.
  const {data:saved,error:saveError}=await db.from('affiliate_products')
    .upsert(prepared.rows,{onConflict:'account_id,external_id'})
    .select('id,external_id');
  if(saveError)return response({error:'Falha ao salvar o catálogo Shopee; nenhum anúncio foi enviado.'},503);
  const nicheBySlug=new Map((niches||[]).map(n=>[n.slug,n.id]));
  const tagById=new Map(prepared.categories.map(c=>[c.externalId,c.slugs]));
  const relations=(saved||[]).flatMap(p=>(tagById.get(p.external_id)||[])
    .flatMap(slug=>{
      const nicheId=nicheBySlug.get(slug);
      return nicheId?[{product_id:p.id,niche_id:nicheId}]:[];
    }));
  if(relations.length){
    const {error:relationsError}=await db.from('product_niches')
      .upsert(relations,{onConflict:'product_id,niche_id',ignoreDuplicates:true});
    if(relationsError)return response({
      error:'Produtos foram gravados, mas ocorreu falha na classificação. Reexecute a importação.',
      imported:saved?.length||0,published:false
    },503);
  }
  return response({
    imported:saved?.length||0,
    skipped:prepared.skipped,
    duplicatesInResponse:prepared.duplicates,
    tagged:relations.length,
    checkedAt:search.checkedAt,
    hasNextPage:search.hasNextPage,
    status:'draft',
    published:false,
    note:'Ofertas da API registradas como rascunho. Sem publicação; valores e comissões podem mudar.'
  },200);
}
