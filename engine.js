// Pure algorithm engines. No UI code. Each run returns {steps, summary, ...}; the UI only renders `steps`.
const bad=m=>{throw new Error(m)};
export const ints=(s,name='values')=>{const a=String(s).trim().split(/[\s,]+/).filter(Boolean).map(Number);
 if(!a.length||a.some(x=>!Number.isInteger(x)||x<0))bad(`${name}: enter non-negative whole numbers`);return a};
export const mat=(s,name)=>{const m=String(s).split(';').map(r=>r.trim()).filter(Boolean).map(r=>ints(r,name));
 if(!m.length||m.some(r=>r.length!==m[0].length))bad(`${name}: rows must have equal length`);return m};

/* CPU. Tie-break: key, then arrival, then input order. Lower priority number = higher priority. */
export function cpu(ps,algo,q=2){
 if(!ps.length)bad('Add at least one process');
 if(algo==='RR'&&!(q>0))bad('Time quantum must be greater than 0');
 ps.forEach(p=>{if(!(p.burst>0))bad(`${p.id}: burst time must be > 0`)});
 const rem=ps.map(p=>p.burst),first={},ct={},segs=[],queue=[],seen=new Set();
 const order=ps.map((_,i)=>i).sort((a,b)=>ps[a].arrival-ps[b].arrival||a-b);
 let t=0,done=0;
 const admit=()=>order.forEach(i=>{if(ps[i].arrival<=t&&!seen.has(i)){seen.add(i);queue.push(i)}});
 const key=i=>algo==='SJF'?[ps[i].burst,ps[i].arrival,i]:algo==='PRIORITY'?[ps[i].priority,ps[i].arrival,i]:[ps[i].arrival,i];
 const lt=(a,b)=>{for(let j=0;j<a.length;j++)if(a[j]!==b[j])return a[j]<b[j];return false};
 while(done<ps.length){
  admit();
  if(!queue.length){const nx=Math.min(...order.filter(i=>!seen.has(i)).map(i=>ps[i].arrival));segs.push({pid:null,start:t,end:nx,why:`The ready queue is empty, so the CPU idles until the next arrival at time ${nx}.`,ready:[]});t=nx;continue}
  let pos=0;if(algo!=='RR')queue.forEach((i,j)=>{if(lt(key(i),key(queue[pos])))pos=j});
  const det=queue.map(j=>`${ps[j].id}(${algo==='SJF'?'burst '+ps[j].burst:algo==='PRIORITY'?'priority '+ps[j].priority:algo==='RR'?rem[j]+' left':'arrived '+ps[j].arrival})`);
  const i=queue.splice(pos,1)[0],run=algo==='RR'?Math.min(q,rem[i]):rem[i],s=t;
  const why=queue.length===0&&det.length===1?`${ps[i].id} is the only ready process, so it is selected.`:
   algo==='FCFS'?`${ps[i].id} is selected because it arrived earliest among the ready processes: ${det.join(', ')}.`:
   algo==='SJF'?`${ps[i].id} is selected because it has the shortest burst time among the ready processes: ${det.join(', ')}.`:
   algo==='PRIORITY'?`${ps[i].id} is selected because it has the highest priority (lowest number) among: ${det.join(', ')}.`:
   `${ps[i].id} is at the front of the ready queue [${det.join(', ')}]; it runs for min(quantum ${q}, remaining ${rem[i]}) = ${run}.`;
  if(first[i]===undefined)first[i]=t;
  t+=run;rem[i]-=run;admit();
  if(rem[i]>0)queue.push(i);else{ct[i]=t;done++}
  segs.push({pid:ps[i].id,start:s,end:t,remaining:rem[i],why,ready:queue.map(j=>ps[j].id)});
 }
 const rows=ps.map((p,i)=>({id:p.id,arrival:p.arrival,burst:p.burst,priority:p.priority,ct:ct[i],tat:ct[i]-p.arrival,wt:ct[i]-p.arrival-p.burst,rt:first[i]-p.arrival}));
 const avg=k=>rows.reduce((a,r)=>a+r[k],0)/rows.length;
 const steps=segs.map(s=>({why:s.why,ready:s.ready,text:s.pid===null?`CPU idle ${s.start}→${s.end}: no process has arrived yet`:
  `${s.pid} runs ${s.start}→${s.end}`+(s.remaining?` (quantum expired, ${s.remaining} left, back to ready queue)`:' and finishes')}));
 return{steps,rows,segs,end:t,summary:{avgWT:avg('wt'),avgTAT:avg('tat'),avgRT:avg('rt')}};
}

/* Memory (variable-size model): a block's leftover capacity stays usable by later processes. */
export function mem(blocks,procs,algo){
 if(!blocks.length||!procs.length)bad('Enter block sizes and process sizes');
 if(blocks.some(x=>x<=0)||procs.some(x=>x<=0))bad('Sizes must be greater than 0');
 const rem=[...blocks],alloc=blocks.map(()=>[]),steps=[];let ok=0;
 const why={FF:'first block that fits',BF:'smallest block that still fits',WF:'largest block'};
 procs.forEach((sz,p)=>{
  const cand=rem.map((_,b)=>b).filter(b=>rem[b]>=sz);let b=-1;
  if(cand.length)b=algo==='FF'?cand[0]:cand.reduce((x,y)=>algo==='BF'?(rem[y]<rem[x]?y:x):(rem[y]>rem[x]?y:x));
  const before=b>=0?rem[b]:0;
  if(b>=0){rem[b]-=sz;alloc[b].push({p,sz});ok++}
  steps.push({p,sz,b,rem:[...rem],alloc:alloc.map(a=>[...a]),text:b>=0?
   `P${p+1} (${sz}) → Block ${b+1} (${why[algo]}; candidates: ${cand.map(x=>x+1).join(', ')}). ${before} → ${rem[b]} free`:
   `P${p+1} (${sz}) rejected: no block has ≥ ${sz} free (largest free = ${Math.max(...rem)})`});
 });
 return{blocks,steps,summary:(()=>{const unused=rem.reduce((a,b)=>a+b,0),largest=Math.max(...rem);return{allocated:ok,failed:procs.length-ok,rate:ok/procs.length,unused,largest,frag:unused?(1-largest/unused)*100:0}})()};
}

/* Files. Indexed uses 1 extra index block; linked stores a pointer inside each block. */
export function file(n,used,files,algo){
 if(!(n>0))bad('Disk size must be > 0');if(used.some(u=>u>=n))bad('Occupied block number is outside the disk');
 files.forEach(f=>{if(!(f.size>0))bad(`File ${f.name}: size must be > 0`)});
 const disk=Array(n).fill(null);used.forEach(u=>disk[u]={f:-1,t:'used'});
 const snap=()=>disk.map(x=>x&&{...x}),init=snap(),steps=[];let ok=0;
 files.forEach((f,fi)=>{
  const free=disk.flatMap((d,i)=>d?[]:[i]);let blocks=null,index=null,why='';
  if(algo==='SEQ'){
   for(let s=0;s+f.size<=n&&!blocks;s++)if(disk.slice(s,s+f.size).every(d=>!d))blocks=Array.from({length:f.size},(_,k)=>s+k);
   if(!blocks)why=free.length<f.size?`only ${free.length} free blocks`:`${free.length} blocks are free but no run of ${f.size} contiguous blocks exists (external fragmentation)`;
  }else{
   const need=f.size+(algo==='IDX'?1:0);
   if(free.length<need)why=`needs ${need} blocks, only ${free.length} free`;
   else{const pick=free.slice(0,need);if(algo==='IDX'){index=pick[0];blocks=pick.slice(1)}else blocks=pick}
  }
  if(blocks){blocks.forEach(b=>disk[b]={f:fi,t:'data'});if(index!==null)disk[index]={f:fi,t:'index'};ok++}
  steps.push({name:f.name,size:f.size,ok:!!blocks,blocks:blocks||[],index,why,new:blocks?[...(index!==null?[index]:[]),...blocks]:[],disk:snap(),
   text:blocks?`${f.name} (${f.size}) allocated: ${algo==='SEQ'?`contiguous blocks ${blocks[0]}–${blocks.at(-1)}`:algo==='IDX'?`index block ${index} → data blocks [${blocks.join(', ')}]`:`chain ${blocks.join(' → ')} → NULL`}`:`${f.name} (${f.size}) FAILED: ${why}`});
 });
 return{n,init,steps,algo,summary:{allocated:ok,failed:files.length-ok,free:disk.filter(d=>!d).length,metadata:algo==='IDX'?ok:algo==='LINK'?steps.filter(x=>x.ok).reduce((a,x)=>a+x.blocks.length,0):0}};
}

/* Deadlock. BANKER: need = max − alloc. DETECT: uses Request matrix; a process holding nothing starts finished. */
export function deadlock(mode,avail,alloc,second){
 const n=alloc.length,m=avail.length;
 if(!n||second.length!==n||alloc.some(r=>r.length!==m)||second.some(r=>r.length!==m))bad('Matrix dimensions must match: processes × resources');
 if(mode==='BANKER'&&second.some((r,i)=>r.some((x,j)=>x<alloc[i][j])))bad('Max must be ≥ Allocation for every entry');
 const need=mode==='BANKER'?second.map((r,i)=>r.map((x,j)=>x-alloc[i][j])):second;
 const work=[...avail],finish=alloc.map(r=>mode==='DETECT'&&r.every(x=>x===0)),seq=[],steps=[];
 const init={work:[...work],finish:[...finish],cur:-1,seq:[]};
 let prog=true;
 while(prog){prog=false;
  for(let i=0;i<n;i++){if(finish[i])continue;
   const ok=need[i].every((x,j)=>x<=work[j]);
   if(ok){alloc[i].forEach((x,j)=>work[j]+=x);finish[i]=true;seq.push(i);prog=true}
   steps.push({cur:i,ok,work:[...work],finish:[...finish],seq:[...seq],text:ok?
    `P${i} can finish (${mode==='BANKER'?'Need':'Request'} [${need[i]}] ≤ Work). Work += Allocation → [${work}]`:
    `P${i} must wait (${mode==='BANKER'?'Need':'Request'} [${need[i]}] exceeds Work [${work}])`});
  }}
 const stuck=finish.flatMap((f,i)=>f?[]:[i]);
 return{mode,avail,alloc,second,need,init,steps,summary:{safe:!stuck.length,seq,stuck,finished:n-stuck.length}};
}

/* Pages. Tie-break for Optimal: first frame slot. */
export function page(ref,nf,algo){
 if(!ref.length)bad('Enter a reference string');if(!(nf>0))bad('Frames must be at least 1');
 const fr=[],order=[],last={},steps=[];let faults=0;
 ref.forEach((p,t)=>{
  const hit=fr.includes(p);let out=null,why='already resident → hit';
  if(!hit){faults++;
   if(fr.length<nf){fr.push(p);why='empty frame available'}
   else{let v;
    if(algo==='FIFO'){v=order[0];why=`${v} entered memory first (oldest)`}
    else if(algo==='LRU'){v=fr.reduce((a,b)=>last[b]<last[a]?b:a);why=`${v} is least recently used (last used at request ${last[v]+1})`}
    else{const nx=x=>{const k=ref.indexOf(x,t+1);return k<0?Infinity:k};
     v=fr.reduce((a,b)=>nx(b)>nx(a)?b:a);why=nx(v)===Infinity?`${v} is never used again`:`${v} is used farthest in the future (request ${nx(v)+1})`}
    out=v;fr[fr.indexOf(v)]=p;order.splice(order.indexOf(v),1)}
   order.push(p)}
  last[p]=t;
  steps.push({t,p,hit,out,frames:[...fr],order:[...order],info:Object.fromEntries(fr.map(x=>[x,{last:last[x],next:ref.indexOf(x,t+1),age:order.indexOf(x)}])),text:`Request ${t+1}: page ${p} → ${hit?'HIT':'FAULT'}`+(hit?'':out!==null?`; replace ${out} (${why})`:`; ${why}`)});
 });
 return{ref,nf,algo,steps,summary:{faults,hits:ref.length-faults,hitRatio:(ref.length-faults)/ref.length,faultRatio:faults/ref.length}};
}

/* Disk. Conventions: SCAN goes to the physical end (0 or max) before reversing. C-SCAN goes to the end, JUMPS to the other end
   (jump distance IS counted), then continues. LOOK reverses at the last request. Requests behind the head are served after the sweep. */
export function disk(reqs,head,dir,max,algo){
 if(!reqs.length)bad('Enter at least one request');if(!(max>0))bad('Max cylinder must be > 0');
 if(head>max)bad('Head position is outside the cylinder range');if(reqs.some(x=>x>max))bad('A request is outside the cylinder range');
 if(!['up','down'].includes(dir))bad('Direction must be up or down');
 const fc=algo==='FCFS',f=x=>(dir==='down'&&!fc)?max-x:x,h=f(head),r=reqs.map(f).sort((a,b)=>a-b);
 const hi=r.filter(x=>x>=h),lo=r.filter(x=>x<h),P=[{pos:h,kind:'start'}],R=x=>({pos:x,kind:'req'});
 if(fc)reqs.forEach(x=>P.push(R(x)));else hi.forEach(x=>P.push(R(x)));
 const atMax=()=>P.at(-1).pos===max;
 if(algo==='SCAN'){if(!atMax())P.push({pos:max,kind:'boundary'});[...lo].reverse().forEach(x=>P.push(R(x)))}
 else if(algo==='CSCAN'){if(lo.length){if(!atMax())P.push({pos:max,kind:'boundary'});P.push({pos:0,kind:'jump'});lo.forEach(x=>P.push(R(x)))}}
 else if(algo==='LOOK')[...lo].reverse().forEach(x=>P.push(R(x)));
 let total=0;const path=P.map((p,i)=>{const d=i?Math.abs(p.pos-P[i-1].pos):0;total+=d;return{pos:f(p.pos),kind:p.kind,dist:d,total}});
 const names={req:'services request',boundary:'reaches disk boundary (reversal)',jump:'wraps around to the other end (jump counted)'};
 const steps=path.slice(1).map((p,i)=>{const from=path[i].pos,dirTxt=p.pos>=from?'toward higher cylinders':'toward lower cylinders';
  const why=p.kind==='boundary'?`${algo} does not stop at the last request: the head continues to the disk edge (${p.pos}) before reversing.`:
   p.kind==='jump'?`C-SCAN wraps to the opposite end without servicing anything; this jump is counted in total movement.`:
   algo==='FCFS'?`FCFS serves requests strictly in arrival order, so ${p.pos} is next regardless of distance.`:
   `${p.pos} is the next requested cylinder in the head's direction of travel (${dirTxt}).`;
  return{from,to:p.pos,dist:p.dist,kind:p.kind,total:p.total,why,text:`Head moves ${from} → ${p.pos}: ${p.dist} cylinders, ${names[p.kind]}; total ${p.total}`}});
 return{max,head,dir,path,steps,reqs,summary:{total,avg:total/reqs.length,order:path.filter(p=>p.kind==='req').map(p=>p.pos)}};
}
