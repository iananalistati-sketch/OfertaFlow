'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { configured } from '../../../lib/config';
import { serverClient } from '../../../lib/supabase/server';

const groupSchema = z.object({
 name: z.string().trim().min(3).max(120),
 niche_id: z.string().uuid(),
 invite_url: z.union([z.literal(''),z.string().url().regex(/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+$/)]),
 is_active: z.boolean()
});
async function authorizedDb(){
 if(!configured) throw new Error('Configure o Supabase para salvar grupos.');
 const db=await serverClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user) throw new Error('Faça login novamente.');
 const {data:admin,error}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(error || !admin) throw new Error('Acesso administrativo necessário.');
 return db;
}
export async function saveGroup(form:FormData){
 const db=await authorizedDb();
 const id=String(form.get('id')||'');
 if(id && !z.string().uuid().safeParse(id).success) throw new Error('Identificador do grupo inválido.');
 const result=groupSchema.safeParse({
  name:form.get('name'),niche_id:form.get('niche_id'),
  invite_url:form.get('invite_url'),is_active:form.get('is_active')==='on'
 });
 if(!result.success) throw new Error('Confira nome, nicho e link de convite. Utilize https://chat.whatsapp.com/...');
 const {data:niche}=await db.from('niches').select('id').eq('id',result.data.niche_id).eq('is_active',true).maybeSingle();
 if(!niche) throw new Error('Selecione um nicho ativo.');
 const payload={...result.data,invite_url:result.data.invite_url||null,auto_publish:false,channel_verified:false};
 const {error}=id?await db.from('whatsapp_groups').update(payload).eq('id',id):await db.from('whatsapp_groups').insert(payload);
 if(error) throw new Error(error.message);
 revalidatePath('/admin/grupos');
 redirect('/admin/grupos');
}
export async function toggleGroup(form:FormData){
 const db=await authorizedDb();
 const id=z.string().uuid().parse(form.get('id'));
 const {data:group,error:readError}=await db.from('whatsapp_groups').select('is_active').eq('id',id).single();
 if(readError || !group) throw new Error('Grupo não encontrado.');
 const {error}=await db.from('whatsapp_groups').update({is_active:!group.is_active,auto_publish:false}).eq('id',id);
 if(error) throw new Error(error.message);
 revalidatePath('/admin/grupos');
}
