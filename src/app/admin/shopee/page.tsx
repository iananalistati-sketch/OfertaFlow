import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '../../../components/Nav';
import { configured } from '../../../lib/config';
import { serverClient } from '../../../lib/supabase/server';
import { ShopeePreviewSearch } from './ShopeePreviewSearch';

export const dynamic = 'force-dynamic';

export default async function ShopeeSetup() {
  if (!configured) redirect('/admin/login');
  const db = await serverClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: admin } = await db.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!admin) return <><Nav/><main className="main"><h1>Acesso não autorizado</h1></main></>;

  const hasId = Boolean(process.env.SHOPEE_AFFILIATE_APP_ID?.trim());
  const hasSecret = Boolean(process.env.SHOPEE_AFFILIATE_SECRET?.trim());
  const ready = hasId && hasSecret;

  return <><Nav/><main className="main" style={{maxWidth:1100,margin:'auto'}}>
    <Link href="/admin" className="subtext">← Voltar ao painel</Link>
    <div className="eyebrow" style={{marginTop:20}}>INTEGRAÇÃO DE AFILIADOS · SHOPEE BRASIL</div>
    <h1>Conectar Shopee e descobrir produtos</h1>
    <p className="subtext">Primeira etapa real da automação: pesquisar ofertas elegíveis da sua própria conta usando credenciais da Open API, sem cadastrar itens manualmente.</p>
    <div className="notice">
      {ready
        ? 'App ID e Secret encontrados no servidor. O acesso da conta à API ainda precisa ser testado. Nenhum produto foi importado e o envio WhatsApp permanece desativado.'
        : 'A Open API ainda não foi configurada neste servidor. Solicite autorização da Shopee e informe as credenciais apenas no arquivo .env.local.'}
    </div>
    <div className="stats">
      <div className="stat"><span>App ID</span><strong>{hasId ? '✓' : '—'}</strong><small>{hasId ? 'Configurado no servidor' : 'Aguardando configuração'}</small></div>
      <div className="stat"><span>App Secret</span><strong>{hasSecret ? '✓' : '—'}</strong><small>{hasSecret ? 'Guardado no servidor' : 'Aguardando configuração'}</small></div>
      <div className="stat"><span>Consulta de ofertas</span><strong>—</strong><small>Teste manual disponível abaixo</small></div>
      <div className="stat"><span>Envios automáticos</span><strong>0</strong><small>Bloqueados</small></div>
    </div>
    <section className="panel" style={{marginTop:25}}>
      <h2>Como liberar a integração</h2>
      <ol style={{lineHeight:2}}>
        <li>Acesse o <a href="https://affiliate.shopee.com.br/open_api" target="_blank" rel="noopener noreferrer"><u>painel Open API da Shopee</u></a> com a sua conta de afiliado.</li>
        <li>Verifique se aparecem suas credenciais <strong>App ID</strong> e <strong>Secret da API</strong>. Se não aparecerem, solicite liberação à Shopee.</li>
        <li>No <strong>.env.local</strong> do OfertaFlow, adicione as duas variáveis abaixo, sem publicar valores no GitHub.</li>
        <li>Reinicie o Next.js e use a consulta de teste nesta mesma página.</li>
      </ol>
      <pre style={{whiteSpace:'pre-wrap',background:'#0d1425',padding:16,borderRadius:9,fontSize:13}}>
        {'SHOPEE_AFFILIATE_APP_ID=SEU_APP_ID\nSHOPEE_AFFILIATE_SECRET=SEU_SECRET_DA_API'}
      </pre>
      <p className="footnote">O Secret da API não é a senha usada para entrar na Shopee. Nunca cole essa chave no chat, no GitHub nem em imagens. O acesso à API depende da aprovação da Shopee.</p>
    </section>
    <ShopeePreviewSearch enabled={ready}/>
    <p className="footnote">Implementação de testes baseada no protocolo GraphQL/SHA256 documentado publicamente para a Affiliate Open API brasileira; o schema e a liberação devem ser confirmados na sua conta. Próxima entrega após consulta bem-sucedida: salvar ofertas válidas no Supabase com deduplicação, categorização e geração de campanhas.</p>
  </main></>;
}
