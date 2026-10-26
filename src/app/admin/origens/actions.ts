'use server';

import { revalidatePath } from 'next/cache';
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
