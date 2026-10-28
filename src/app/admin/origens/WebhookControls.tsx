'use client';

import {useActionState,useState} from 'react';
import {
 activateWebhookSource,disableWebhookSource,
 type WebhookActionState
} from './actions';

const initial:WebhookActionState={error:null,success:null,token:null};

export function WebhookControls({sourceId,active}:{sourceId:string;active:boolean}){
  const [issued,activate,pendingActivate]=useActionState(activateWebhookSource,initial);
  const [disabled,deactivate,pendingDisable]=useActionState(disableWebhookSource,initial);
  const [testResult,setTestResult]=useState('');
  const [testing,setTesting]=useState(false);
  const token=disabled.success?null:issued.token;

  async function testIngestion(){
    if(!token)return;
    setTesting(true);setTestResult('');
    try{
      const response=await fetch('/api/ingest/offers',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
        body:JSON.stringify({
          event_id:'test-'+crypto.randomUUID(),
          message:[
            'Canhão de Espuma Snow Foam WAP 1L',
            'De: R$ 80 | Por: R$ 34 pix',
            'Cupom: EXEMPLO',
            'https://meli.la/EXEMPLO123'
          ].join('\n'),
          test:true
        }),
      });
      const result=await response.json() as {accepted?:boolean;error?:string;published?:boolean};
      setTestResult(result.accepted
        ? 'Evento de teste recebido pelo Supabase. A oferta permanece pendente, sem link convertido e sem publicação. Atualize a página para ver o histórico.'
        : 'Não foi possível receber o teste: '+(result.error||String(response.status)));
    }catch{
      setTestResult('Falha de conexão com a API local. Confira se o Next.js está ativo.');
    }finally{setTesting(false);}
  }

  return <div style={{display:'grid',gap:12,marginTop:16}}>
    <p className="subtext" style={{margin:0}}>
      {active?'Webhook configurado. Envie eventos com o token da origem.':'Webhook ainda desligado. Confirme autorização e gere a chave.'}
    </p>
    <form action={activate} style={{display:'grid',gap:10}}>
      <input type="hidden" name="source_id" value={sourceId}/>
      <label style={{display:'flex',alignItems:'flex-start',gap:9,fontSize:12,lineHeight:1.5}}>
        <input name="permission_confirmed" type="checkbox" required style={{marginTop:3}}/>
        Confirmo que controlo esta fonte ou tenho autorização expressa para receber e processar seus eventos. Entendo que isso não concede acesso a grupos do WhatsApp nem aprova divulgação nos marketplaces.
      </label>
      <button className="btn primary" type="submit" disabled={pendingActivate}>
        {pendingActivate?'Preparando...':active?'Gerar nova chave e revogar a anterior':'Ativar webhook e gerar chave'}
      </button>
    </form>
    {issued.error&&<div className="notice" role="alert">{issued.error}</div>}
    {issued.success&&<div className="feedback" role="status">{issued.success}</div>}
    {token&&<div style={{display:'grid',gap:9,background:'#0e1729',border:'1px solid #34415b',padding:12,borderRadius:10}}>
      <strong style={{fontSize:13}}>Chave da fonte — visível somente agora</strong>
      <input aria-label="Token de webhook gerado" type="text" value={token} readOnly
        style={{width:'100%',minWidth:0,background:'#0a1223',border:'1px solid #34415b',borderRadius:6,color:'#d9fff1',padding:9,fontSize:12}}/>
      <button className="btn outline" type="button" onClick={()=>navigator.clipboard.writeText(token)}>
        Copiar chave
      </button>
      <p style={{fontSize:12,margin:0,color:'var(--muted)'}}>Guarde em local seguro. Nunca compartilhe em mensagens ou inclua no frontend. Endpoint: <code>POST /api/ingest/offers</code>.</p>
      <button className="btn outline" type="button" onClick={testIngestion} disabled={testing}>
        {testing?'Enviando evento...':'Enviar evento demonstrativo à API'}
      </button>
      {testResult&&<div role="status" className="feedback">{testResult}</div>}
    </div>}
    <form action={deactivate}>
      <input type="hidden" name="source_id" value={sourceId}/>
      <button className="btn outline" type="submit" disabled={pendingDisable}>
        {pendingDisable?'Desativando...':'Desativar origem e revogar chave'}
      </button>
    </form>
    {disabled.error&&<div className="notice" role="alert">{disabled.error}</div>}
    {disabled.success&&<div className="feedback" role="status">{disabled.success}</div>}
  </div>;
}
