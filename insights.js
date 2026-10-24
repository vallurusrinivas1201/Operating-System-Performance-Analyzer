// Dynamic result interpretation. Every sentence is generated from the actual run/summary values.
import * as E from './engine.js';
import {fmt} from './views.js';
const best=(vals,low)=>low?Math.min(...vals):Math.max(...vals);
function rank(m,algoKey,runs,keys){const x=m.metrics[0];if(x.low==null||runs.length<2)return '';const v=runs.map(r=>x.f(r)),b=best(v,x.low),mine=v[keys.indexOf(algoKey)];
 const winners=keys.filter((k,i)=>v[i]===b).map(k=>m.algos[k]);
 return mine===b?(winners.length===keys.length?`All algorithms tie on ${x.l.toLowerCase()} (${fmt(b)}) for this workload.`:`On this workload it has the ${x.low?'lowest':'highest'} ${x.l.toLowerCase()} (${fmt(b)}) among the compared algorithms.`):`On this workload ${winners.join(' / ')} achieves a better ${x.l.toLowerCase()} (${fmt(b)}) than ${m.algos[algoKey]} (${fmt(mine)}).`}
export function insights(id,a,r,runs,keys,M,inp){
 const m=M[id],o={};const rk=rank(m,a,runs,keys),s=r.summary;
 if(id==='cpu'){const w=[...r.rows].sort((x,y)=>y.wt-x.wt)[0],idle=r.segs.filter(x=>!x.pid).reduce((t,x)=>t+x.end-x.start,0),sl=r.segs.filter(x=>x.pid).length;
  o.what=`${r.rows.length} processes ran in ${sl} CPU slice(s) over ${r.end} time units${idle?`, with ${idle} idle unit(s)`:''}.`;
  o.why=r.segs.find(x=>x.pid)?.why||'';
  o.metrics=`Average waiting ${fmt(s.avgWT)}, turnaround ${fmt(s.avgTAT)}, response ${fmt(s.avgRT)}. ${w.id} waited longest (${w.wt}).`;
  o.imply=[rk,a==='RR'?`Round Robin created ${sl-1} context switch(es); smaller quanta increase this.`:(a==='SJF'||a==='PRIORITY')&&w.wt>=s.avgWT*2?`${w.id} waited ${w.wt} units, well above the average: a hint of starvation risk for this policy.`:''].filter(Boolean).join(' ');
  o.learn='Average waiting time depends heavily on burst lengths and arrival times, not only on the algorithm.'}
 else if(id==='mem'){const f=r.steps.filter(x=>x.b<0);
  o.what=`${s.allocated} of ${s.allocated+s.failed} processes were placed (${fmt(s.rate*100)}%).`;
  o.why=`${m.algos[a]} picked blocks by: ${{FF:'the first block that fits',BF:'the smallest sufficient leftover',WF:'the largest block'}[a]}.`;
  o.metrics=`Unused capacity ${s.unused}; largest free block ${s.largest}; external fragmentation ${fmt(s.frag)}%.`;
  o.imply=f.length?(s.unused>=f[0].sz?`P${f[0].p+1} (${f[0].sz}) was rejected even though ${s.unused} units are free in total: the free space is split across blocks (external fragmentation).`:`P${f[0].p+1} (${f[0].sz}) was rejected because total free space (${s.unused}) is smaller than its size.`):'Every process fit, so fragmentation did not cause any rejection here.';
  o.learn=rk||'Placement order changes which later processes still fit.'}
 else if(id==='file'){const bad=r.steps.filter(x=>!x.ok);
  o.what=`${s.allocated} file(s) allocated, ${s.failed} failed, ${s.free} block(s) still free.`;
  o.why=bad.length?`First failure: ${bad[0].name}: ${bad[0].why}.`:'Every file found enough space under this strategy.';
  o.metrics=a==='IDX'?`${s.metadata} index block(s) were spent as metadata.`:a==='LINK'?`${s.metadata} data block(s) each carry a pointer to the next block.`:'Sequential allocation needs almost no metadata (start + length).';
  o.imply=a==='SEQ'&&bad.some(x=>/fragmentation/.test(x.why))?'Free blocks existed but not contiguously; Linked or Indexed would not fail for this reason.':rk;
  o.learn='Sequential gives the fastest access but suffers fragmentation; indexed and linked trade metadata or pointer-chasing for flexibility.'}
 else if(id==='dl'){
  o.what=s.safe?(r.mode==='BANKER'?`A safe sequence exists: ${s.seq.map(i=>'P'+i).join(' → ')}.`:'Every process can complete, so no deadlock was detected.'):`${s.stuck.map(i=>'P'+i).join(', ')} could not proceed.`;
  o.why=r.steps.find(x=>!x.ok)?.text||r.steps[0]?.text||'';
  o.metrics=`${s.finished} of ${r.alloc.length} processes could finish with the available resources.`;
  o.imply=s.safe?'Resources can be released in a safe order.':r.mode==='BANKER'?'The state is UNSAFE: no guaranteed completion order exists. That means deadlock is possible, not that it has already happened.':'DEADLOCK: these processes wait on resources that only each other could release.';
  o.learn='Safe → unsafe → deadlock are different things: unsafe states only risk deadlock.'}
 else if(id==='page'){
  o.what=`${s.faults} faults and ${s.hits} hits over ${r.ref.length} requests (hit ratio ${fmt(s.hitRatio*100)}%).`;
  const v=r.steps.filter(x=>x.out!==null)[0];o.why=v?v.text:'No replacement was needed (frames never filled).';
  o.metrics=`Fault ratio ${fmt(s.faultRatio*100)}%. Each fault costs a disk access, so fewer faults means faster execution.`;
  let bel='';if(a==='FIFO'){const g=E.page(r.ref,r.nf+1,'FIFO').summary.faults;if(g>s.faults)bel=` Belady’s anomaly: FIFO with ${r.nf+1} frames faults ${g} times, MORE than with ${r.nf}.`}
  o.imply=[rk,bel].filter(Boolean).join(' ');o.learn='Optimal is a lower bound on faults; real policies are judged by how close they get.'}
 else if(id==='disk'){const mv=r.steps,big=[...mv].sort((x,y)=>y.dist-x.dist)[0],bd=mv.filter(x=>x.kind==='boundary').length,jp=mv.filter(x=>x.kind==='jump').length;
  o.what=`The head moved ${s.total} cylinders in total (average ${fmt(s.avg)} per request); service order: ${s.order.join(' → ')}.`;
  o.why=big?`Largest single move: ${big.from} → ${big.to} (${big.dist}).`:'';
  o.metrics=`${bd} boundary visit(s), ${jp} wraparound jump(s)${jp?' (jump distance counted)':''}.`;
  o.imply=rk;o.learn='Less head movement means less seek time, but boundary and wraparound travel also counts under this model.'}
 return o;
}
export function compareText(m,runs,keys){
 return m.metrics.filter(x=>x.low!=null).map(x=>{const v=runs.map(r=>x.f(r)),b=best(v,x.low),w=keys.filter((k,i)=>v[i]===b).map(k=>m.algos[k]);
  const others=keys.filter((k,i)=>v[i]!==b).map(k=>`${m.algos[k]} ${fmt(v[keys.indexOf(k)])}`);
  return w.length===keys.length?`${x.l}: all algorithms tie at ${fmt(b)}.`:`${x.l}: ${w.join(' / ')} ${x.low?'lowest':'highest'} (${fmt(b)}) vs ${others.join(', ')}.`});
}
