import test from 'node:test';import assert from 'node:assert/strict';import {M} from '../src/modules.js';
for(const [id,m] of Object.entries(M)){
 const inp=Object.fromEntries(m.fields.map(f=>[f.k,f.d]));
 for(const a of Object.keys(m.algos))test(`${id}/${a}: every playback state renders; final state matches result`,()=>{
  const r=m.run(inp,a);for(let c=-1;c<r.steps.length;c++){const h=m.view(r,c);assert.ok(h.length>20&&!/undefined|NaN/.test(h),`${id} ${a} step ${c}`)}
  const fin=m.view(r,r.steps.length-1);
  if(id==='page'){assert.match(fin,new RegExp(`<small>Faults</small><b>${r.summary.faults}</b>`));assert.match(fin,new RegExp(`<small>Hits</small><b>${r.summary.hits}</b>`))}
  if(id==='mem')assert.match(fin,new RegExp(`<small>Allocated</small><b>${r.summary.allocated}</b>`));
  if(id==='disk')assert.match(fin,new RegExp(`<small>Total movement</small><b>${r.summary.total}</b>`));
  if(id==='cpu'){assert.equal(r.steps.length,r.segs.length);assert.match(fin,/Avg waiting/)}
  if(id==='file')assert.match(fin,new RegExp(`<small>Free blocks</small><b>${r.summary.free}</b>`));
  if(id==='dl')assert.match(fin,r.summary.safe?/class="alert ok"/:/class="alert bad"/);
 });
 test(`${id}: invalid input throws a readable error`,()=>{const bad={...inp,[m.fields[0].k]:'x y ;;'};assert.throws(()=>m.run(bad,Object.keys(m.algos)[0]),/./)});
}
