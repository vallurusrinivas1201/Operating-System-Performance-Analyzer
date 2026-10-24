// Pure view functions: (run, stepIndex c, ui) -> HTML string. c = -1 is the initial state; c = steps.length-1 is the final state.
import {G} from './learn.js';
export const col=i=>`hsl(${(i*67+200)%360} 72% 58%)`;
export const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const fmt=v=>Number.isInteger(v)?v:+v.toFixed(2);
const tip=l=>G[l]?`<span class="tip" tabindex="0" data-tip="${esc(G[l])}">${l}</span>`:l;
const card=(l,v,t)=>`<div class="metric"${t||G[l]?` title="${esc(t||G[l])}"`:''}><small>${l}</small><b>${v}</b></div>`;
export const history=(steps,c,fn=s=>s.text,title='Step history')=>`<div class="histbox"><h4>${title} <small>click a step to jump to it</small></h4><ol class="hist2">${steps.map((s,k)=>`<li data-goto="${k}" tabindex="0" class="${k===c?'on':k>c?'future':''}"><b>${k+1}</b><span>${esc(fn(s,k))}</span></li>`).join('')}</ol></div>`;
export function bars(items,low){
 const v=items.map(x=>x.v),best=low==null?null:low?Math.min(...v):Math.max(...v),mx=Math.max(...v,1e-9);
 return `<div class="bars">${items.map(x=>`<div class="bar" title="${esc(x.l)}: ${fmt(x.v)}"><span>${esc(x.l)}</span><div class="track"><i class="${x.v===best?'best':''}" style="width:${Math.max(x.v/mx*100,1.5)}%"></i></div><b data-count="${x.v}">${fmt(x.v)}</b>${x.v===best&&items.length>1?'<em>best here</em>':''}</div>`).join('')}</div>`;
}
export function lineChart(series,xs,o={}){
 const W=560,H=230,L=46,B=34,T=14,R=14,all=series.flatMap(s=>s.vals),mx=Math.max(...all,1),mn=0,x=i=>L+(xs.length>1?i/(xs.length-1):.5)*(W-L-R),y=v=>T+(1-(v-mn)/(mx-mn))*(H-T-B);
 const pal=['#22d3ee','#a78bfa','#f59e0b','#34d399'];
 return `<div class="svg-wrap"><svg viewBox="0 0 ${W} ${H}" class="line" role="img" aria-label="${esc(o.title||'line chart')}">
 ${[0,.25,.5,.75,1].map(t=>{const v=mn+(mx-mn)*t;return `<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L-6}" y="${y(v)+3}" text-anchor="end">${fmt(+v.toFixed(1))}</text>`}).join('')}
 ${xs.map((v,i)=>`<text x="${x(i)}" y="${H-16}" text-anchor="middle">${v}</text>`).join('')}<text x="${(L+W)/2}" y="${H-2}" text-anchor="middle" class="ax">${esc(o.xl||'')}</text>
 ${series.map((s,k)=>`<polyline class="ln" style="stroke:${pal[k%4]}" points="${s.vals.map((v,i)=>`${x(i)},${y(v)}`).join(' ')}"/>${s.vals.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="4" style="fill:${pal[k%4]}"><title>${esc(s.name)} @ ${xs[i]}: ${fmt(v)}</title></circle>`).join('')}`).join('')}</svg>
 <div class="legend">${series.map((s,k)=>`<span><i style="background:${pal[k%4]}"></i>${esc(s.name)}</span>`).join('')}<span class="hint">${esc(o.yl||'')}</span></div></div>`;
}

export function cpuView(r,c,ui={}){
 const T=r.end,cur=c>=0?r.segs[c]:null,now=cur?cur.end:0,ids=r.rows.map(x=>x.id),n=ids.length,pk=c%2;
 const doneB=new Set(r.segs.slice(0,Math.max(c,0)).filter(s=>s.pid&&s.remaining===0).map(s=>s.pid));
 const ready=cur?cur.ready:r.rows.filter(p=>p.arrival<=0).map(p=>p.id),cnt=[0,0,0,0];
 const chips=r.rows.map((p,i)=>{const run=!!cur&&cur.pid===p.id,done=doneB.has(p.id),lane=done?3:run?2:ready.includes(p.id)?1:0;
  const last=r.segs.slice(0,c+1).reverse().find(s=>s.pid===p.id),rem=last?last.remaining:p.burst,slot=lane===1?ready.indexOf(p.id):cnt[lane]++;
  return `<div class="pchip ${run?'on p'+pk:''}" style="left:calc(${lane*25}% + 8px);top:${36+slot*38}px"><i style="background:${col(i)}"></i><b>${esc(p.id)}</b><small>${done?'done':run&&rem===0?'finishing':rem+' left'}</small></div>`}).join('');
 const gantt=r.segs.map((s,k)=>{const i=ids.indexOf(s.pid);
  return `<div class="seg ${k>c?'dim':''} ${k===c?'on':''} ${s.pid===null?'idle':''}" style="flex:${s.end-s.start};${s.pid===null?'':`background:${col(i)}`}" title="${s.pid||'IDLE'}: ${s.start}→${s.end} (duration ${s.end-s.start})"><b>${s.pid||'idle'}</b><small>${s.start}–${s.end}</small></div>`}).join('');
 const rows=r.rows.map((p,i)=>{const last=r.segs.slice(0,c+1).reverse().find(s=>s.pid===p.id);const rem=last?last.remaining:p.burst,done=!!last&&last.remaining===0;
  const st=done?'completed':cur&&cur.pid===p.id?'running':p.arrival<=now?'ready':'not arrived';
  return `<tr class="${cur&&cur.pid===p.id?'on':''}"><td><i class="dot" style="background:${col(i)}"></i>${esc(p.id)}</td><td>${p.arrival}</td><td>${p.burst}</td><td><span class="chip s-${st.replace(' ','')}">${st}</span></td><td>${rem}</td>${['ct','tat','wt','rt'].map(k=>`<td>${done?p[k]:'–'}</td>`).join('')}</tr>`}).join('');
 const fin=c===r.segs.length-1;
 return `<div class="lanes" style="height:${Math.max(120,40+n*38)}px"><div class="lane"><b>Not arrived</b></div><div class="lane"><b>Ready queue</b><small>front → back</small></div><div class="lane run"><b>Running (CPU)</b></div><div class="lane"><b>Completed</b></div>${chips}</div>
 <div class="gantt-wrap"><div class="gantt">${gantt}<div class="cursor" style="left:${now/T*100}%"><span>t=${now}</span></div></div><div class="axis"><span>0</span><span>time →</span><span>${T}</span></div></div>
 <div class="tbl-wrap"><table><thead><tr><th>Process</th><th>Arrival</th><th>${tip('Burst')}</th><th>Status</th><th>${tip('Remaining')}</th><th>${tip('Completion')}</th><th>${tip('Turnaround')}</th><th>${tip('Waiting')}</th><th>${tip('Response')}</th></tr></thead><tbody>${rows}</tbody></table></div>
 ${fin?`<div class="metrics">${card('Avg waiting',fmt(r.summary.avgWT),G.Waiting)}${card('Avg turnaround',fmt(r.summary.avgTAT),G.Turnaround)}${card('Avg response',fmt(r.summary.avgRT),G.Response)}</div>`:''}
 ${history(r.steps,c,(s,k)=>`${s.text}`,'Scheduling decisions')}`;
}

export function memView(r,c,ui={}){
 const st=c>=0?r.steps[c]:null,rem=st?st.rem:r.blocks,al=st?st.alloc:r.blocks.map(()=>[]),pk=c%2;
 const procs=r.steps.map((s,k)=>`<span class="pq ${k>c?'pending':s.b<0?'rej':'ok'} ${k===c?'on':''}" style="${k<=c&&s.b>=0?`border-color:${col(s.p)}`:''}"><i style="background:${col(s.p)}"></i>P${s.p+1}<small>${s.sz}${k<=c?(s.b<0?' ✖':' → B'+(s.b+1)):''}</small></span>`).join('');
 const blocks=r.blocks.map((sz,b)=>`<div class="mblock ${st&&st.b===b?'on p'+pk:''}" style="flex:${sz}"><div class="mbar">${al[b].map(a=>`<i style="flex:${a.sz};background:${col(a.p)}" title="P${a.p+1}: ${a.sz}">P${a.p+1}</i>`).join('')}<i class="free" style="flex:${rem[b]}"></i></div><small>Block ${b+1} · size ${sz}<br>free <b>${rem[b]}</b></small></div>`).join('');
 const fin=c===r.steps.length-1,s=r.summary;
 return `<div class="pqs"><small>Process queue</small>${procs}</div>${st&&st.b<0?`<div class="alert bad">✖ P${st.p+1} (${st.sz}) could not be placed</div>`:''}<div class="mem">${blocks}</div>
 <div class="legend"><span><i class="free"></i>free capacity</span><span>colored segment = process using that part of the block</span></div>
 ${fin?`<div class="metrics">${card('Allocated',s.allocated)}${card('Unallocated',s.failed)}${card('Success rate',fmt(s.rate*100)+'%')}${card('Total unused',s.unused)}${card('Largest free',s.largest)}${card('Fragmentation',fmt(s.frag)+'%',G.Fragmentation)}</div>`:''}
 ${history(r.steps,c,s=>(s.b<0?'✖ ':'✔ ')+s.text,'Allocation log')}`;
}

export function fileView(r,c,ui={}){
 const st=c>=0?r.steps[c]:null,d=st?st.disk:r.init,pk=c%2,sel=ui.fsel>=0&&ui.fsel<=c&&r.steps[ui.fsel]&&r.steps[ui.fsel].ok?ui.fsel:-1;
 const nxt={},idx={};r.steps.slice(0,c+1).forEach(s=>{if(!s.ok)return;if(r.algo==='LINK')s.blocks.forEach((b,k)=>nxt[b]=s.blocks[k+1]??null);if(r.algo==='IDX')s.blocks.forEach(b=>idx[b]=s.index)});
 let path=[],tk=0,info='';
 if(sel>=0){const s=r.steps[sel];tk=Math.min(ui.tk||0,s.size-1);
  if(r.algo==='SEQ'){path=[s.blocks[tk]];info=`Sequential: block ${tk} is at start + ${tk} = ${s.blocks[tk]}. Direct access, 0 extra reads.`}
  else if(r.algo==='IDX'){path=[s.index,s.blocks[tk]];info=`Indexed: read index block ${s.index}, look up entry ${tk} → block ${s.blocks[tk]}. 1 extra read.`}
  else{path=s.blocks.slice(0,tk+1);info=`Linked: follow ${tk} pointer(s): ${path.join(' → ')}. Reaching block ${tk} needs ${tk} hops.`}}
 const cells=d.map((x,i)=>{const own=x&&x.f>=0,dim=sel>=0&&!(own&&x.f===sel);
  const lbl=x&&x.t==='index'?'<b>IDX</b>':r.algo==='LINK'&&own&&i in nxt?`<b>${nxt[i]===null?'⊘':'→'+nxt[i]}</b>`:r.algo==='IDX'&&own&&x.t==='data'&&i in idx?`<b>↖${idx[i]}</b>`:'';
  return `<div class="cell ${!x?'free':x.t} ${st&&st.new.includes(i)?'on p'+pk:''} ${dim?'dim':''} ${path.includes(i)?'trav':''}" style="${own?`background:${col(x.f)}`:''}" title="Block ${i}${own?' · '+esc(r.steps[x.f]?.name||''):''}"><small>${i}</small>${lbl}</div>`}).join('');
 const rows=r.steps.slice(0,c+1).map((s,k)=>`<tr data-fsel="${k}" tabindex="0" class="click ${k===c?'on':''} ${k===sel?'sel':''}"><td><i class="dot" style="background:${col(k)}"></i>${esc(s.name)}</td><td>${s.size}</td><td><span class="chip ${s.ok?'s-completed':'s-fail'}">${s.ok?'allocated':'failed'}</span></td><td>${!s.ok?esc(s.why):r.algo==='SEQ'?`${s.blocks[0]}–${s.blocks.at(-1)}`:r.algo==='IDX'?`index ${s.index} ⇒ [${s.blocks.join(', ')}]`:s.blocks.join(' → ')+' → NULL'}</td></tr>`).join('');
 const free=d.filter(x=>!x).length,fin=c===r.steps.length-1;
 return `<div class="grid">${cells}</div><div class="legend"><span><i class="free"></i>free</span><span><i class="used"></i>pre-occupied</span><span><i style="background:${col(0)}"></i>file data (color per file)</span><span><i class="idx"></i>index block</span><span><i class="trv"></i>access path</span></div>
 <div class="metrics">${card('Free blocks',free)}${card('Files allocated',r.steps.slice(0,c+1).filter(s=>s.ok).length)}${card('Failures',r.steps.slice(0,c+1).filter(s=>!s.ok).length)}${fin&&r.algo!=='SEQ'?card('Metadata',r.summary.metadata+(r.algo==='IDX'?' index blk':' pointers'),G.Metadata):''}</div>
 ${rows?`<div class="tbl-wrap"><table><thead><tr><th>File</th><th>Size</th><th>Status</th><th>Blocks / chain</th></tr></thead><tbody>${rows}</tbody></table></div><p class="hint">Click a file row to highlight its blocks and trace how a block is reached.</p>`:'<p class="hint">Press Next to allocate the first file.</p>'}
 ${sel>=0?`<div class="trace2"><label>Access logical block <b>${tk}</b> of ${esc(r.steps[sel].name)} <input type="range" min="0" max="${r.steps[sel].size-1}" value="${tk}" data-tk></label><div class="note">${esc(info)}</div></div>`:''}
 ${history(r.steps,c,s=>s.text,'Allocation log')}`;
}

function rag(r,st,fin){
 const n=r.alloc.length,m=r.avail.length,k=Math.max(n,m),H=k*58+30,W=560,px=96,rx=464;
 const py=i=>30+i*58+(k-n)*29,ry=j=>30+j*58+(k-m)*29,B=r.mode==='BANKER',stuck=i=>fin&&!r.summary.safe&&r.summary.stuck.includes(i);
 let e='';const mid=(x1,y1,x2,y2,t)=>[x1+(x2-x1)*t,y1+(y2-y1)*t-4];
 for(let i=0;i<n;i++)for(let j=0;j<m;j++){
  if(r.alloc[i][j]>0){const[a,b]=[rx-26,ry(j)],[c,d]=[px+24,py(i)],[lx,ly]=mid(a,b,c,d,.8);e+=`<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" class="eg al ${st.finish[i]?'gone':''} ${stuck(i)?'stuck':''}" marker-end="url(#ma)"/><text x="${lx}" y="${ly}" class="el ${st.finish[i]?'gone':''}">${r.alloc[i][j]}</text>`}
  if(r.need[i][j]>0){const[a,b]=[px+24,py(i)+6],[c,d]=[rx-26,ry(j)+6],[lx,ly]=mid(a,b,c,d,.78);e+=`<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" class="eg rq ${B?'claim':''} ${st.finish[i]?'gone':''} ${stuck(i)?'stuck':''}" marker-end="url(#mr)"/><text x="${lx}" y="${ly+12}" class="el ${st.finish[i]?'gone':''}">${r.need[i][j]}</text>`}}
 const total=j=>r.avail[j]+r.alloc.reduce((a,x)=>a+x[j],0);
 return `<div class="svg-wrap"><svg viewBox="0 0 ${W} ${H}" class="ragsvg" role="img" aria-label="Resource allocation graph"><defs><marker id="ma" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0,0L10,5L0,10z" fill="#2dd4bf"/></marker><marker id="mr" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0,0L10,5L0,10z" fill="#f59e0b"/></marker></defs>
 ${e}${r.alloc.map((_,i)=>`<g class="pn ${st.finish[i]?'fin':''} ${st.cur===i?'cur':''} ${stuck(i)?'stuck':''}"><circle cx="${px}" cy="${py(i)}" r="22"/><text x="${px}" y="${py(i)+4}" text-anchor="middle">P${i}</text></g>`).join('')}
 ${r.avail.map((_,j)=>`<g class="rn"><rect x="${rx-26}" y="${ry(j)-22}" width="52" height="44" rx="8"/><text x="${rx}" y="${ry(j)-4}" text-anchor="middle">${String.fromCharCode(65+j)}</text><text x="${rx}" y="${ry(j)+12}" text-anchor="middle" class="sub">${st.work[j]} free / ${total(j)}</text></g>`).join('')}</svg>
 <div class="legend"><span><i class="e al"></i>allocated (resource → process)</span><span><i class="e ${B?'claim':'rq'}"></i>${B?'remaining need (potential request)':'pending request (process → resource)'}</span><span>numbers = instances</span><span>faded = released after the process finished</span></div>
 <p class="hint">With several instances per resource, a cycle in this graph does not prove deadlock; the verdict comes from the Work/Finish test below.</p></div>`;
}
export function dlView(r,c,ui={}){
 const st=c>=0?r.steps[c]:r.init,B=r.mode==='BANKER',m=r.avail.length,fin=c===r.steps.length-1,s=r.summary;
 const head=Array.from({length:m},(_,j)=>String.fromCharCode(65+j)).join(' ');
 const rows=r.alloc.map((a,i)=>`<tr class="${st.cur===i?'on':''}"><td>P${i}</td><td>${a.join(' ')}</td>${B?`<td>${r.second[i].join(' ')}</td>`:''}<td>${r.need[i].join(' ')}</td><td><span class="chip ${st.finish[i]?'s-completed':'s-ready'}">${st.finish[i]?'Finish = true':'false'}</span></td></tr>`).join('');
 const seq=st.seq.map(i=>`<span class="node">P${i}</span>`).join('<span class="arrow">→</span>')||'<em>(empty)</em>';
 const verdict=!fin?'':B?(s.safe?`<div class="alert ok">✔ SAFE state. Safe sequence: ${s.seq.map(i=>'P'+i).join(' → ')}</div>`:`<div class="alert bad">✖ UNSAFE state: no safe sequence for ${s.stuck.map(i=>'P'+i).join(', ')}. Unsafe means deadlock is <i>possible</i>; it is not necessarily deadlocked yet.</div>`)
  :(s.safe?`<div class="alert ok">✔ No deadlock detected: every process can complete.</div>`:`<div class="alert bad">✖ DEADLOCK detected among ${s.stuck.map(i=>'P'+i).join(', ')}: their requests can never be satisfied.</div>`);
 return `${rag(r,st,fin)}<div class="vec"><div><small>${tip('Work')}</small><b>[${st.work.join(', ')}]</b></div><div><small>Resources</small><b>${head}</b></div></div>
 <div class="tbl-wrap"><table><thead><tr><th>Proc</th><th>Allocation</th>${B?'<th>Max</th>':''}<th>${tip(B?'Need':'Request')}</th><th>${tip('Finish')}</th></tr></thead><tbody>${rows}</tbody></table></div>
 <div class="seq"><small>${B?'Safe sequence so far':'Completion order so far'}</small><div>${seq}</div></div>${verdict}${history(r.steps,c,s=>s.text,'Safety / detection steps')}`;
}

export function pageView(r,c,ui={}){
 const st=c>=0?r.steps[c]:null,pk=c%2;
 const refs=r.ref.map((p,t)=>{const s=t<=c?r.steps[t]:null;return `<div class="ref ${t===c?'on p'+pk:''} ${s?(s.hit?'hit':'fault'):''}"><b>${p}</b><small>${s?(s.hit?'HIT':'FAULT'):'·'}</small></div>`}).join('');
 const cap=(p)=>{if(!st||p===undefined)return '';const i=st.info[p];return r.algo==='FIFO'?`entered #${i.age+1}`:r.algo==='LRU'?`last used: req ${i.last+1}`:i.next<0?'never used again':`next use: req ${i.next+1}`};
 const frames=Array.from({length:r.nf},(_,i)=>{const v=st?st.frames[i]:undefined,inc=st&&!st.hit&&v===st.p;
  return `<div class="slot ${inc?(st.out!==null?'victim':'in')+' p'+pk:''} ${st&&st.hit&&v===st.p?'hitslot':''}"><small>Frame ${i+1}</small><b>${v??'—'}</b><em>${cap(v)}</em>${inc&&st.out!==null?`<s title="replaced page">${st.out}</s>`:''}</div>`}).join('');
 let order='';if(st){const pages=[...st.frames],inf=st.info;
  const o=r.algo==='FIFO'?[...st.order]:r.algo==='LRU'?pages.sort((a,b)=>inf[a].last-inf[b].last):pages.sort((a,b)=>(inf[b].next<0?1e9:inf[b].next)-(inf[a].next<0?1e9:inf[a].next));
  const lab=r.algo==='FIFO'?'Arrival order (oldest → newest)':r.algo==='LRU'?'Recency (least → most recently used)':'Future use (farthest → nearest)';
  order=`<div class="order"><small>${lab}</small> ${o.map(p=>`<span class="node">${p}</span>`).join('<span class="arrow">→</span>')}</div>`}
 const trace=Array.from({length:r.nf},(_,i)=>`<tr><th>F${i+1}</th>${r.steps.slice(0,c+1).map((s,k)=>`<td class="${s.hit?'':'f'} ${k===c?'cur':''}">${s.frames[i]??''}</td>`).join('')}</tr>`).join('');
 const done=r.steps.slice(0,c+1),f=done.filter(s=>!s.hit).length;
 return `<div class="refs">${refs}</div><div class="frames">${frames}<div class="badge ${st?(st.hit?'hit':'fault'):''}">${st?(st.hit?'✔ HIT':st.out!==null?`✖ FAULT · replace ${st.out}`:'✖ FAULT · fill frame'):'Ready'}</div></div>${order}
 <div class="tbl-wrap"><table class="trace"><tbody>${trace}</tbody></table></div>
 <div class="metrics">${card('Requests',`${done.length}/${r.ref.length}`)}${card('Faults',f,G.Fault)}${card('Hits',done.length-f)}${card('Hit ratio',done.length?fmt((done.length-f)/done.length*100)+'%':'–',G['Hit ratio'])}${card('Fault ratio',done.length?fmt(f/done.length*100)+'%':'–')}</div>
 ${history(r.steps,c,s=>s.text,'Reference history')}`;
}
export function miniPage(r,c){const st=r.steps[c];
 return `<div class="refs mini">${r.ref.map((p,t)=>`<div class="ref ${t===c?'on':''} ${t<=c?(r.steps[t].hit?'hit':'fault'):''}"><b>${p}</b></div>`).join('')}</div><div class="frames mini">${Array.from({length:r.nf},(_,i)=>`<div class="slot ${st&&!st.hit&&st.frames[i]===st.p?'in':''}"><b>${st?st.frames[i]??'—':'—'}</b></div>`).join('')}<div class="badge ${st?(st.hit?'hit':'fault'):''}">${st?(st.hit?'HIT':'FAULT'):''}</div></div>`}

export function diskView(r,c,ui={}){
 const W=780,pad=30,max=r.max,x=p=>pad+p/max*(W-2*pad),n=r.path.length,rowH=24,y=i=>86+i*rowH,H=y(n)+14,last=Math.min(c+1,n-1),pk=c%2;
 const cur=r.path[last],ticks=[0,.25,.5,.75,1].map(t=>Math.round(max*t));
 const reqDots=r.reqs.map(p=>{const hit=r.path.slice(0,last+1).some(q=>q.kind==='req'&&q.pos===p);return `<circle cx="${x(p)}" cy="46" r="5" class="rq ${hit?'done':''}"><title>request ${p}</title></circle><text x="${x(p)}" y="34" text-anchor="middle" class="rl">${p}</text>`}).join('');
 let g='';for(let i=1;i<=last;i++){const a=r.path[i-1],b=r.path[i];
  g+=`<line x1="${x(a.pos)}" y1="${y(i-1)}" x2="${x(b.pos)}" y2="${y(i)}" pathLength="1" class="mv ${b.kind==='jump'?'jump':''}" marker-end="url(#ar)"/>`}
 let pts='';for(let i=0;i<=last;i++){const p=r.path[i];pts+=`<circle cx="${x(p.pos)}" cy="${y(i)}" r="${i===last?7:4}" class="pt ${p.kind} ${i===last?'cur':''}"/>${i===last||p.kind!=='req'?`<text x="${x(p.pos)}" y="${y(i)-10}" text-anchor="middle">${p.pos}</text>`:''}`}
 const done=r.path.slice(0,last+1),step=c>=0?r.steps[c]:null;
 const rows=r.steps.map((s,k)=>`<tr data-goto="${k}" tabindex="0" class="click ${k===c?'on':k>c?'future':''}"><td>${k+1}</td><td>${s.from}</td><td>${s.to}</td><td>${s.dist}</td><td><span class="chip ${s.kind==='req'?'s-completed':s.kind==='jump'?'s-ready':'s-running'}">${s.kind==='req'?'service request':s.kind==='jump'?'wraparound':'boundary'}</span></td><td>${s.total}</td></tr>`).join('');
 return `<div class="svg-wrap"><svg viewBox="0 0 ${W} ${H}" class="disksvg" role="img" aria-label="Disk head movement"><defs><marker id="ar" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9z" fill="#22d3ee"/></marker></defs>
 <line x1="${pad}" y1="46" x2="${W-pad}" y2="46" class="axisl"/>${ticks.map(t=>`<line x1="${x(t)}" x2="${x(t)}" y1="${y(0)-8}" y2="${H-6}" class="gl"/><text x="${x(t)}" y="16" text-anchor="middle" class="ax">${t}</text>`).join('')}${reqDots}
 ${g}${pts}<g class="head" style="transform:translateX(${x(cur.pos)}px)"><path d="M-9,52 L9,52 L0,66 Z"/><text y="80" text-anchor="middle" class="hd">head ${cur.pos}</text></g></svg></div>
 <div class="note-inline">${step?`<b>${step.from} → ${step.to}</b> · ${step.dist} cylinders · ${step.kind==='req'?'servicing a request':step.kind==='jump'?'wraparound jump':'boundary visit'}`:'Head starts at '+r.head+', direction '+r.dir+'.'}</div>
 <div class="seq"><small>Requests serviced (in order)</small><div>${done.filter(p=>p.kind==='req').map(p=>`<span class="node">${p.pos}</span>`).join('<span class="arrow">→</span>')||'<em>(none yet)</em>'}</div></div>
 <div class="metrics">${card('Current cylinder',cur.pos,G.Cylinder)}${card('Last move',cur.dist)}${card('Total movement',cur.total)}${c===r.steps.length-1?card('Avg / request',fmt(r.summary.avg)):''}</div>
 <div class="legend"><span><i class="rq"></i>request</span><span><i class="pt boundary"></i>boundary</span><span><i class="dash"></i>C-SCAN wraparound (counted)</span><span><i class="glow"></i>trail = path so far</span></div>
 <div class="tbl-wrap"><table class="steps"><thead><tr><th>#</th><th>From</th><th>To</th><th>Distance</th><th>Movement type</th><th>Cumulative</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
