import test from 'node:test';import assert from 'node:assert/strict';import {M} from '../src/modules.js';import {insights,compareText} from '../src/insights.js';import {page} from '../src/engine.js';
for(const [id,m] of Object.entries(M)){
 const inp=Object.fromEntries(m.fields.map(f=>[f.k,f.d])),ks=Object.keys(m.algos),runs=ks.map(a=>m.run(inp,a));
 test(`${id}: insights and comparison text are generated for every algorithm`,()=>{
  for(const a of ks){const o=insights(id,a,runs[ks.indexOf(a)],runs,ks,M,inp);assert.ok(o.what.length>10&&o.learn.length>10);assert.ok(Object.values(o).every(v=>typeof v==='string'&&!/undefined|NaN/.test(v)))}
  assert.ok(compareText(m,runs,ks).every(t=>!/undefined|NaN/.test(t)))});
 test(`${id}: every comparison metric is computed, finite, and extra charts render`,()=>{
  for(const x of m.metrics)for(const r of runs)assert.ok(Number.isFinite(x.f(r)),x.l);
  if(m.extra)assert.match(m.extra(inp,ks[0]),/<svg/)});
}
test('Belady anomaly is detected from real FIFO runs, not hardcoded',()=>{
 const ref=[1,2,3,4,1,2,5,1,2,3,4,5],M2={page:M.page},inp={ref:ref.join(' '),nf:'3'};
 const ks=['FIFO','OPT','LRU'],runs=ks.map(a=>M.page.run(inp,a));
 assert.equal(page(ref,3,'FIFO').summary.faults,9);assert.equal(page(ref,4,'FIFO').summary.faults,10);
 assert.match(insights('page','FIFO',runs[0],runs,ks,M,inp).imply,/Belady/);
 assert.doesNotMatch(insights('page','LRU',runs[2],runs,ks,M,inp).imply,/Belady/)});
test('memory insight reports external fragmentation only when it explains a rejection',()=>{
 const inp={blocks:'100 500 200 300 600',procs:'212 417 112 426'},ks=['FF','BF','WF'],runs=ks.map(a=>M.mem.run(inp,a));
 assert.match(insights('mem','FF',runs[0],runs,ks,M,inp).imply,/external fragmentation/);
 assert.match(insights('mem','BF',runs[1],runs,ks,M,inp).imply,/Every process fit/)});
