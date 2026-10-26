'use client';
import {useActionState} from 'react';
import {addOfferSource,type OriginActionState} from './actions';

type Niche={id:string;name:string};
const initial:OriginActionState={error:null,success:null};

export function OriginForm({niches}:{niches:Niche[]}){
 const [state,action,pending]=useActionState(addOfferSource,initial);
 return <form action={action} className="form">
  <label>Nome da origem
    <input name="display_name" required minLength={3} maxLength={120}
      placeholder="Ex.: Grupo de promoções de tecnologia"/>
  </label>
  <label>Tipo de origem
    <select name="source_kind" defaultValue="group_reference"
      style={{padding:14,borderRadius:9,background:'#0e1729',color:'#fff',border:'1px solid #34415b'}}>
      <option value="group_reference">Grupo WhatsApp (referência; sem monitoramento)</option>
      <option value="authorized_feed">Feed de produtos autorizado</option>
      <option value="authorized_webhook">Webhook de parceiro autorizado</option>
    </select>
  </label>
  <label>Nicho principal
    <select name="niche_id" defaultValue=""
      style={{padding:14,borderRadius:9,background:'#0e1729',color:'#fff',border:'1px solid #34415b'}}>
      <option value="">Todos os nichos</option>
      {niches.map(n=><option key={n.id} value={n.id}>{n.name}</option>)}
    </select>
  </label>
  <button type="submit" className="btn primary" disabled={pending}>
    {pending?'Salvando...':'Cadastrar origem'}
  </button>
  {state.error&&<div role="alert" className="notice">{state.error}</div>}
  {state.success&&<div role="status" className="feedback">{state.success}</div>}
 </form>;
}
