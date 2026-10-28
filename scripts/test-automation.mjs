import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/automation/opportunity-engine.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
const diagnostics = (compiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
assert.equal(diagnostics.length, 0, 'Erros sintáticos no motor.');
const engine = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(compiled.outputText));

const now = Date.parse('2026-10-26T15:00:00.000Z');
const fresh = new Date(now - 20_000).toISOString();
const validOffer = {
  provider:'shopee', externalId:'prod-1', title:'Mouse gamer Bluetooth', price:80,
  originalPrice:100, affiliateUrl:'https://example.com/affiliate/1',
  imageUrl:'https://example.com/item.jpg', verifiedAt:fresh, status:'ready',
  commissionRate:null, origin:'database',
};

assert.deepEqual(engine.classifyNiches('Mouse gamer Bluetooth'), ['tecnologia','games']);
assert.deepEqual(engine.classifyNiches('Furadeira e Parafusadeira'), ['casa']);
assert.deepEqual(engine.classifyNiches('Coleção de literatura', [{slug:'livros',name:'Livros',isActive:true,intervalMinutes:5,keywords:['literatura','leitura']}]),['livros']);
assert.deepEqual(engine.classifyNiches('Anel dourado decorativo'), [], 'Não fazer falso positivo de palavra parcial.');

const repeated = { ...validOffer, price:70, verifiedAt:null, status:'draft', imageUrl:null };
const result = engine.deduplicateOffers([repeated, validOffer], now);
assert.equal(result.removed, 1);
assert.equal(result.unique[0].price, 80, 'Duplicata pior nunca substitui oferta verificada.');

const evaluated = engine.evaluateOffer(validOffer, now);
assert.equal(evaluated.reviewable, true);
assert.deepEqual(evaluated.destinations, ['tecnologia','games','todas-ofertas']);
assert.equal(evaluated.breakdown.commission, 0, 'Não inventar comissão ausente.');
assert.ok(evaluated.score > 0 && evaluated.score <= 100);

for (const invalid of [
  { ...validOffer, origin:'sample' },
  { ...validOffer, status:'draft' },
  { ...validOffer, affiliateUrl:'http://example.com/unsafe' },
  { ...validOffer, imageUrl:null },
  { ...validOffer, verifiedAt:new Date(now - 26 * 3600000).toISOString() },
  { ...validOffer, expiresAt:new Date(now - 1000).toISOString() },
]) {
  assert.equal(engine.evaluateOffer(invalid, now).reviewable, false);
}

const niches = [
  {slug:'tecnologia',name:'Tecnologia',intervalMinutes:5,isActive:true},
  {slug:'games',name:'Games',intervalMinutes:5,isActive:true},
  {slug:'casa',name:'Casa',intervalMinutes:5,isActive:true},
  {slug:'todas-ofertas',name:'Todas as Ofertas',intervalMinutes:5,isActive:true},
  {slug:'inativo',name:'Inativo',intervalMinutes:5,isActive:false},
];
const plan = engine.makeOpportunityPlan([validOffer, repeated], niches, now);
assert.equal(plan.opportunities.length, 1);
assert.equal(plan.duplicateCount, 1);
assert.equal(plan.reviewableCount, 1);
assert.equal(plan.slots.length, 4);
assert.ok(plan.slots.every(slot=>slot.intervalMinutes===5));
assert.equal(plan.slots.find(slot=>slot.niche==='casa').selectedId, null);
assert.equal(plan.slots.find(slot=>slot.niche==='games').selectedId, 'shopee:prod-1');
assert.equal(plan.slots.find(slot=>slot.niche==='todas-ofertas').selectedId, 'shopee:prod-1');
assert.ok(plan.slots.every(slot=>Date.parse(slot.nextSlotAt)>now), 'A janela teórica deve ser futura.');
assert.ok(plan.slots.every(slot=>!Object.hasOwn(slot,'queueId')), 'Nunca criar fila ou simular envio efetuado.');


const groupSource=readFileSync(new URL('../src/lib/groups/availability.ts',import.meta.url),'utf8');
const groupCompiled=ts.transpileModule(groupSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const groupEngine=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(groupCompiled.outputText));
const one={id:'1',niche_id:'n',name:'Grupo 01',invite_url:'https://chat.whatsapp.com/abcdef',
 is_active:true,is_full:false,member_count:100,capacity_limit:100,created_at:'2026-01-01T00:00:00Z'};
const two={...one,id:'2',name:'Grupo 02',member_count:20,created_at:'2026-02-01T00:00:00Z'};
assert.equal(groupEngine.selectInviteGroup([one,two])?.id,'2','Grupo lotado não pode receber novo convite.');
assert.equal(groupEngine.selectInviteGroup([one]),null,'Não usar link de grupo lotado.');
assert.equal(groupEngine.selectInviteGroup([{...two,is_active:false}]),null,'Não distribuir grupos desativados.');
assert.equal(groupEngine.selectInviteGroup([{...two,member_count:null,capacity_limit:null}])?.capacityState,'unknown','Não inventar ocupação quando desconhecida.');

const strong={...validOffer,externalId:'vendas-altas',commissionRate:18,salesCount:120};
const weak={...validOffer,externalId:'vendas-baixas',commissionRate:2,salesCount:3};
const ranked=engine.makeOpportunityPlan([weak,strong],niches,now);
assert.equal(ranked.opportunities[0].externalId,'vendas-altas');
assert.ok(ranked.opportunities[0].breakdown.commission>ranked.opportunities[1].breakdown.commission);
assert.ok(ranked.opportunities[0].breakdown.sales>ranked.opportunities[1].breakdown.sales);

const inviteSource=readFileSync(new URL('../src/lib/groups/invite-validation.ts',import.meta.url),'utf8');
const inviteCompiled=ts.transpileModule(inviteSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const inviteModule=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(inviteCompiled.outputText));
assert.equal(inviteModule.normalizeGroupInviteLink('  https://chat.whatsapp.com/AaBbCc123?mode=ac_t '),
 'https://chat.whatsapp.com/AaBbCc123','Parâmetros de compartilhamento devem ser aceitos.');
assert.equal(inviteModule.normalizeGroupInviteLink('https://chat.whatsapp.com/AaBbCc123/'),
 'https://chat.whatsapp.com/AaBbCc123','Barra final deve ser aceita.');
assert.equal(inviteModule.normalizeGroupInviteLink(''),null,'Convites opcionais podem ficar vazios.');
assert.throws(()=>inviteModule.normalizeGroupInviteLink('https://exemplo.com/AaBbCc123'));
assert.throws(()=>inviteModule.normalizeGroupInviteLink('https://chat.whatsapp.com/'));
assert.throws(()=>inviteModule.normalizeGroupInviteLink('http://chat.whatsapp.com/AaBbCc123'));

const conversionSource=readFileSync(new URL('../src/lib/automation/link-conversion.ts',import.meta.url),'utf8');
const conversionCompiled=ts.transpileModule(conversionSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const converter=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(conversionCompiled.outputText));
assert.equal(converter.identifyMarketplace('https://meli.la/2Z3UTem'),'mercadolivre');
assert.equal(converter.identifyMarketplace('https://fake-meli.la.evil.example/123'),'unknown');
assert.equal(converter.identifyMarketplace('javascript:alert(1)'),'unknown');
assert.equal(converter.identifyMarketplace('https://s.shopee.com.br/abc'),'shopee');
const converted={
 marketplace:'mercadolivre',
 title:'Furadeira de teste',
 originalUrl:'https://meli.la/abc12',
 ownerAffiliateUrl:'https://meli.la/meulink',
 price:129.99,
 imageUrl:'https://static.example.com/product.jpg',
 productVerifiedAt:fresh,
 affiliateLinkVerifiedAt:fresh,
 affiliateAccountAuthorized:true,
 destinationAuthorized:true,
};
assert.equal(converter.evaluateConversion(converted,now).allowed,true);
assert.equal(converter.evaluateConversion({...converted,ownerAffiliateUrl:null},now).allowed,false);
assert.equal(converter.evaluateConversion({...converted,affiliateAccountAuthorized:false},now).allowed,false);
assert.equal(converter.evaluateConversion({...converted,destinationAuthorized:false},now).allowed,false);
assert.equal(converter.evaluateConversion({...converted,affiliateLinkVerifiedAt:null},now).allowed,false);
assert.equal(converter.evaluateConversion({...converted,originalUrl:'https://evil.example/123'},now).allowed,false);
assert.equal(converter.evaluateConversion({...converted,imageUrl:null},now).allowed,false);
assert.equal(converter.evaluateConversion({...converted,productVerifiedAt:null},now).allowed,false);
assert.equal(converter.evaluateConversion({...converted,ownerAffiliateUrl:'https://s.shopee.com.br/abc'},now).allowed,false);


const parserSource=readFileSync(new URL('../src/lib/automation/message-parser.ts',import.meta.url),'utf8');
const parserCompiled=ts.transpileModule(parserSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
assert.equal(parserCompiled.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
const parser=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(parserCompiled.outputText));

// Amostras anonimizadas, baseadas em formatos enviados para referência.
// São fixtures LOCAIS, sem contatos, nomes de grupos nem links de terceiros ativos.
const foam=parser.parseOfferMessage([
 'TRANSFORME A LAVAGEM EM UM BANHO DE ESPUMA',
 'Canhão de Espuma Snow Foam WAP 1L',
 'De: R$ 80 | Por: R$34 pix 🔥',
 'Utilize o Cupom: APROVEITAMELI',
 '🛒 Link do Produto',
 'https://meli.la/EXEMPLO01',
].join('\n'));
assert.equal(foam.title,'Canhão de Espuma Snow Foam WAP 1L');
assert.equal(foam.originalPrice,80);
assert.equal(foam.currentPrice,34);
assert.equal(foam.couponCode,'APROVEITAMELI');
assert.equal(foam.pixMentioned,true);
assert.equal(foam.marketplace,'mercadolivre');
assert.equal(foam.discountPercent,58);
assert.equal(foam.status,'unverified');

const toolsPromo=parser.parseOfferMessage([
 'SUA GARAGEM MERECE ESSE REFORÇO',
 'Kit 2 Cavaletes Mecânicos Automotivo Carro Até 2 Ton. Ewald',
 'De: R$ 105 | Por: R$68 pix',
 '⚠️ cupom: PROMOAGORA',
 'https://meli.la/EXEMPLO02'
].join('\n'));
assert.match(toolsPromo.title,/Cavaletes Mecânicos/);
assert.equal(toolsPromo.currentPrice,68);
assert.equal(toolsPromo.couponCode,'PROMOAGORA');

const shoes=parser.parseOfferMessage([
 'Tênis Adidas Response Runner 2',
 'Por R$246',
 'Cupom: BN20',
 'Achado na Netshoes',
 'https://achlinks.com.br/achados/EXEMPLO01'
].join('\n'));
assert.equal(shoes.title,'Tênis Adidas Response Runner 2');
assert.equal(shoes.currentPrice,246);
assert.equal(shoes.couponCode,'BN20');
assert.equal(shoes.marketplace,'unknown','Encurtador de terceiro não comprova marketplace.');
assert.equal(shoes.mentionedStore,'Netshoes');

const skincare=parser.parseOfferMessage([
 'Barrier Cream Dr.Althea 147',
 'Por R$113',
 'Achado na Amazon',
 'https://link.amazon/EXEMPLO'
].join('\n'));
assert.equal(skincare.currentPrice,113);
assert.equal(skincare.mentionedStore,'Amazon');
assert.equal(skincare.marketplace,'unknown');

const socks=parser.parseOfferMessage([
 'MEIA PRA DAR E VENDER',
 'Kit com 12 Pares Meia Soquete Cano Curto',
 'Por R$24',
 'https://meli.la/EXEMPLO03'
].join('\n'));
assert.equal(socks.currentPrice,24);
assert.equal(socks.title,'Kit com 12 Pares Meia Soquete Cano Curto');

const bottle=parser.parseOfferMessage([
 'ÁGUA GELADA SEMPRE',
 'Loja Oficial Gocase',
 'Garrafa Térmica Gocase 500ml',
 'De R$ 74 por R$ 67',
 'https://meli.la/EXEMPLO04'
].join('\n'));
assert.equal(bottle.title,'Garrafa Térmica Gocase 500ml');
assert.equal(bottle.originalPrice,74);
assert.equal(bottle.currentPrice,67);

const unsafe=parser.parseOfferMessage('Oferta de fone bluetooth\nPor R$100\nhttps://meli.la.evil.example/trojan');
assert.equal(unsafe.marketplace,'unknown','Não confiar em domínios parecidos com lojas.');
assert.equal(unsafe.status,'unverified');
assert.ok(unsafe.warnings.some(x=>x.includes('Domínio não homologado')));
const absent=parser.parseOfferMessage('Mensagem sem produto ou preço');
assert.equal(absent.currentPrice,null);
assert.equal(absent.productUrl,null);
assert.equal(absent.status,'unverified');
const multiple=parser.parseOfferMessage('Produto de teste 2 unidades\nPor R$ 129,90\nhttps://meli.la/A https://meli.la/B');
assert.equal(multiple.currentPrice,129.90);
assert.ok(multiple.warnings.some(x=>x.includes('vários links')));


const shopeeImportSource=readFileSync(new URL('../src/lib/automation/shopee-import.ts',import.meta.url),'utf8');
const shopeeImportCompiled=ts.transpileModule(shopeeImportSource,{
  compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022},
  reportDiagnostics:true,
});
assert.equal(shopeeImportCompiled.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
const engineModuleUrl='data:text/javascript;charset=utf-8,'+encodeURIComponent(compiled.outputText);
const shopeeTestModule=shopeeImportCompiled.outputText.replace(
  "from './opportunity-engine'",
  "from '"+engineModuleUrl+"'"
);
const importEngine=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(shopeeTestModule));
const item={
  externalId:'loja1:produto123',title:'Fone Bluetooth com cancelamento de ruído',
  description:'',price:149.90,currency:'BRL',imageUrl:'https://img.example.com/fone.jpg',
  affiliateUrl:'https://s.shopee.com.br/TESTE',source:'shopee',lastCheckedAt:fresh,commissionRate:0.12
};
const sampleImport=importEngine.prepareShopeeImport([item,item,{
  ...item,externalId:'loja2:produto789',title:'Garrafa Térmica 1L',commissionRate:null
},
  {...item,externalId:'sem-imagem',imageUrl:''}
], 'conta-exemplo', niches);
assert.equal(sampleImport.rows.length,2,'Produtos inválidos e duplicados não entram no catálogo.');
assert.equal(sampleImport.duplicates,1);
assert.equal(sampleImport.skipped,1);
assert.equal(sampleImport.rows[0].commission_rate,12,'Taxa fracionária da API é normalizada para percentual.');
assert.equal(sampleImport.rows[0].status,'draft','Importações ficam bloqueadas para publicação.');
assert.equal(sampleImport.rows[0].original_price,null,'Preço anterior não pode ser inventado.');
assert.equal(sampleImport.rows[0].coupon_code,null,'Cupom não pode ser inventado.');
assert.ok(sampleImport.categories.find(c=>c.externalId==='loja1:produto123').slugs.includes('tecnologia'));
assert.ok(sampleImport.categories.find(c=>c.externalId==='loja1:produto123').slugs.includes('todas-ofertas'));
assert.equal(importEngine.normalizeCommissionRate(0.08),8);
assert.equal(importEngine.normalizeCommissionRate(18),18);
assert.equal(importEngine.normalizeCommissionRate(null),null);
assert.equal(importEngine.normalizeCommissionRate(101),null);

console.log('✓ Motor, catálogo Shopee, captação e convites OfertaFlow: categorização, deduplicação, segurança, score, cadência e ausência de envio.');
