/**
 * Motor determinístico de preparação de ofertas, independente do provedor.
 * Este módulo NUNCA grava filas, não dispara WhatsApp e não pressupõe comissão.
 */
export type NicheConfig = { slug: string; name: string; intervalMinutes: number; isActive: boolean };
export type OpportunityCandidate = {
  provider: 'shopee' | 'aliexpress' | 'manual';
  externalId: string;
  title: string;
  price: number | null;
  originalPrice?: number | null;
  affiliateUrl: string | null;
  imageUrl: string | null;
  verifiedAt: string | null;
  expiresAt?: string | null;
  status: 'draft' | 'ready' | 'expired';
  commissionRate?: number | null;
  salesCount?: number | null;
  origin: 'sample' | 'database';
};
export type Opportunity = OpportunityCandidate & {
  id: string;
  niches: string[];
  destinations: string[];
  score: number;
  breakdown: { relevance: number; quality: number; freshness: number; savings: number; commission: number; sales: number };
  reasons: string[];
  reviewable: boolean;
};
export type PlannedSlot = {
  niche: string;
  nicheName: string;
  intervalMinutes: number;
  nextSlotAt: string;
  selectedId: string | null;
  selectedTitle: string | null;
  reviewable: boolean;
  label: string;
};
export type OpportunityPlan = {
  opportunities: Opportunity[];
  slots: PlannedSlot[];
  duplicateCount: number;
  reviewableCount: number;
};

const nicheTerms: Record<string, string[]> = {
  tecnologia: ['fone', 'bluetooth', 'headphone', 'headset', 'mouse', 'teclado', 'monitor', 'notebook', 'smartphone', 'ssd', 'usb', 'carregador', 'computador', 'tablet', 'roteador'],
  games: ['gamer', 'gaming', 'console', 'videogame', 'video game', 'joystick', 'controle', 'playstation', 'xbox', 'nintendo', 'headset gamer', 'mouse gamer', 'teclado gamer'],
  casa: ['parafusadeira', 'furadeira', 'ferramenta', 'aspirador', 'air fryer', 'panela', 'cozinha', 'decoracao', 'luminaria', 'mesa', 'limpeza', 'lampada', 'organizador'],
};
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const hasTerm = (title: string, term: string) => (' ' + title + ' ').includes(' ' + normalize(term) + ' ');
const positive = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;
const validHttps = (value: string | null): boolean => {
  if (!value) return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !!url.hostname; }
  catch { return false; }
};
const fresh = (date: string | null, now: number): boolean => {
  if (!date) return false;
  const timestamp = Date.parse(date);
  return Number.isFinite(timestamp) && timestamp <= now && now - timestamp < 24 * 60 * 60 * 1000;
};

export function classifyNiches(title: string): string[] {
  const normalized = normalize(title);
  if (!normalized) return [];
  return Object.entries(nicheTerms)
    .filter(([, terms]) => terms.some(term => hasTerm(normalized, term)))
    .map(([slug]) => slug);
}

/** A chave só deduplica ofertas com MESMO ID externo e provedor, nunca itens semelhantes de lojas diferentes. */
export function opportunityKey(candidate: OpportunityCandidate): string {
  return candidate.provider + ':' + candidate.externalId.trim();
}
function rankSource(a: OpportunityCandidate, now: number): number {
  return (a.status === 'ready' ? 4 : 0) +
    (fresh(a.verifiedAt, now) ? 3 : 0) +
    (validHttps(a.affiliateUrl) ? 2 : 0) +
    (validHttps(a.imageUrl) ? 1 : 0);
}
export function deduplicateOffers(candidates: OpportunityCandidate[], now = Date.now()) {
  const unique = new Map<string, OpportunityCandidate>();
  let removed = 0;
  for (const c of candidates) {
    if (!c.externalId.trim()) { removed++; continue; }
    const key = opportunityKey(c);
    const previous = unique.get(key);
    if (!previous) { unique.set(key, c); continue; }
    removed++;
    const previousRank = rankSource(previous, now);
    const nextRank = rankSource(c, now);
    const previousTime = Date.parse(previous.verifiedAt || '') || 0;
    const nextTime = Date.parse(c.verifiedAt || '') || 0;
    if (nextRank > previousRank || (nextRank === previousRank && nextTime > previousTime)) unique.set(key, c);
  }
  return { unique: [...unique.values()], removed };
}

export function evaluateOffer(candidate: OpportunityCandidate, now = Date.now()): Opportunity {
  const niches = classifyNiches(candidate.title);
  const reasons: string[] = [];
  const image = validHttps(candidate.imageUrl);
  const link = validHttps(candidate.affiliateUrl);
  const current = positive(candidate.price);
  const isFresh = fresh(candidate.verifiedAt, now);
  const expiration = candidate.expiresAt ? Date.parse(candidate.expiresAt) : null;
  const expired = candidate.status === 'expired' || (candidate.expiresAt !== null && candidate.expiresAt !== undefined && (!Number.isFinite(expiration) || (expiration as number) <= now));

  if (candidate.origin === 'sample') reasons.push('Produto fictício: apenas simulação.');
  if (candidate.provider === 'manual') reasons.push('Origem manual: sem validação de afiliado por API.');
  if (candidate.status !== 'ready') reasons.push('Oferta ainda não aprovada.');
  if (!current) reasons.push('Preço atual não validado.');
  if (!image) reasons.push('Imagem HTTPS pendente.');
  if (!link) reasons.push('Link comissionado HTTPS pendente.');
  if (!isFresh) reasons.push('Oferta não verificada nas últimas 24 horas.');
  if (expired) reasons.push('Oferta expirada.');

  // Score de oportunidade baseado APENAS em sinais verificáveis; não é previsão de vendas.
  const relevance = niches.length ? Math.min(20, 15 + (niches.length-1)*5) : 0;
  const quality = (current?5:0)+(image?10:0)+(link?5:0);
  const freshness = isFresh?15:0;
  const savings = isFresh && current && positive(candidate.originalPrice) &&
    candidate.originalPrice>candidate.price!
      ? Math.min(10, Math.round((1-candidate.price!/candidate.originalPrice)*20)) : 0;
  // Taxa percentual: conectores devem normalizar para pontos percentuais (ex. 12.5 = 12,5%).
  const rate = candidate.origin==='database' && isFresh && positive(candidate.commissionRate)
    ? Math.min(100,candidate.commissionRate) : null;
  const commissionValue = rate!==null && current ? candidate.price!*rate/100 : 0;
  const commission = rate===null ? 0 : Math.min(20,Math.round(
    10*Math.min(rate/20,1) + 10*Math.min(commissionValue/50,1)
  ));
  // Vendas efetivamente relatadas pelo provedor. Ausência de dado = desconhecido.
  const sales = candidate.origin==='database' && isFresh &&
    Number.isInteger(candidate.salesCount) && (candidate.salesCount??-1)>=0
      ? Math.min(15,Math.round(15*Math.log1p(candidate.salesCount!)/Math.log1p(1000))) : 0;
  const breakdown = { relevance, quality, freshness, savings, commission, sales };
  const score = Object.values(breakdown).reduce((sum,value)=>sum+value,0);
  const reviewable = reasons.length === 0;
  return {
    ...candidate,
    id: opportunityKey(candidate),
    niches,
    destinations: [...niches, 'todas-ofertas'],
    score,
    breakdown,
    reasons,
    reviewable,
  };
}

export function makeOpportunityPlan(candidates: OpportunityCandidate[], niches: NicheConfig[], now = Date.now()): OpportunityPlan {
  const { unique, removed } = deduplicateOffers(candidates, now);
  const opportunities = unique.map(offer => evaluateOffer(offer, now))
    .sort((a, b) => Number(b.reviewable)-Number(a.reviewable) || b.score-a.score || a.id.localeCompare(b.id));
  const active = niches.filter(n => n.isActive && Number.isInteger(n.intervalMinutes) &&
    n.intervalMinutes >= 5 && n.intervalMinutes <= 1440);
  const slots: PlannedSlot[] = active.map(niche => {
    const timeStep = niche.intervalMinutes * 60_000;
    const nextSlotAt = new Date((Math.floor(now / timeStep) + 1) * timeStep).toISOString();
    const next = opportunities.find(o => o.destinations.includes(niche.slug)) || null;
    return {
      niche: niche.slug,
      nicheName: niche.name,
      intervalMinutes: niche.intervalMinutes,
      nextSlotAt,
      selectedId: next?.id || null,
      selectedTitle: next?.title || null,
      reviewable: !!next?.reviewable,
      label: !next ? 'Sem ofertas classificadas' : next.reviewable
        ? 'Candidato apto à revisão; envio desativado' : 'Simulação bloqueada: produto não verificado',
    };
  });
  return { opportunities, slots, duplicateCount: removed,
    reviewableCount: opportunities.filter(item => item.reviewable).length };
}
