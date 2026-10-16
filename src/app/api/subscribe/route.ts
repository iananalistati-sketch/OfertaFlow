import {NextResponse} from 'next/server';import {createClient} from '@supabase/supabase-js';import {z} from 'zod';import {mockNiches} from '../../../lib/config';
const schema=z.object({name:z.string().trim().min(2).max(100),phone:z.string().trim().min(10).max(25),niches:z.array(z.enum(['tecnologia','games','casa','todas-ofertas'])).min(1).max(4),consent:z.literal(true),website:z.string().max(300).optional()});
export async function POST(request:Request){
 const body=await request.json().catch(()=>null);const parsed=schema.safeParse(body);
 if(!parsed.success)return NextResponse.json({error:'Verifique os dados, seus interesses e o consentimento.'},{status:400});
 if(parsed.data.website)return NextResponse.json({message:'Solicitação recebida.',invites:[]});
 const phone=parsed.data.phone.replace(/\D/g,'');if(phone.length<10||phone.length>13)return NextResponse.json({error:'Número de WhatsApp inválido.'},{status:400});
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)return NextResponse.json({error:'Modo demonstração: cadastros reais estão desativados até conectar o Supabase.'},{status:503});
 // Necessário rate limiting persistente e CAPTCHA antes de publicar este endpoint na internet.
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:niches,error:ne}=await db.from('niches').select('id,slug,name').in('slug',parsed.data.niches).eq('is_active',true);if(ne||!niches||niches.length!==new Set(parsed.data.niches).size)return NextResponse.json({error:'Um dos nichos escolhidos não está disponível.'},{status:400});
 const {data:subscriber,error:se}=await db.from('subscribers').upsert({name:parsed.data.name,phone_e164:phone.startsWith('55')?`+${phone}`:`+55${phone}`,consent_at:new Date().toISOString(),consent_source:'landing-v1'},{onConflict:'phone_e164'}).select('id').single();
 if(se||!subscriber)return NextResponse.json({error:'Não foi possível concluir o cadastro.'},{status:500});
 const {error:ie}=await db.from('subscriber_niches').upsert(niches.map(n=>({subscriber_id:subscriber.id,niche_id:n.id})),{onConflict:'subscriber_id,niche_id'});if(ie)return NextResponse.json({error:'Falha ao salvar os nichos.'},{status:500});
 const {data:groups}=await db.from('whatsapp_groups').select('niche_id,invite_url').in('niche_id',niches.map(n=>n.id)).eq('is_active',true).not('invite_url','is',null);
 const invites=(groups||[]).filter(g=>typeof g.invite_url==='string'&&/^https:\/\/chat\.whatsapp\.com\//.test(g.invite_url)).map(g=>({name:niches.find(n=>n.id===g.niche_id)?.name||'Grupo',url:g.invite_url as string}));
 return NextResponse.json({message:invites.length?'Cadastro concluído! Escolha os convites abaixo.':'Cadastro concluído. Os convites ainda não foram configurados.',invites});
}
