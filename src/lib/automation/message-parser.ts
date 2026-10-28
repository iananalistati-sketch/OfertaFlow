/**
 * Interpreta o TEXTO de uma oferta recebida de uma fonte permitida.
 * Nunca acessa mensagens do WhatsApp, imagens, URLs remotas ou cookies.
 * Os campos extraídos são declarados no anúncio, NÃO verificados na loja.
 */
export type DetectedMarketplace = 'mercadolivre' | 'shopee' | 'amazon' | 'aliexpress' | 'unknown';
export type ParsedOfferMessage = {
  title: string | null;
  currentPrice: number | null;
  originalPrice: number | null;
  pixMentioned: boolean;
  couponCode: string | null;
  productUrl: string | null;
  allUrls: string[];
  marketplace: DetectedMarketplace;
  mentionedStore: string | null;
  discountPercent: number | null;
  warnings: string[];
  status: 'unverified';
};

const domains: {marketplace:Exclude<DetectedMarketplace,'unknown'>;hosts:string[]}[] = [
  {marketplace:'mercadolivre',hosts:['meli.la','mercado.li','mercadolivre.com.br','mercadolibre.com']},
  {marketplace:'shopee',hosts:['shopee.com.br','s.shopee.com.br']},
  {marketplace:'amazon',hosts:['amazon.com.br','amzn.to']},
  {marketplace:'aliexpress',hosts:['aliexpress.com']},
];

function findMarketplace(value:string):DetectedMarketplace {
  try {
    const u = new URL(value);
    if(u.protocol!=='https:' || u.username || u.password) return 'unknown';
    const host=u.hostname.toLowerCase().replace(/\.$/,'');
    return domains.find(d=>d.hosts.some(h=>host===h || host.endsWith('.'+h)))?.marketplace ?? 'unknown';
  } catch {return 'unknown';}
}
function cleanUrl(value:string):string {
  return value.replace(/[.,;!?)\]}>]+$/g,'');
}
function urlsFromText(text:string):string[] {
  const candidates = text.match(/https?:\/\/[^\s<>"'“”‘’]+/giu) || [];
  const urls:string[]=[];
  for (const raw of candidates) {
    const value=cleanUrl(raw);
    try {
      const u=new URL(value);
      if(u.protocol!=='https:' || u.username || u.password || !u.hostname)continue;
      if(!urls.includes(value)) urls.push(value);
    } catch { /* Ignora URL inválida. */ }
  }
  return urls;
}
function readMoney(value:string|undefined):number|null {
  if(!value) return null;
  const numeric=value.replace(/\./g,'').replace(',','.');
  const n=Number(numeric);
  return Number.isFinite(n) && n>0 && n<10000000 ? Math.round(n*100)/100 : null;
}

function selectTitle(text:string):string|null {
  const candidates=text.split(/\r?\n/)
    .map(line=>line.replace(/[*_~]/g,'').replace(/^[\s🎁🔥⚡🛒🏷️👉🛍️💰⚠️➡️]+/gu,'').trim())
    .filter(line=>line.length>=8 && line.length<=200)
    .filter(line=>!/https?:\/\/|www\./i.test(line))
    .filter(line=>!/\b(?:r\$|cupom|desconto|link do produto|achado na|achado no|acesse|frete grátis)\b/i.test(line))
    .filter(line=>!/^(?:de|por|agora|loja|encaminhada|~|hoje|adm)\b/i.test(line))
    .filter(line=>!/\+?\d{2}\s?\d{2}\s?\d{4,5}[- ]?\d{4}/.test(line));
  if(!candidates.length)return null;
  // Textos mistos como "Garrafa Térmica Gocase 500ml" têm precedência
  // sobre slogans totalmente em caixa alta.
  const descriptive=candidates.find(line=>/[a-záàâãéêíóôõúç]/u.test(line));
  return (descriptive || candidates[0]).trim();
}

export function parseOfferMessage(raw:string):ParsedOfferMessage {
  const text=raw.slice(0,12000).replace(/\r\n/g,'\n');
  const allUrls=urlsFromText(text);
  const recognized=allUrls.filter(url=>findMarketplace(url)!=='unknown');
  const productUrl=recognized[0] || allUrls[0] || null;
  const marketplace=productUrl ? findMarketplace(productUrl) : 'unknown';
  const originalPrice=readMoney(text.match(/\bde\s*:?\s*R\$\s*(\d[\d.,]*)/i)?.[1]);
  const currentPrice=readMoney(text.match(/\bpor\s*:?\s*R\$\s*(\d[\d.,]*)/i)?.[1]);
  const pixMentioned=/\bpix\b/i.test(text);
  const coupon=(text.match(/\bcupom\s*[:：\-]\s*([A-Z0-9][A-Z0-9_-]{2,29})\b/i)?.[1] || null)?.toUpperCase() || null;
  const title=selectTitle(text);
  const mentionedStore=/\bnetshoes\b/i.test(text)?'Netshoes':
    /\bamazon\b/i.test(text)?'Amazon':
    /\bmercado\s*livre\b/i.test(text)?'Mercado Livre':
    /\bshopee\b/i.test(text)?'Shopee':
    /\baliexpress\b/i.test(text)?'AliExpress':null;
  const discountPercent=originalPrice && currentPrice && originalPrice>currentPrice
    ? Math.round((1-currentPrice/originalPrice)*100):null;

  const warnings:string[]=[];
  if(!title)warnings.push('Descrição do produto não identificada.');
  if(currentPrice===null)warnings.push('Preço atual não identificado.');
  if(!productUrl)warnings.push('Link do produto não encontrado.');
  if(productUrl && marketplace==='unknown')
    warnings.push('Domínio não homologado: a loja citada no texto não comprova o destino do link.');
  if(allUrls.length>1)warnings.push('Há vários links: confirmar manualmente o link correto antes de converter.');
  if(originalPrice!==null && currentPrice!==null && originalPrice<=currentPrice)
    warnings.push('Preço anterior não é superior ao preço atual.');
  warnings.push('Preço, cupom, imagem e atribuição do link ainda não foram verificados pela loja.');
  return {
    title,currentPrice,originalPrice,pixMentioned,couponCode:coupon,
    productUrl,allUrls,marketplace,mentionedStore,discountPercent,
    warnings,status:'unverified',
  };
}
