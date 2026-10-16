export type AffiliateOffer={externalId:string;title:string;description?:string;price:number;currency:'BRL';imageUrl?:string;affiliateUrl:string;category?:string;source:'shopee'|'aliexpress';lastCheckedAt:string};
export interface AffiliateAdapter {
 readonly provider:'shopee'|'aliexpress';
 readonly mode:'disabled'|'sandbox'|'live';
 listOffers():Promise<AffiliateOffer[]>;
}
