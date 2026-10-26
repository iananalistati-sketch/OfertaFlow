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
console.log('✓ Motor e convites OfertaFlow: categorização, deduplicação, segurança, score, cadência e ausência de envio.');
