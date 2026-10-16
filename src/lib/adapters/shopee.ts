import type { AffiliateAdapter,AffiliateOffer } from './types';
/** Placeholder: NÃO faz scraping nem inventa autenticação da Affiliate API. */
export class ShopeeAdapter implements AffiliateAdapter{
 readonly provider='shopee';readonly mode='disabled';
 async listOffers():Promise<AffiliateOffer[]>{
  throw new Error('Shopee não configurada: liberar credenciais e confirmar contrato/endpoint da API de Afiliados BR.');
 }
}
