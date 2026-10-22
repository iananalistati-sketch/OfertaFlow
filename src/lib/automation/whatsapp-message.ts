// Modelo de anúncio inspirado no formato recebido, sem fabricar preços ou comissões.
// NÃO publica automaticamente: exige oferta e link verificados antes de liberar o compartilhamento.
export type PromoOffer = {
  id: string;
  title: string;
  source: string;
  price: number | null;
  original_price: number | null;
  pix_price: number | null;
  installment_total: number | null;
  installment_count: number | null;
  coupon_code: string | null;
  coupon_verified_at: string | null;
  offer_verified_at: string | null;
  offer_expires_at: string | null;
  affiliate_url: string | null;
  image_url: string | null;
  status: string;
};

const money = (value: number) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL',
}).format(value);
const recent = (value: string | null, at: number) => {
  if (!value) return false;
  const date = Date.parse(value);
  return Number.isFinite(date) && date <= at && at - date < 24 * 60 * 60 * 1000;
};
const https = (value: string | null) => {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && !!parsed.hostname;
  } catch {
    return false;
  }
};

export function promoSafety(offer: PromoOffer, at = Date.now()) {
  if (offer.status !== 'ready') return { ready: false, reason: 'Oferta ainda não aprovada.' };
  if (!offer.price || offer.price <= 0) return { ready: false, reason: 'Preço atual indisponível.' };
  if (!https(offer.affiliate_url)) return { ready: false, reason: 'Link de afiliado HTTPS não verificado.' };
  if (!https(offer.image_url)) return { ready: false, reason: 'Imagem do produto ausente ou inválida.' };
  if (!recent(offer.offer_verified_at, at)) return { ready: false, reason: 'Preço, produto e link precisam de validação atualizada (24h).' };
  if (offer.offer_expires_at && (Number.isNaN(Date.parse(offer.offer_expires_at)) || Date.parse(offer.offer_expires_at) <= at)) {
    return { ready: false, reason: 'Oferta expirada.' };
  }
  return { ready: true, reason: 'Oferta apta para revisão e compartilhamento manual.' };
}

function headline(offer: PromoOffer) {
  const title = offer.title.toLocaleLowerCase('pt-BR');
  if (/furadeira|parafusadeira|ferramenta|cozinha|panela|casa|aspirador|luminária/.test(title)) {
    return '🛠️ *PROJETINHO EM CASA? AGORA VAI!* 🔥';
  }
  if (/gamer|headset|console|videogame|controle|jogo/.test(title)) {
    return '🎮 *ACHADINHO GAMER!* 🔥';
  }
  if (/smartphone|fone|notebook|mouse|teclado|ssd|monitor/.test(title)) {
    return '⚡ *TECNOLOGIA EM OFERTA!* 🔥';
  }
  return '🔥 *ACHADINHO DO DIA!*';
}

export function buildWhatsappCaption(offer: PromoOffer, now = Date.now(), demo = false) {
  const safeTitle = offer.title.replace(/[\r\n]+/g, ' ').trim();
  const lines = [headline(offer), '', `*${safeTitle}*`, ''];
  const current = offer.pix_price && offer.pix_price > 0 ? offer.pix_price : offer.price;
  if (current !== null && current > 0) {
    if (offer.original_price && offer.original_price > current) {
      lines.push(`De ~${money(offer.original_price)}~`);
    }
    lines.push(`*Por ${money(current)}${offer.pix_price ? ' no Pix' : ''}*`);
  }
  if (offer.installment_count && offer.installment_total && offer.installment_total > 0) {
    lines.push(`Ou ${money(offer.installment_total)} em até ${offer.installment_count}x (consulte condições)`);
  }
  if (offer.coupon_code && recent(offer.coupon_verified_at, now)) {
    lines.push('', `🏷️ *Cupom: ${offer.coupon_code.trim()}*`);
  }
  lines.push('', '🛒 *Link do produto* 👇');
  if (offer.affiliate_url && https(offer.affiliate_url)) {
    lines.push(offer.affiliate_url);
  } else {
    lines.push('🔒 Aguardando link comissionado validado');
  }
  const provider = offer.source.toLowerCase();
  if (provider === 'shopee') lines.push('', '🧡 Confira na Shopee!');
  else if (provider === 'aliexpress') lines.push('', '📦 Confira no AliExpress!');
  else if (provider === 'mercadolivre') lines.push('', '💛 Confira no Mercado Livre!');
  lines.push('', 'ℹ️ Oferta sujeita a alteração. Link de afiliado: podemos receber comissão.');
  if (demo) lines.unshift('⚠️ *EXEMPLO ILUSTRATIVO — NÃO PUBLICAR*', '');
  return lines.join('\n');
}
