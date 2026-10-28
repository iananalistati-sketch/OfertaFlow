import {createHash} from 'node:crypto';
import {NextResponse,type NextRequest} from 'next/server';
import {z} from 'zod';
import {offerflowServerDb} from '../../../../lib/supabase/service';
import {parseOfferMessage} from '../../../../lib/automation/message-parser';
import {classifyNiches} from '../../../../lib/automation/opportunity-engine';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const maxBodyBytes=16384;
const maxEventsPerHour=600;
const eventSchema=z.object({
  event_id:z.string().trim().min(4).max(160),
  message:z.string().trim().min(15).max(12000),
  image_url:z.string().trim().url().max(2000).refine(x=>{
    try {
      const u=new URL(x);
      return u.protocol==='https:' && !!u.hostname && !u.username && !u.password;
    }catch{return false;}
  }).optional(),
  test:z.boolean().default(false),
}).strict();

const answer=(body:Record<string,unknown>,status:number)=>NextResponse.json(body,{
  status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}
});

async function limitedBody(request:NextRequest):Promise<string|null>{
  if(!request.body)return null;
  const reader=request.body.getReader();
  const chunks:Uint8Array[]=[];
  let total=0;
  while(true){
    const {done,value}=await reader.read();
    if(done)break;
    total+=value.byteLength;
    if(total>maxBodyBytes){
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map(c=>Buffer.from(c))).toString('utf8');
}

/**
 * POST autenticado com token exclusivo da origem:
 * {event_id, message, image_url?, test?}
 * Não recebe mensagens diretamente do WhatsApp, não consulta URL,
 * não converte links e não cria publicação.
 */
export async function POST(request:NextRequest){
  const authorization=request.headers.get('authorization')||'';
  const match=/^Bearer (ofw_[A-Za-z0-9_-]{43})$/.exec(authorization);
  if(!match)return answer({error:'Credenciais da fonte ausentes ou inválidas.'},401);

  if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')
    return answer({error:'Envie Content-Type: application/json.'},415);
  const contentLength=Number(request.headers.get('content-length')||0);
  if(contentLength>maxBodyBytes)return answer({error:'Evento muito grande.'},413);

  try {
    const db=offerflowServerDb();
    const hash=createHash('sha256').update(match[1]).digest('hex');
    const {data:source,error:sourceError}=await db.from('offer_sources')
      .select('id,niche_id')
      .eq('webhook_token_hash',hash)
      .eq('source_kind','authorized_webhook')
      .eq('collection_enabled',true)
      .eq('capability_verified',true)
      .eq('status','ready')
      .maybeSingle();
    if(sourceError)return answer({error:'A conexão da fonte está temporariamente indisponível.'},503);
    if(!source)return answer({error:'Credenciais da fonte ausentes ou inválidas.'},401);

    const raw=await limitedBody(request);
    if(raw===null)return answer({error:'Evento vazio ou excede o limite de 16 KB.'},413);
    let input:unknown;
    try{input=JSON.parse(raw);}catch{return answer({error:'JSON inválido.'},400);}
    const validation=eventSchema.safeParse(input);
    if(!validation.success)
      return answer({error:'Evento inválido: informe event_id, message, e image_url HTTPS opcional.'},422);

    const offer=parseOfferMessage(validation.data.message);
    if(!offer.title)return answer({error:'Não foi possível extrair um título para a oferta.'},422);

    const {count, error:rateError}=await db.from('captured_offers')
      .select('id',{count:'exact',head:true})
      .eq('source_id',source.id)
      .gte('created_at',new Date(Date.now()-3600_000).toISOString());
    if(rateError)return answer({error:'Falha ao consultar limite da origem.'},503);
    if((count||0)>=maxEventsPerHour)
      return answer({error:'Limite de ingestão por origem atingido (600/hora).'},429);

    const {data:niches,error:nicheError}=await db.from('niches')
      .select('slug,name,interval_minutes,is_active,keywords')
      .eq('is_active',true);
    if(nicheError)return answer({error:'Falha ao consultar nichos.'},503);
    const configs=(niches||[]).map(n=>({
      slug:n.slug,name:n.name,intervalMinutes:n.interval_minutes,
      isActive:n.is_active,keywords:n.keywords||[]
    }));
    const proposed=classifyNiches(offer.title,configs);
    const suggested=[...new Set([
      ...(source.niche_id ? [] : proposed),
      ...((niches||[]).some(n=>n.slug==='todas-ofertas')?['todas-ofertas']:[])
    ])];
    // Quando a origem tem nicho fixo, incluir a categoria indicada pelo admin.
    if(source.niche_id){
      const niche=(niches||[]).find(n=>n.id===source.niche_id);
      if(niche && !suggested.includes(niche.slug))suggested.unshift(niche.slug);
    }
    const {error:insertError}=await db.from('captured_offers').insert({
      source_id:source.id,
      external_event_id:validation.data.event_id,
      marketplace:offer.marketplace,
      product_title:offer.title,
      original_product_url:offer.productUrl,
      original_affiliate_url:null,
      owner_affiliate_url:null,
      image_url:validation.data.image_url||null,
      price:offer.currentPrice,
      original_price:offer.originalPrice,
      coupon_code:offer.couponCode,
      suggested_niches:suggested,
      is_test:validation.data.test,
      conversion_status:'pending',
      blocked_reason:null,
      offer_verified_at:null,
      affiliate_link_verified_at:null,
    });
    if(insertError?.code==='23505')return answer({accepted:true,duplicate:true,published:false},200);
    if(insertError)return answer({error:'Falha ao registrar oferta. Nenhuma mensagem foi publicada.'},503);
    await db.from('offer_sources').update({last_received_at:new Date().toISOString()}).eq('id',source.id);
    return answer({
      accepted:true,duplicate:false,test:validation.data.test,
      marketplace:offer.marketplace,niches:suggested,
      validation:'pending',published:false
    },202);
  }catch{
    return answer({error:'Ingestão temporariamente indisponível.'},503);
  }
}

export async function GET(){
  return answer({error:'Utilize POST autenticado para ingestão de ofertas.'},405);
}
