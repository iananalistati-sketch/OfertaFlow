'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { configured } from '../../../lib/config';
import { serverClient } from '../../../lib/supabase/server';

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  emoji: z.string().trim().min(1).max(12),
  interval_minutes: z.coerce.number().int().min(5).max(1440),
  is_active: z.boolean()
});
async function adminDb() {
  if (!configured) throw new Error('Configure o Supabase para editar nichos.');
  const db = await serverClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) throw new Error('Faça login para continuar.');
  const { data: admin } = await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
  if (!admin) throw new Error('Usuário sem permissão administrativa.');
  return db;
}
export async function saveNiche(formData: FormData) {
  const db = await adminDb();
  const id = String(formData.get('id') || '');
  const validated = schema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    emoji: formData.get('emoji'),
    interval_minutes: formData.get('interval_minutes'),
    is_active: formData.get('is_active') === 'on'
  });
  if (!validated.success) throw new Error('Verifique nome, identificador e intervalo (5–1440 min).');
  const query = id
    ? db.from('niches').update(validated.data).eq('id',id)
    : db.from('niches').insert(validated.data);
  const { error } = await query;
  if (error) throw new Error(error.code === '23505' ? 'Este identificador já existe.' : error.message);
  revalidatePath('/admin/nichos');
  revalidatePath('/admin');
  redirect('/admin/nichos');
}
export async function toggleNiche(formData: FormData) {
  const db = await adminDb();
  const id = z.string().uuid().parse(formData.get('id'));
  const current = formData.get('current') === 'true';
  const {error} = await db.from('niches').update({is_active: !current}).eq('id',id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/nichos');
  revalidatePath('/admin');
}

/** Admin escolhe a intenção por nicho. O publicador sempre exigirá canal verificado. */
export async function toggleAutoPublish(formData: FormData) {
  const db = await adminDb();
  const id = z.string().uuid().parse(formData.get('id'));
  const { data: niche, error: lookupError } = await db.from('niches')
    .select('auto_publish_enabled').eq('id', id).single();
  if (lookupError || !niche) throw new Error('Nicho não encontrado.');
  const { error } = await db.from('niches')
    .update({ auto_publish_enabled: !niche.auto_publish_enabled }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/nichos');
  revalidatePath('/admin');
}
