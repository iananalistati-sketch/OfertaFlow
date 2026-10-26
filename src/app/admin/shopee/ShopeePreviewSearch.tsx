'use client';

import { useState, type FormEvent } from 'react';
import type { ShopeePreview } from '../../../lib/adapters/shopee';

type Result = {
  offers?: ShopeePreview[];
  checkedAt?: string;
  hasNextPage?: boolean;
  error?: string;
  code?: string;
  note?: string;
};
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function ShopeePreviewSearch({ enabled }: { enabled: boolean }) {
  const [keyword, setKeyword] = useState('fone bluetooth');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [requestError, setRequestError] = useState('');

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setRequestError('');
    try {
      const response = await fetch('/api/admin/shopee-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
        cache: 'no-store',
      });
      const json = await response.json() as Result;
      if (!response.ok) {
        setRequestError(json.error || 'Falha na consulta da API.');
      } else {
        setResult(json);
      }
    } catch {
      setRequestError('Falha de conexão. Confira se o servidor Next.js está ligado.');
    } finally {
      setLoading(false);
    }
  }
  return <section className="panel" style={{marginTop:25}}>
    <h2>Consultar ofertas reais (teste)</h2>
    <p className="subtext">A busca usa a Open API autorizada e retorna até oito produtos para revisão. Nenhum registro é salvo e nenhuma mensagem é enviada.</p>
    <form onSubmit={search} className="form" style={{marginTop:16}}>
      <label>O que deseja encontrar?
        <input value={keyword} onChange={e => setKeyword(e.target.value)}
          minLength={2} maxLength={60} required placeholder="Ex.: furadeira, teclado gamer, fone bluetooth" disabled={!enabled || loading}/>
      </label>
      <button className="btn primary" type="submit" disabled={!enabled || loading}>
        {loading ? 'Consultando Shopee...' : 'Buscar produtos via API'}
      </button>
    </form>
    {!enabled && <p className="footnote">Ative primeiro as credenciais oficiais no .env.local e reinicie o Next.js para habilitar esta busca.</p>}
    {requestError && <div className="notice" role="alert">{requestError}</div>}
    {result && <div style={{marginTop:18}}>
      <p className="subtext" role="status">{result.offers?.length || 0} oferta(s) retornada(s) com imagem, preço e link HTTPS. Consulta realizada em {result.checkedAt ? new Date(result.checkedAt).toLocaleString('pt-BR') : 'horário não disponível'}.</p>
      {!result.offers?.length && <p>Nenhum produto válido retornado. Experimente outra palavra-chave.</p>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:14}}>
        {result.offers?.map(offer=><article key={offer.externalId} style={{background:'#0d1425',border:'1px solid #34415b',borderRadius:12,padding:16}}>
          <img src={offer.imageUrl} alt={offer.title} style={{width:'100%',height:175,objectFit:'contain',background:'#fff',borderRadius:8}}/>
          <h3 style={{fontSize:15,lineHeight:1.5}}>{offer.title}</h3>
          <p><strong>{brl.format(offer.price)}</strong></p>
          {offer.commissionRate !== null && <p className="subtext">Taxa de comissão informada pela API: {offer.commissionRate <= 1 ? (offer.commissionRate*100).toFixed(2) : offer.commissionRate.toFixed(2)}% (estimativa, não garantia de recebimento)</p>}
          <a className="btn outline" href={offer.affiliateUrl} target="_blank" rel="noopener noreferrer">Abrir link retornado pela API ↗</a>
        </article>)}
      </div>
      {result.hasNextPage && <p className="footnote">Há outras páginas. A busca inicial exibe apenas oito ofertas para testar a integração.</p>}
      <p className="footnote">A Shopee ainda pode alterar preços, comissões e elegibilidade. Este diagnóstico não realiza publicação nem garante atribuição de comissão.</p>
    </div>}
  </section>;
}
