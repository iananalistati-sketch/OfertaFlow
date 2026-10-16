'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { configured } from '../../../lib/config';
import { serverClient } from '../../../lib/supabase/server';
const accountSchema=z.object({display_name:z.string().trim().min(2).max(100),provider:z.enum(['shopee','aliexpress','manual'])});
const productSchema=z.object({title:z.string().trim().min(3).max(250),description:z.string().max(1500),price:z.coerce.number().min(0),affiliate_url:z.union([z.literal(''),z.string().url().max(2000)]),image_url:z.union([z.literal(''),z.string().url().max(2000)]),account_id:z.union([z.literal(''),z.string().uuid()]),niche_ids:z.array(z.string().uuid()).max(30)});
async function dbAdmin(){
 if(!configured)throw Error('Configure o Supabase.');
 const db=await serverClient();const {data:{user}}=await db.auth.getUser();
 if(!user)throw Error('Faça login.');
 const {data:admin}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(!admin)throw Error('Sem permissão de administrador.');
 return db;
}
export async function saveAccount(form:FormData){
 const db=await dbAdmin();const id=String(form.get('id')||'');
 if(id)z.string().uuid().parse(id);
 const parsed=accountSchema.safeParse({display_name:form.get('display_name'),provider:form.get('provider')});
 if(!parsed.success)throw Error('Conta inválida.');
 const payload={...parsed.data,status:'pending'};
 const {error}=id?await db.from('affiliate_accounts').update(payload).eq('id',id):await db.from('affiliate_accounts').insert(payload);
 if(error)throw Error(error.message);revalidatePath('/admin/catalogo');
}
export async function saveProduct(form:FormData){
 const db=await dbAdmin();const id=String(form.get('id')||'');if(id)z.string().uuid().parse(id);
 const parsed=productSchema.safeParse({title:form.get('title'),description:form.get('description')||'',price:form.get('price'),affiliate_url:form.get('affiliate_url')||'',image_url:form.get('image_url')||'',account_id:form.get('account_id')||'',niche_ids:form.getAll('niche_ids')});
 if(!parsed.success)throw Error('Confira os dados do produto, preço, links e nichos.');
 const p=parsed.data;
 const {data:niches,error:ne}=await db.from('niches').select('id').in('id',p.niche_ids);
 if(ne|| (niches?.length||0)!==new Set(p.niche_ids).size)throw Error('Nichos inválidos.');
 const payload={title:p.title,description:p.description,price:p.price,affiliate_url:p.affiliate_url||null,image_url:p.image_url||null,account_id:p.account_id||null,source:'manual',status:'draft',offer_verified_at:null};
 const result=id?await db.from('affiliate_products').update(payload).eq('id',id).select('id').single():await db.from('affiliate_products').insert(payload).select('id').single();
 if(result.error||!result.data)throw Error(result.error?.message||'Não foi possível gravar.');
 const productId=result.data.id;
 const {error:deleteError}=await db.from('product_niches').delete().eq('product_id',productId);
 if(deleteError)throw Error(deleteError.message);
 if(p.niche_ids.length){const {error}=await db.from('product_niches').insert(p.niche_ids.map(niche_id=>({product_id:productId,niche_id})));if(error)throw Error(error.message);}
 revalidatePath('/admin/catalogo');
}
