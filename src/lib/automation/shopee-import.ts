/**
 * Normaliza ofertas retornadas pela Affiliate Open API Shopee para o banco.
 * Não usa dados simulados, não inventa preço anterior/cupom e NÃO publica mensagens.
 * O link affiliateUrl só pode vir do adaptador autenticado no servidor.
 */
import type {ShopeePreview} from '../adapters/shopee';
import {classifyNiches,type NicheConfig} from './opportunity-engine';

export type ShopeeProductInsert = {
  account_id:string;
  external_id:string;
  title:string;
  description:string;
  image_url:string;
  price:number;
  currency:'BRL';
  affiliate_url:string;
  source:'shopee';
  offer_verified_at:string;
  commission_rate:number|null;
  commission_verified_at:string|null;
  status:'draft';
  original_price:null;
  coupon_code:null;
};
export type ShopeeProductCategories = {
  externalId:string;
  slugs:string[];
};
export type PreparedShopeeImport = {
  rows:ShopeeProductInsert[];
  categories:ShopeeProductCategories[];
  skipped:number;
  duplicates:number;
};
const https=(value:string)=>{
  try {
    const parsed=new URL(value);
    return parsed.protocol==='https:' && !!parsed.hostname &&
      !parsed.username && !parsed.password;
  }catch{return false;}
};
export function normalizeCommissionRate(raw:number|null):number|null {
  if(raw===null || !Number.isFinite(raw) || raw<=0 || raw>100)return null;
  const percentage=raw<=1 ? raw*100 : raw;
  return Math.round(percentage*100000)/100000;
}

export function prepareShopeeImport(
  offers:ShopeePreview[],accountId:string,niches:NicheConfig[]
):PreparedShopeeImport {
  const rows=new Map<string,ShopeeProductInsert>();
  const categories=new Map<string,ShopeeProductCategories>();
  let skipped=0,duplicates=0;
  const all=niches.some(n=>n.slug==='todas-ofertas'&&n.isActive);
  for(const offer of offers){
    if(!offer.externalId || offer.externalId.length>160 ||
      offer.title.trim().length<2 || offer.title.length>300 ||
      !Number.isFinite(offer.price) || offer.price<=0 || offer.price>=10000000 ||
      !https(offer.affiliateUrl) || !https(offer.imageUrl) ||
      !Number.isFinite(Date.parse(offer.lastCheckedAt))){
      skipped++;continue;
    }
    if(rows.has(offer.externalId)){duplicates++;continue;}
    const rate=normalizeCommissionRate(offer.commissionRate);
    const assigned=classifyNiches(offer.title,niches);
    const slugs=[...new Set([...assigned,...(all?['todas-ofertas']:[])])];
    rows.set(offer.externalId,{
      account_id:accountId,
      external_id:offer.externalId,
      title:offer.title.trim(),
      description:'',
      image_url:offer.imageUrl,
      price:Math.round(offer.price*100)/100,
      currency:'BRL',
      affiliate_url:offer.affiliateUrl,
      source:'shopee',
      offer_verified_at:offer.lastCheckedAt,
      commission_rate:rate,
      commission_verified_at:rate!==null?offer.lastCheckedAt:null,
      status:'draft',
      original_price:null,
      coupon_code:null,
    });
    categories.set(offer.externalId,{externalId:offer.externalId,slugs});
  }
  return {rows:[...rows.values()],categories:[...categories.values()],skipped,duplicates};
}
