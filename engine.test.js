import test from 'node:test';import assert from 'node:assert/strict';
import {cpu,mem,file,deadlock,page,disk,ints,mat} from '../src/engine.js';
const P=(id,arrival,burst,priority=0)=>({id,arrival,burst,priority});
test('FCFS shows idle gap',()=>{const r=cpu([P('A',0,3),P('B',10,2)],'FCFS');
 assert.deepEqual(r.segs.map(s=>[s.pid,s.start,s.end]),[['A',0,3],[null,3,10],['B',10,12]]);assert.equal(r.summary.avgWT,0)});
test('SJF and Priority selection',()=>{const w=[P('A',0,8,3),P('B',1,4,2),P('C',2,2,1)];
 assert.deepEqual(cpu(w,'SJF').segs.map(s=>s.pid),['A','C','B']);assert.deepEqual(cpu(w,'PRIORITY').segs.map(s=>s.pid),['A','C','B'])});
test('Round Robin preemption & metrics',()=>{const r=cpu([P('P1',0,5),P('P2',1,3)],'RR',2);
 assert.deepEqual(r.segs.map(s=>[s.pid,s.start,s.end]),[['P1',0,2],['P2',2,4],['P1',4,6],['P2',6,7],['P1',7,8]]);
 assert.equal(r.rows[0].ct,8);assert.equal(r.rows[1].ct,7);assert.equal(r.rows[1].rt,1)});
test('CPU invalid input',()=>{assert.throws(()=>cpu([],'FCFS'));assert.throws(()=>cpu([P('A',0,0)],'FCFS'));assert.throws(()=>cpu([P('A',0,2)],'RR',0))});
test('memory FF/BF/WF choose different blocks',()=>{const B=[100,500,200,300,600],Q=[212,417,112,426];
 const pick=a=>mem(B,Q,a).steps.map(s=>s.b);
 assert.deepEqual(pick('FF'),[1,4,1,-1]);assert.deepEqual(pick('BF'),[3,1,2,4]);assert.deepEqual(pick('WF'),[4,1,4,-1]);
 assert.equal(mem(B,Q,'FF').summary.failed,1);assert.equal(mem(B,Q,'BF').summary.unused,B.reduce((a,b)=>a+b)-Q.reduce((a,b)=>a+b));
 assert.throws(()=>mem([],Q,'FF'));assert.throws(()=>mem([0],Q,'FF'))});
test('sequential file: contiguous start, insufficient space',()=>{
 const r=file(10,[2,3],[{name:'A',size:3},{name:'B',size:6}],'SEQ');
 assert.deepEqual(r.steps[0].blocks,[4,5,6]);assert.equal(r.steps[1].ok,false)});
test('fragmentation: sequential fails, linked succeeds',()=>{
 const f=[{name:'A',size:3}],u=[1,3,5,7,9];
 assert.equal(file(10,u,f,'SEQ').steps[0].ok,false);assert.match(file(10,u,f,'SEQ').steps[0].why,/fragmentation/);
 assert.deepEqual(file(10,u,f,'LINK').steps[0].blocks,[0,2,4])});
test('indexed: index block, no overlap, capacity respected',()=>{
 const r=file(6,[],[{name:'A',size:3},{name:'B',size:3}],'IDX');
 assert.equal(r.steps[0].index,0);assert.deepEqual(r.steps[0].blocks,[1,2,3]);assert.equal(r.steps[1].ok,false);
 assert.equal(r.summary.free,2);assert.equal(r.steps.at(-1).disk.filter(Boolean).length,4)});
const A=[[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]],MX=[[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]];
test('Banker safe sequence',()=>{const r=deadlock('BANKER',[3,3,2],A,MX);assert.ok(r.summary.safe);assert.deepEqual(r.summary.seq,[1,3,4,0,2])});
test('Banker unsafe',()=>{const r=deadlock('BANKER',[0],[[1],[1]],[[2],[2]]);assert.equal(r.summary.safe,false);assert.deepEqual(r.summary.stuck,[0,1])});
test('Detection: deadlock vs none',()=>{const al=[[0,1],[1,0]],rq=[[1,0],[0,1]];
 const d=deadlock('DETECT',[0,0],al,rq);assert.equal(d.summary.safe,false);assert.deepEqual(d.summary.stuck,[0,1]);
 assert.ok(deadlock('DETECT',[1,1],al,rq).summary.safe)});
test('Detection: zero-allocation process starts finished',()=>{assert.ok(deadlock('DETECT',[0],[[0],[1]],[[5],[0]]).summary.safe)});
test('deadlock invalid dims',()=>{assert.throws(()=>deadlock('BANKER',[1,1],[[1]],[[1,1]]));assert.throws(()=>deadlock('BANKER',[1],[[2]],[[1]]))});
const REF=[1,2,3,1,4,5,2];
test('page replacement computed from algorithms',()=>{
 const f=a=>page(REF,3,a).summary.faults;
 assert.equal(f('FIFO'),6);assert.equal(f('LRU'),6);
 assert.equal(f('OPT'),5); // spec said 6; hand trace: Optimal keeps page 2, so request 7 is a HIT
 assert.match(page(REF,3,'OPT').steps[4].text,/never used again/);
 assert.equal(page(REF,3,'LRU').steps[4].out,2);assert.equal(page(REF,3,'FIFO').steps[4].out,1)});
test('page edge cases',()=>{assert.equal(page([1,1,1],1,'FIFO').summary.faults,1);assert.equal(page([1,2,3],1,'LRU').summary.faults,3);
 assert.throws(()=>page([],3,'FIFO'));assert.throws(()=>page([1],0,'FIFO'));
 const r=page(REF,3,'LRU');assert.equal(r.summary.hits+r.summary.faults,REF.length)});
const R=[98,183,37,122,14,124,65,67];
test('disk textbook totals (up)',()=>{
 assert.equal(disk(R,53,'up',199,'SCAN').summary.total,331);assert.equal(disk(R,53,'up',199,'LOOK').summary.total,299);assert.equal(disk(R,53,'up',199,'CSCAN').summary.total,382)});
test('disk down direction differs per algorithm',()=>{
 const s=disk(R,53,'down',199,'SCAN'),l=disk(R,53,'down',199,'LOOK'),c=disk(R,53,'down',199,'CSCAN');
 assert.equal(s.summary.total,53+183);assert.equal(l.summary.total,(53-14)+(183-14));
 assert.equal(c.summary.total,53+199+(199-65));assert.ok(c.path.some(p=>p.kind==='jump'));
 assert.deepEqual(l.summary.order,[37,14,65,67,98,122,124,183])});
test('disk boundary cases & invalid',()=>{
 const r=disk([10,20],0,'up',50,'CSCAN');assert.equal(r.summary.total,20);assert.ok(!r.path.some(p=>p.kind==='jump'));
 assert.equal(disk([50],50,'up',50,'SCAN').summary.total,0);
 assert.throws(()=>disk([],5,'up',9,'SCAN'));assert.throws(()=>disk([99],5,'up',9,'SCAN'));assert.throws(()=>disk([1],5,'left',9,'SCAN'))});
test('parsers',()=>{assert.deepEqual(ints('1, 2  3'),[1,2,3]);assert.throws(()=>ints('1 x'));assert.throws(()=>ints('-1'));assert.deepEqual(mat('1 2; 3 4'),[[1,2],[3,4]]);assert.throws(()=>mat('1 2; 3'))});
