'use server';

import { revalidatePath } from 'next/cache';
import { createHash,randomBytes } from 'node:crypto';
import { z } from 'zod';
import { serverClient } from '../../../lib/supabase/server';

export type OriginActionState = {error:string|null;success:string|null};
const schema=z.object({
 display_name:z.string().trim().min(3).max(120),
 source_kind:z.enum(['group_reference','authorized_feed','authorized_webhook']),
 niche_id:z.union([z.literal(''),z.string().uuid()]),
});

export async function addOfferSource(_state:OriginActionState,form:FormData):Promise<OriginActionState> {
 const parsed=schema.safeParse({
   display_name:form.get('display_name'),
   source_kind:form.get('source_kind'),
   niche_id:form.get('niche_id')||'',
 });
 if(!parsed.success) return {error:'Informe um nome, o tipo de origem e um nicho válido.',success:null};

 const db=await serverClient();
 const {data:{user},error:userError}=await db.auth.getUser();
 if(userError||!user) return {error:'Sua sessão expirou. Entre novamente.',success:null};
 const {data:admin,error:adminError}=await db.from('admin_users')
   .select('user_id').eq('user_id',user.id).maybeSingle();
 if(adminError||!admin) return {error:'Permissão administrativa necessária.',success:null};
 const {error}=await db.from('offer_sources').insert({
   display_name:parsed.data.display_name,
   source_kind:parsed.data.source_kind,
   niche_id:parsed.data.niche_id||null,
   capability_verified:false,
   collection_enabled:false,
   status:'not_connected',
 });
 if(error) return {error:'Não foi possível cadastrar a referência de origem (código '+(error.code||'desconhecido')+').',success:null};
 revalidatePath('/admin/origens');
 return {error:null,success:'Origem cadastrada como não conectada. Nenhuma mensagem está sendo monitorada.'};
}

export type WebhookActionState={error:string|null;success:string|null;token:string|null};
const initialState:WebhookActionState={error:null,success:null,token:null};

async function authenticatedAdmin(){
 const db=await serverClient();
 const {data:{user},error:userError}=await db.auth.getUser();
 if(userError||!user)return null;
 const {data:admin,error:adminError}=await db.from('admin_users')
   .select('user_id').eq('user_id',user.id).maybeSingle();
 if(adminError||!admin)return null;
 return db;
}

/** Emite uma chave aleatória de uso exclusivo da origem.
 * O navegador do admin recebe a chave uma única vez; no banco só existe seu hash.
 * Confirmação é declaração do admin, não aprovação oficial pelo WhatsApp.
 */
export async function activateWebhookSource(_previous:WebhookActionState,form:FormData):Promise<WebhookActionState>{
 const parsed=z.string().uuid().safeParse(form.get('source_id'));
 if(!parsed.success)return {...initialState,error:'Origem inválida.'};
 if(form.get('permission_confirmed')!=='on')
   return {...initialState,error:'Confirme que você controla a fonte ou tem autorização para receber os eventos.'};
 const db=await authenticatedAdmin();
 if(!db)return {...initialState,error:'Acesso administrativo necessário.'};
 const token='ofw_'+randomBytes(32).toString('base64url');
 const hash=createHash('sha256').update(token).digest('hex');
 const {data,error}=await db.from('offer_sources')
   .update({
     webhook_token_hash:hash,
     capability_verified:true,
     collection_enabled:true,
     status:'ready'
   })
   .eq('id',parsed.data)
   .eq('source_kind','authorized_webhook')
   .select('id').maybeSingle();
 if(error||!data)return {...initialState,error:'Não foi possível habilitar a fonte. Confira seu tipo e as permissões.'};
 revalidatePath('/admin/origens');
 return {error:null,success:'Fonte habilitada. Salve a chave agora: ela não será exibida novamente. Nenhuma integração externa foi conectada automaticamente.',token};
}

export async function disableWebhookSource(_previous:WebhookActionState,form:FormData):Promise<WebhookActionState>{
 const parsed=z.string().uuid().safeParse(form.get('source_id'));
 if(!parsed.success)return {...initialState,error:'Origem inválida.'};
 const db=await authenticatedAdmin();
 if(!db)return {...initialState,error:'Acesso administrativo necessário.'};
 const {data,error}=await db.from('offer_sources')
   .update({collection_enabled:false,capability_verified:false,status:'disabled',webhook_token_hash:null})
   .eq('id',parsed.data).eq('source_kind','authorized_webhook')
   .select('id').maybeSingle();
 if(error||!data)return {...initialState,error:'Não foi possível desativar a origem.'};
 revalidatePath('/admin/origens');
 return {...initialState,success:'Origem desativada e token revogado.'};
}
