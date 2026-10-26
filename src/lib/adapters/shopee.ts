import { createHash } from 'node:crypto';
import type { AffiliateAdapter, AffiliateOffer } from './types';

const SHOPEE_ENDPOINT = 'https://open-api.affiliate.shopee.com.br/graphql';

type ApiProduct = {
  itemId?: string | number;
  shopId?: string | number;
  productName?: string;
  imageUrl?: string;
  offerLink?: string;
  priceMin?: string | number;
  commissionRate?: string | number;
};

type ApiResponse = {
  data?: { productOfferV2?: { nodes?: ApiProduct[]; pageInfo?: { hasNextPage?: boolean } } };
  errors?: Array<{ message?: string; extensions?: { code?: string | number } }>;
};

export type ShopeePreview = AffiliateOffer & { commissionRate: number | null };
export type ShopeeSearchResult = { offers: ShopeePreview[]; hasNextPage: boolean; checkedAt: string };

export class ShopeeApiError extends Error {
  constructor(public readonly code: string, public readonly status = 502) {
    const description: Record<string, string> = {
      '10020': 'Assinatura inválida. Confira App ID e Secret da Open API Shopee.',
      '10030': 'Limite de consultas da Shopee atingido. Tente novamente mais tarde.',
      '10035': 'Sua conta ainda não tem autorização para a Open API Shopee.',
      '10010': 'A Shopee recusou a sintaxe da consulta. Verifique a versão da API.',
      '11001': 'A Shopee recusou os parâmetros da consulta.',
      credentials_missing: 'Configure App ID e Secret autorizados no arquivo .env.local.',
      timeout: 'A Shopee demorou a responder. Tente novamente mais tarde.',
      network_error: 'Não foi possível conectar à Shopee.',
      invalid_response: 'A Shopee devolveu uma resposta inesperada. Confira a documentação de sua conta.',
      remote_error: 'A API da Shopee retornou um erro. Verifique credenciais e acesso.',
    };
    super(description[code] ?? description.remote_error);
    this.name = 'ShopeeApiError';
  }
}

function urlHttps(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try { return new URL(value).protocol === 'https:'; }
  catch { return false; }
}
function number(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export class ShopeeAdapter implements AffiliateAdapter {
  readonly provider = 'shopee' as const;
  get mode(): 'disabled' | 'live' {
    return process.env.SHOPEE_AFFILIATE_APP_ID && process.env.SHOPEE_AFFILIATE_SECRET
      ? 'live'
      : 'disabled';
  }

  /** Apenas consulta: não grava ofertas, não envia anúncios nem cria links artificiais. */
  async searchOffers(keyword: string, limit = 8): Promise<ShopeeSearchResult> {
    const appId = process.env.SHOPEE_AFFILIATE_APP_ID?.trim();
    const secret = process.env.SHOPEE_AFFILIATE_SECRET?.trim();
    if (!appId || !secret) throw new ShopeeApiError('credentials_missing', 503);
    if (!/^[0-9A-Za-z_-]{3,80}$/.test(appId)) throw new ShopeeApiError('credentials_missing', 400);

    const clean = keyword.trim().replace(/\s+/g, ' ');
    if (clean.length < 2 || clean.length > 60) throw new ShopeeApiError('11001', 400);
    const take = Math.max(1, Math.min(10, Math.floor(limit)));
    // JSON.stringify quotes the keyword safely for a GraphQL string literal.
    const query = `{ productOfferV2(keyword: ${JSON.stringify(clean)}, listType: 1, sortType: 5, page: 1, limit: ${take}) {
      nodes { itemId shopId productName imageUrl offerLink priceMin commissionRate }
      pageInfo { hasNextPage }
    } }`;
    const payload = JSON.stringify({ query });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHash('sha256')
      .update(appId + timestamp + payload + secret, 'utf8')
      .digest('hex');
    const authorization = `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`;

    let response: Response;
    try {
      response = await fetch(SHOPEE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authorization,
        },
        body: payload,
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      });
    } catch (error) {
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        throw new ShopeeApiError('timeout', 504);
      }
      throw new ShopeeApiError('network_error', 502);
    }
    // Read only small responses; never return credentials or raw Shopee messages.
    if (!response.ok) throw new ShopeeApiError('remote_error', response.status === 429 ? 429 : 502);
    let result: ApiResponse;
    try { result = await response.json() as ApiResponse; }
    catch { throw new ShopeeApiError('invalid_response'); }

    if (!result || typeof result !== 'object') throw new ShopeeApiError('invalid_response');
    if (result.errors?.length) {
      const errorCode = String(result.errors[0].extensions?.code ?? 'remote_error');
      throw new ShopeeApiError(errorCode, errorCode === '10030' ? 429 : 502);
    }
    const page = result.data?.productOfferV2;
    if (!page || !Array.isArray(page.nodes)) throw new ShopeeApiError('invalid_response');
    const checkedAt = new Date().toISOString();
    const offers: ShopeePreview[] = page.nodes.flatMap((node) => {
      const price = number(node.priceMin);
      const image = urlHttps(node.imageUrl) ? node.imageUrl : '';
      const link = urlHttps(node.offerLink) ? node.offerLink : '';
      const name = typeof node.productName === 'string' ? node.productName.trim() : '';
      if (!name || price === null || price <= 0 || !image || !link || node.itemId == null) return [];
      return [{
        externalId: [node.shopId ?? 'shop', node.itemId].join(':'),
        title: name,
        description: '',
        price,
        currency: 'BRL' as const,
        imageUrl: image,
        affiliateUrl: link,
        source: 'shopee' as const,
        lastCheckedAt: checkedAt,
        commissionRate: number(node.commissionRate),
      }];
    });
    return { offers, hasNextPage: !!page.pageInfo?.hasNextPage, checkedAt };
  }

  async listOffers(): Promise<AffiliateOffer[]> {
    const result = await this.searchOffers('fone bluetooth', 8);
    return result.offers;
  }
}
