'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { configured } from '../../../lib/config';
import { serverClient } from '../../../lib/supabase/server';
import { normalizeGroupInviteLink } from '../../../lib/groups/invite-validation';

const nullableInteger = (minimum:number,maximum:number) => z.preprocess(
  value => value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
    ? null : value,
  z.union([z.null(), z.coerce.number().int().min(minimum).max(maximum)])
);

const groupSchema = z.object({
  name: z.string().trim().min(3).max(120),
  niche_id: z.string().uuid(),
  invite_url: z.string().trim().max(2048),
  is_active: z.boolean(),
  member_count: nullableInteger(0,10000),
  capacity_limit: nullableInteger(2,10000),
  is_full: z.boolean(),
});

export type SaveGroupState = { error: string | null };
const fieldLabels: Record<string,string> = {
  name:'Nome do grupo',
  niche_id:'Nicho',
  invite_url:'Link de convite',
  is_active:'Convite ativo',
  member_count:'Membros atuais',
  capacity_limit:'Capacidade do grupo',
  is_full:'Grupo lotado',
};

async function authorizedDb() {
  if (!configured) throw new Error('Supabase não configurado.');
  const db = await serverClient();
  const { data:{user}, error } = await db.auth.getUser();
  if (error || !user) throw new Error('Sessão expirada. Entre novamente no painel.');
  const { data:admin, error:adminError } = await db.from('admin_users')
    .select('user_id').eq('user_id',user.id).maybeSingle();
  if (adminError || !admin) throw new Error('Sua conta não possui autorização administrativa.');
  return db;
}

export async function saveGroup(_previous: SaveGroupState, form: FormData): Promise<SaveGroupState> {
  const id = String(form.get('id') || '').trim();
  if (id && !z.string().uuid().safeParse(id).success) {
    return { error:'O identificador do grupo é inválido.' };
  }

  const result = groupSchema.safeParse({
    name:form.get('name'),
    niche_id:form.get('niche_id'),
    invite_url:form.get('invite_url') ?? '',
    is_active:form.get('is_active') === 'on',
    member_count:form.get('member_count') ?? '',
    capacity_limit:form.get('capacity_limit') ?? '',
    is_full:form.get('is_full') === 'on',
  });
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = fieldLabels[String(issue.path[0])] || 'Campo';
    const more = String(issue.path[0]) === 'niche_id'
      ? 'Selecione uma categoria válida.'
      : String(issue.path[0]) === 'member_count'
        ? 'Informe um número inteiro igual ou maior que zero.'
        : String(issue.path[0]) === 'capacity_limit'
          ? 'Informe um número inteiro entre 2 e 10.000.'
          : 'Confira o valor informado.';
    return { error:field+': '+more };
  }

  const d = result.data;
  let inviteUrl: string | null;
  try { inviteUrl = normalizeGroupInviteLink(d.invite_url); }
  catch (error) { return { error:error instanceof Error ? error.message : 'Link de convite inválido.' }; }

  if (d.is_active && !inviteUrl) {
    return { error:'Para ativar o convite, cole o link do grupo obtido no WhatsApp.' };
  }
  if (d.member_count !== null && d.capacity_limit !== null && d.member_count > d.capacity_limit) {
    return { error:'Membros atuais: a quantidade não pode ser maior que a capacidade informada.' };
  }

  try {
    const db = await authorizedDb();
    const { data:niche, error:nicheError } = await db.from('niches')
      .select('id').eq('id',d.niche_id).eq('is_active',true).maybeSingle();
    if (nicheError || !niche) return { error:'O nicho selecionado não está ativo ou não foi encontrado.' };

    const payload = {
      name:d.name,
      niche_id:d.niche_id,
      invite_url:inviteUrl,
      is_active:d.is_active,
      member_count:d.member_count,
      capacity_limit:d.capacity_limit,
      is_full:d.is_full || (d.member_count !== null && d.capacity_limit !== null &&
        d.member_count >= d.capacity_limit),
      capacity_updated_at:(d.member_count !== null || d.capacity_limit !== null || d.is_full)
        ? new Date().toISOString() : null,
      auto_publish:false,
      channel_verified:false,
    };
    const { error } = id
      ? await db.from('whatsapp_groups').update(payload).eq('id',id)
      : await db.from('whatsapp_groups').insert(payload);
    if (error) {
      console.error('[OfertaFlow] Falha ao salvar grupo:',error.code || 'database_error');
      return { error:'O banco não conseguiu salvar o grupo. Código: '+(error.code || 'indisponível') };
    }

    // Expansão é apenas uma pendência administrativa; não cria grupo real no WhatsApp.
    const { data:allGroups, error:lookupError } = await db.from('whatsapp_groups')
      .select('id,is_active,invite_url,is_full,member_count,capacity_limit')
      .eq('niche_id',d.niche_id);
    if (!lookupError) {
      const available = (allGroups || []).some(g =>
        g.is_active && !!g.invite_url && !g.is_full &&
        (g.member_count === null || g.capacity_limit === null || g.member_count < g.capacity_limit));
      if (!available) {
        const { data:pending, error:pendingError } = await db.from('group_expansion_requests')
          .select('id').eq('niche_id',d.niche_id).eq('status','pending').limit(1);
        if (!pendingError && !pending?.length) {
          await db.from('group_expansion_requests')
            .insert({ niche_id:d.niche_id,reason:'no_available_group' });
        }
      } else {
        await db.from('group_expansion_requests')
          .update({status:'resolved',resolved_at:new Date().toISOString()})
          .eq('niche_id',d.niche_id).eq('status','pending');
      }
    }
  } catch (error) {
    console.error('[OfertaFlow] Falha no cadastro de grupos:',error instanceof Error ? error.name : 'unknown');
    return { error:error instanceof Error ? error.message : 'Falha ao salvar o grupo.' };
  }

  revalidatePath('/admin/grupos');
  revalidatePath('/admin');
  revalidatePath('/entrar');
  redirect('/admin/grupos?salvo=1');
}

export async function toggleGroup(form:FormData) {
  const db=await authorizedDb();
  const id=z.string().uuid().parse(form.get('id'));
  const {data:group,error:readError}=await db.from('whatsapp_groups')
    .select('is_active').eq('id',id).single();
  if (readError || !group) throw new Error('Grupo não encontrado.');
  const {error}=await db.from('whatsapp_groups')
    .update({is_active:!group.is_active,auto_publish:false}).eq('id',id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/grupos');
  revalidatePath('/entrar');
}
