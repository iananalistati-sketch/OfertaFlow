import {mockProducts} from '../config';
export type OfferCandidate={externalId:string;title:string;provider:'shopee'|'aliexpress';price:number;currency:'BRL';affiliateUrl:string|null;imageUrl:string|null;verified:boolean};
export type ClassifiedOffer=OfferCandidate & {niches:string[];copy:string;destinations:string[];status:'awaiting_credentials'|'ready_for_review'};
const rules:{slug:string;terms:string[]}[]=[
 {slug:'games',terms:['gamer','game','mouse','teclado','console','controle','headset']},
 {slug:'tecnologia',terms:['bluetooth','fone','mouse','teclado','monitor','smartphone','ssd','usb','computador']},
 {slug:'casa',terms:['luminária','luminaria','cozinha','mesa','decoração','decoracao','aspirador','panela']}
];
export function classify(title:string):string[]{
 const normalized=title.toLocaleLowerCase('pt-BR');
 return rules.filter(r=>r.terms.some(t=>normalized.includes(t))).map(r=>r.slug);
}
export function prepareOffer(offer:OfferCandidate):ClassifiedOffer{
 const niches=classify(offer.title);
 const safeNiches=niches.length?niches:[];
 const destinations=[...safeNiches,'todas-ofertas'];
 const price=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(offer.price);
 const copy=`🔥 Confira esta oferta!\n\n${offer.title}\n💰 ${price}\n\n${offer.affiliateUrl?'🛒 '+offer.affiliateUrl:'🔒 Link comissionado pendente de validação'}`;
 return {...offer,niches:safeNiches,copy,destinations,status:offer.verified&&!!offer.affiliateUrl?'ready_for_review':'awaiting_credentials'};
}
export function demoDiscovery():ClassifiedOffer[]{
 return mockProducts.map(p=>prepareOffer({externalId:p.id,title:p.title,provider:p.platform.startsWith('Shopee')?'shopee':'aliexpress',price:Number(p.price.replace(/[^0-9,]/g,'').replace(',','.')),currency:'BRL',affiliateUrl:null,imageUrl:null,verified:false}));
}
