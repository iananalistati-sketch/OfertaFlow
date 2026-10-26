/**
 * Regras de conversão independentes do mecanismo de captação.
 * Nenhuma função deste arquivo acessa sessão de navegador, extrai cookies,
 * encurta URL ou envia mensagens. O conversor autorizado é um adaptador externo.
 */
export type Marketplace = 'mercadolivre'|'shopee'|'amazon'|'aliexpress'|'unknown';
export type CapturedOffer = {
  marketplace: Marketplace;
  title: string;
  originalUrl: string;
  ownerAffiliateUrl: string | null;
  imageUrl: string | null;
  price: number | null;
  productVerifiedAt: string | null;
  affiliateLinkVerifiedAt: string | null;
  affiliateAccountAuthorized: boolean;
  destinationAuthorized: boolean;
};
export type ConversionDecision = {
  allowed: boolean;
  status: 'converted'|'blocked';
  reasons: string[];
};

const hosts: {marketplace: Exclude<Marketplace,'unknown'>; names: string[]}[] = [
  { marketplace:'mercadolivre',names:['mercadolivre.com.br','mercadolibre.com','meli.la','mercado.li'] },
  { marketplace:'shopee',names:['shopee.com.br','s.shopee.com.br'] },
  { marketplace:'amazon',names:['amazon.com.br','amzn.to'] },
  { marketplace:'aliexpress',names:['aliexpress.com','pt.aliexpress.com'] },
];
export function identifyMarketplace(value: string): Marketplace {
  let hostname: string;
  try {
    const url = new URL(value);
    if(url.protocol!=='https:' || url.username || url.password) return 'unknown';
    hostname = url.hostname.toLowerCase().replace(/\.$/,'');
  } catch { return 'unknown'; }
  return hosts.find(group=>group.names.some(domain=>
    hostname===domain || hostname.endsWith('.'+domain)
  ))?.marketplace ?? 'unknown';
}
function safeHttps(url: string | null): boolean {
  if(!url) return false;
  try {
    const u=new URL(url);
    return u.protocol==='https:' && !!u.hostname && !u.username && !u.password;
  } catch { return false; }
}
const isFresh=(date:string|null,now:number)=> {
  const t=date?Date.parse(date):NaN;
  return Number.isFinite(t) && t<=now && now-t<24*60*60*1000;
};

/** A elegibilidade da divulgação depende dos termos atuais do programa e do canal.
 * Por padrão, nenhuma plataforma/canal é considerado autorizado.
 */
export function evaluateConversion(offer:CapturedOffer,now=Date.now()):ConversionDecision {
  const reasons:string[]=[];
  if(offer.marketplace==='unknown' || identifyMarketplace(offer.originalUrl)!==offer.marketplace)
    reasons.push('Marketplace de origem não identificado com segurança.');
  if(!offer.affiliateAccountAuthorized)
    reasons.push('Conta de afiliado sem conector autorizado.');
  if(!offer.destinationAuthorized)
    reasons.push('Canal de divulgação não autorizado para este programa.');
  if(!safeHttps(offer.ownerAffiliateUrl))
    reasons.push('Link comissionado da própria conta não confirmado por integração autorizada.');
  else if(identifyMarketplace(offer.ownerAffiliateUrl!)!==offer.marketplace)
    reasons.push('O link atribuído não corresponde ao marketplace de origem.');
  if(!isFresh(offer.affiliateLinkVerifiedAt,now))
    reasons.push('Atribuição do link não verificada nas últimas 24 horas.');
  if(!safeHttps(offer.imageUrl))
    reasons.push('Imagem autorizada do produto não disponível em HTTPS.');
  if(!offer.price || !Number.isFinite(offer.price) || offer.price<=0)
    reasons.push('Preço atual não verificado.');
  if(!isFresh(offer.productVerifiedAt,now))
    reasons.push('Oferta não validada nas últimas 24 horas.');
  return {allowed:reasons.length===0,status:reasons.length===0?'converted':'blocked',reasons};
}
