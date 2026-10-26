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
  {slug:'games',name:'Games',intervalMinutes:60,isActive:true},
  {slug:'casa',name:'Casa',intervalMinutes:60,isActive:true},
  {slug:'todas-ofertas',name:'Todas as Ofertas',intervalMinutes:5,isActive:true},
  {slug:'inativo',name:'Inativo',intervalMinutes:30,isActive:false},
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

console.log('✓ Motor OfertaFlow: categorização, deduplicação, segurança, score, cadência e ausência de envio.');
