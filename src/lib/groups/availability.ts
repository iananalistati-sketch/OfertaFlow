export type GroupAvailability = {
  id:string; niche_id:string; name:string; invite_url:string|null; is_active:boolean;
  is_full:boolean; member_count:number|null; capacity_limit:number|null; created_at:string;
};
export type GroupOption = GroupAvailability & { capacityState:'available'|'unknown'|'full' };

export function withAvailability(group: GroupAvailability): GroupOption {
  const full = group.is_full || (
    group.capacity_limit !== null && group.member_count !== null &&
    group.member_count >= group.capacity_limit
  );
  return { ...group, capacityState: full ? 'full' :
    group.member_count === null || group.capacity_limit === null ? 'unknown' : 'available' };
}
/** Não faz consultas WhatsApp: considera somente lotação informada ou confirmada por futuro provedor. */
export function selectInviteGroup(groups: GroupAvailability[]): GroupOption|null {
  return groups.filter(group=>group.is_active && !!group.invite_url)
    .map(withAvailability).filter(group=>group.capacityState!=='full')
    .sort((a,b)=>{
      const rank=(x:GroupOption)=>x.capacityState==='available'?0:1;
      return rank(a)-rank(b) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);
    })[0] || null;
}
