import type { AffiliateAdapter,AffiliateOffer } from './types';
/** Placeholder: integração somente após aprovação formal da API afiliados. */
export class AliExpressAdapter implements AffiliateAdapter{
 readonly provider='aliexpress';readonly mode='disabled';
 async listOffers():Promise<AffiliateOffer[]>{
  throw new Error('AliExpress não configurada: obter credenciais e permissão da API de Afiliados.');
 }
}
