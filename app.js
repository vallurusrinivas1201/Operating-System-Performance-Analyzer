import {M} from './modules.js';import {bars,esc,fmt,miniPage} from './views.js';import {GROUPS} from './learn.js';import {insights,compareText} from './insights.js';import * as E from './engine.js';
const $=s=>document.querySelector(s),RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const S={view:'dash',algo:{},inp:{},c:-1,play:false,speed:900,err:'',run:null,runs:[],cmp:'page',min:false,hist:[],last:null,ui:{fsel:-1,tk:0},open:{concept:true}};
try{S.hist=JSON.parse(localStorage.getItem('osa-hist')||'[]');S.last=localStorage.getItem('osa-last')}catch{}
const defaults=k=>Object.fromEntries(M[k].fields.map(f=>[f.k,f.d]));
for(const k in M){S.algo[k]=Object.keys(M[k].algos)[0];S.inp[k]=defaults(k)}
let timer=null,heroT=null,heroC=-1;
const mod=()=>S.view==='cmp'?S.cmp:S.view,isMod=()=>S.view==='cmp'||!!M[S.view],keys=()=>Object.keys(M[mod()].algos);
const stop=()=>{S.play=false;clearInterval(timer);timer=null};
const N=()=>S.view==='cmp'?Math.max(0,...S.runs.map(r=>r.steps.length)):S.run?S.run.steps.length:0;

/* ---- tiny DOM reconciler: keeps elements alive so CSS transitions animate real state changes ---- */
function sync(a,b){const A=[...a.childNodes],B=[...b.childNodes];
 B.forEach((nb,i)=>{const na=A[i];
  if(!na){a.appendChild(nb.cloneNode(true));return}
  if(na.nodeType!==nb.nodeType||na.nodeName!==nb.nodeName){a.replaceChild(nb.cloneNode(true),na);return}
  if(nb.nodeType!==1){if(na.nodeValue!==nb.nodeValue)na.nodeValue=nb.nodeValue;return}
  for(const at of [...na.attributes])if(!nb.hasAttribute(at.name))na.removeAttribute(at.name);
  for(const at of nb.attributes)if(na.getAttribute(at.name)!==at.value)na.setAttribute(at.name,at.value);
  sync(na,nb);
  if(na.nodeName==='INPUT'&&na.type==='range')na.value=nb.getAttribute('value');
  if(na.nodeName==='SELECT'){const o=[...nb.options].find(x=>x.hasAttribute('selected'));if(o)na.value=o.value}});
 for(let i=A.length-1;i>=B.length;i--)a.removeChild(A[i]);}
function morph(el,html){if(!el)return;const t=document.createElement('template');t.innerHTML=html;sync(el,t.content)}
function counts(root){if(!root)return;root.querySelectorAll('[data-count]').forEach(el=>{const v=+el.dataset.count,f=el.textContent;if(RM||!isFinite(v))return;
 const dec=(String(v).split('.')[1]||'').length>0?2:0,t0=performance.now();const step=t=>{const k=Math.min((t-t0)/700,1),e=1-Math.pow(1-k,3);el.textContent=k<1?(v*e).toFixed(dec):f;if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)})}
let tt=null;function toast(msg,kind='ok'){const t=$('#toast');t.className='show '+kind;t.textContent=msg;clearTimeout(tt);tt=setTimeout(()=>t.className='',2600)}

function compute(){stop();S.c=-1;S.err='';S.run=null;S.runs=[];S.rk=[];S.errs={};S.ui={fsel:-1,tk:0};
 if(!isMod())return;
 const k=mod(),m=M[k];
 for(const a of keys()){try{S.runs.push(m.run(S.inp[k],a));S.rk.push(a)}catch(e){S.errs[a]=e.message}}
 if(S.view==='cmp'){if(!S.runs.length)S.err=Object.values(S.errs)[0]||'Invalid input'}
 else if(S.errs[S.algo[k]])S.err=S.errs[S.algo[k]];else S.run=S.runs[S.rk.indexOf(S.algo[k])]}
const NAV=[['dash','Dashboard','⌂'],...Object.entries(M).map(([k,m])=>[k,m.name,m.icon]),['cmp','Algorithm Comparison','⇄']];
const title=()=>S.view==='dash'?'Dashboard':S.view==='cmp'?'Algorithm Comparison':M[S.view].name;

function shell(){
 $('#app').innerHTML=`<aside class="side ${S.min?'min':''}" aria-label="Main navigation"><div class="brand"><span class="logo">◈</span><b>OS Performance<br>Analyzer</b></div>
 <nav>${NAV.map(([id,n,i],k)=>`<button class="nav ${S.view===id?'active':''}" data-go="${id}" title="${n}" ${S.view===id?'aria-current="page"':''}><span>${i}</span><em>${n}</em></button>`).join('')}</nav>
 <button class="nav fold" data-fold title="Collapse sidebar"><span>${S.min?'»':'«'}</span><em>Collapse</em></button></aside>
 <div class="main"><header><div class="crumbs">OS Performance Analyzer <i>/</i> <b>${title()}</b></div><div class="acts"><span class="kbd-hint" title="Keyboard: ← → step, Space play/pause, R reset">⌨ ← → Space R</span><span class="badge-sim" title="All numbers come from simulated algorithms, not from your real OS">SIMULATED · not real OS measurements</span></div></header><main id="body" tabindex="-1"></main></div>`;
 body();
}
const field=(k,f)=>`<label class="${f.t==='area'?'wide':''}"><span>${f.l}</span>${f.t==='area'?`<textarea rows="5" data-f="${f.k}" spellcheck="false">${esc(S.inp[k][f.k])}</textarea>`:f.t==='sel'?`<select data-f="${f.k}">${f.o.map(o=>`<option ${S.inp[k][f.k]===o?'selected':''}>${o}</option>`).join('')}</select>`:`<input data-f="${f.k}" value="${esc(S.inp[k][f.k])}" spellcheck="false">`}</label>`;
function body(){
 const b=$('#body');clearInterval(heroT);
 if(S.view==='dash'){b.innerHTML=dash();heroStart();return}
 const cmp=S.view==='cmp',k=mod(),m=M[k],no=String(Object.keys(M).indexOf(k)+1).padStart(2,'0');
 b.innerHTML=`<div class="pagehead"><div><span class="eyebrow">${cmp?'COMPARE':'MODULE '+no}</span><h1>${cmp?'Algorithm Comparison':m.name}</h1><p>${cmp?'Run every algorithm of a module on one identical workload and inspect where they differ.':m.desc}</p></div></div>
 ${cmp?`<div class="modsel" role="tablist">${Object.entries(M).map(([id,x])=>`<button class="tab ${S.cmp===id?'active':''}" data-cmpmod="${id}">${x.icon} ${x.name}</button>`).join('')}</div>`:''}
 <div class="work"><aside class="inputs panel"><h3>Workload</h3><div class="fields">${m.fields.map(f=>field(k,f)).join('')}</div>
 <div class="row"><button class="pri" data-act="run">▶ Run Simulation</button><button data-act="sample">↺ Reset to sample</button></div><p class="hint">Edits apply when you leave a field. Run Simulation also records it in your history.</p></aside>
 <section class="viz panel" id="viz" aria-label="Simulation"></section></div>${cmp?'':'<section id="learn" class="learn"></section>'}`;
 viz();if(!cmp)learn();
}
const SPEEDS=[[1400,'0.5×'],[900,'1×'],[450,'2×'],[200,'4×']];
const status=n=>S.play?['running','Playing']:n&&S.c>=n-1?['done','Complete']:S.c<0?['idle','Ready']:['paused','Paused'];
const ctl=n=>{const [k,l]=status(n);return `<div class="ctl"><span class="status ${k}">${l}</span><button data-act="reset" title="Reset (R)">⏮ Reset</button><button data-act="prev" title="Previous (←)" ${S.c<0?'disabled':''}>◀ Prev</button><button class="pri" data-act="play" title="Play / Pause (Space)" ${n?'':'disabled'}>${S.play?'⏸ Pause':'▶ Play'}</button><button data-act="next" title="Next (→)" ${S.c>=n-1?'disabled':''}>Next ▶</button>
 <label class="inline">Speed <select data-speed aria-label="Playback speed">${SPEEDS.map(([v,l])=>`<option value="${v}" ${S.speed===v?'selected':''}>${l}</option>`).join('')}</select></label>
 <input type="range" min="-1" max="${n-1}" value="${S.c}" data-scrub aria-label="Simulation step"><span class="count">Step ${S.c+1} / ${n}</span><div class="prog" aria-hidden="true"><i style="width:${n?(S.c+1)/n*100:0}%"></i></div></div>`};
const note=(r,c)=>{if(c<0)return `<div class="note idle">Initial state. Press <b>Next</b> or <b>Play</b> to watch the algorithm run, one decision at a time.</div>`;
 const s=r.steps[c];return `<div class="note" aria-live="polite"><span class="stepno">Step ${c+1}</span><div>${esc(s.text)}</div>${s.why?`<div class="why"><b>Why:</b> ${esc(s.why)}</div>`:''}</div>`};
function stage(){const k=mod(),m=M[k],el=$('#stage');if(!el||S.err)return;
 if(S.view!=='cmp'){morph(el,note(S.run,S.c)+m.view(S.run,S.c,S.ui));return}
 morph(el,`<div class="cmpgrid">${S.rk.map((a,i)=>{const r=S.runs[i],c=Math.min(S.c,r.steps.length-1);return `<div class="sub"><h4>${m.algos[a]} <small>step ${c+1}/${r.steps.length}</small></h4>${note(r,c)}${m.view(r,c,S.ui)}</div>`}).join('')}</div>`)}
const ctlr=()=>morph($('#ctl'),ctl(N()));
function results(){const el=$('#results');if(!el||S.err)return;const k=mod(),m=M[k],ks=S.rk,runs=S.runs;
 let h='';
 if(S.view!=='cmp'){const o=insights(k,S.algo[k],S.run,runs,ks,M,S.inp[k]);
  h+=`<h3>Performance insights <small>generated from this run</small></h3><div class="insights">${[['What happened',o.what],['Why',o.why],['What the metrics mean',o.metrics],['What it implies',o.imply],['What to learn',o.learn]].filter(x=>x[1]).map(([l,t])=>`<div class="ins"><b>${l}</b><p>${esc(t)}</p></div>`).join('')}</div>`}
 const best=m.metrics.map(x=>{const v=runs.map(r=>x.f(r));return x.low==null?null:x.low?Math.min(...v):Math.max(...v)});
 const sk=Object.entries(S.errs);if(sk.length)h+=`<div class="alert bad" role="status">Not included in the comparison: ${sk.map(([a,e])=>esc(m.algos[a]+' ('+e+')')).join('; ')}</div>`;
 h+=`<h3>Algorithm comparison <small>same workload, calculated results</small></h3><div class="tbl-wrap"><table><thead><tr><th>Algorithm</th>${m.metrics.map(x=>`<th>${x.l}</th>`).join('')}</tr></thead><tbody>${runs.map((r,i)=>`<tr class="${S.view!=='cmp'&&S.algo[k]===ks[i]?'on':''}"><td>${m.algos[ks[i]]}</td>${m.metrics.map((x,j)=>`<td class="${x.f(r)===best[j]?'bestcell':''}" data-count="${x.f(r)}">${fmt(x.f(r))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
 <div class="charts">${m.metrics.map(x=>`<div class="chart"><h4>${x.l}</h4>${bars(runs.map((r,i)=>({l:m.algos[ks[i]],v:x.f(r)})),x.low)}</div>`).join('')}</div>
 <div class="interp"><h4>Interpretation</h4><ul>${compareText(m,runs,ks).map(t=>`<li>${esc(t)}</li>`).join('')}</ul>${m.cmpNote?`<p class="hint">${esc(m.cmpNote)}</p>`:''}<p class="hint">“Best here” applies to this workload only. It does not mean an algorithm is better in general; see the trade-offs below.</p></div>
 <div class="tradeoffs">${ks.map(a=>{const g=GROUPS[k].algos[a];return `<div class="to ${S.view!=='cmp'&&S.algo[k]===a?'cur':''}"><h4>${m.algos[a]}</h4><p class="use">Suited to: ${esc(g.use)}</p><ul class="pro">${g.pros.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><ul class="con">${g.cons.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`}).join('')}</div>`;
 try{if(m.extra&&S.view!=='cmp')h+=`<div class="chart wide">${m.extra(S.inp[k],S.algo[k])}</div>`}catch{}
 morph(el,h);counts(el)}
function viz(){const el=$('#viz');if(!el)return;
 if(S.err){morph(el,`<div class="alert bad" role="alert"><b>Please fix the input</b><div>${esc(S.err)}</div><div class="hint">Check the format described above each field, or press “Reset to sample”.</div></div>`);return}
 const m=M[mod()],k=mod();
 morph(el,`${S.view==='cmp'?`<div class="tabs"><span class="hint">All ${keys().length} algorithms run on the same workload. Use the shared controls to step through all of them together.</span></div>`:`<div class="tabs" role="tablist">${keys().map(a=>`<button class="tab ${S.algo[k]===a?'active':''}" role="tab" aria-selected="${S.algo[k]===a}" data-algo="${a}">${m.algos[a]}</button>`).join('')}</div>`}<div id="ctl"></div><div id="stage"></div><div id="results"></div>`);
 ctlr();stage();results()}
function learn(){const el=$('#learn');if(!el)return;const k=mod(),m=M[k],g=GROUPS[k],a=S.algo[k],al=g.algos[a],o=x=>S.open[x]?'open':'';
 morph(el,`<h2>Learn</h2>
 <details data-sec="concept" ${o('concept')}><summary>Learn the concept: ${m.name}</summary><div class="callouts">${[['What it is',g.concept.what],['Why OS needs it',g.concept.why],['Problem it solves',g.concept.problem],['Where it is used',g.concept.real]].map(([t,x])=>`<div class="callout"><b>${t}</b><p>${esc(x)}</p></div>`).join('')}</div></details>
 <details data-sec="how" ${o('how')}><summary>How ${m.algos[a]} works</summary><p>${esc(al.how)}</p><ol class="seqs">${al.seq.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></details>
 <details data-sec="trade" ${o('trade')}><summary>Strengths and trade-offs: ${m.algos[a]}</summary><div class="two"><div class="to"><h4>Advantages</h4><ul class="pro">${al.pros.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div class="to"><h4>Disadvantages and limits</h4><ul class="con">${al.cons.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div><p class="use">Best suited to: ${esc(al.use)}</p></details>
 <details data-sec="extra" ${o('extra')}><summary>Key ideas and conventions</summary><p>${esc(g.extra)}</p><p class="hint">${esc(m.info)}</p></details>`)}

/* ---- dashboard ---- */
function lastRun(){const h=S.hist[0];if(!h||!M[h.m])return null;try{const m=M[h.m],ks=Object.keys(m.algos),runs=ks.map(a=>m.run(h.inp,a)),r=runs[ks.indexOf(h.a)];return{h,m,o:insights(h.m,h.a,r,runs,ks,M,h.inp)}}catch{return null}}
function dash(){
 const cards=Object.entries(M).map(([k,m],i)=>{let pv='';try{const r=m.run(defaults(k),Object.keys(m.algos)[0]);pv=m.view(r,r.steps.length-1,{})}catch{}
  return `<article class="mcard"><div class="prev" aria-hidden="true">${pv}</div><div class="mc-body"><span class="eyebrow">MODULE 0${i+1}</span><h3><span>${m.icon}</span>${m.name}</h3><p>${m.desc}</p><div class="algochips">${Object.values(m.algos).map(x=>`<em>${x}</em>`).join('')}</div><div class="row"><button data-go="${k}">Open</button><button class="pri" data-go="${k}" data-play="1">▶ Run sample</button></div></div></article>`}).join('');
 let ov='';try{const c=M.cpu,p=M.page,d=M.disk,f=(m,k)=>Object.keys(m.algos).map(a=>({l:m.algos[a],v:m.metrics[0].f(m.run(defaults(k),a))}));
  ov=`<div class="charts"><div class="chart"><h4>CPU: average waiting time</h4>${bars(f(c,'cpu'),true)}</div><div class="chart"><h4>Pages: total faults</h4>${bars(f(p,'page'),true)}</div><div class="chart"><h4>Disk: head movement</h4>${bars(f(d,'disk'),true)}</div></div>`}catch{}
 const lr=lastRun(),last=S.last&&M[S.last]?S.last:null;
 return `<section class="hero"><div class="hero-text"><span class="eyebrow">INTERACTIVE OPERATING SYSTEMS LAB</span><h1>Watch operating-system algorithms <span>think, step by step</span></h1><p>Scheduling, memory, files, deadlocks, paging and disks. Every animation replays the real execution trace of the algorithm on your inputs, with the reasoning for each decision.</p>
 <div class="row"><button class="pri big" data-go="page" data-play="1">▶ Launch sample simulation</button><button class="big" data-go="cmp">⇄ Compare algorithms</button>${last?`<button class="big ghost" data-go="${last}">Continue: ${M[last].name}</button>`:''}</div>
 <ul class="learns"><li>How each algorithm decides</li><li>Why results differ</li><li>Where it is used in real systems</li></ul></div>
 <div class="demo-wrap"><div class="demo-cap" id="hero-cap"></div><div class="demo" id="hero-demo"></div><p class="hint">Live demo: the real LRU trace for the sample reference string.</p></div></section>
 <div class="disclaimer">ⓘ All results are <b>simulated</b> from the inputs you provide. They are not measurements of your computer's operating system.</div>
 <h2>Modules</h2><div class="mgrid">${cards}</div>
 <h2>Your latest simulation</h2><section class="panel">${lr?`<div class="insights"><div class="ins"><b>${esc(lr.h.name)} · ${esc(lr.h.al)}</b><p>${esc(lr.o.what)}</p></div>${lr.o.imply?`<div class="ins"><b>What it implies</b><p>${esc(lr.o.imply)}</p></div>`:''}</div><div class="row"><button class="pri" data-resume="0">Open this simulation</button></div>`:`<div class="empty"><b>No simulations yet</b><p>Open any module and press “Run Simulation”. Your latest result and its interpretation will appear here (stored only in this browser).</p></div>`}</section>
 <h2>Sample workload comparison <small class="hint">computed live from each module's default input, not your runs</small></h2><section class="panel">${ov}</section>
 <h2>Recent simulations <button class="link" data-clear>clear</button></h2><section class="panel">${S.hist.length?`<ul class="hist">${S.hist.map(h=>`<li><b>${esc(h.name)}</b> · ${esc(h.al)} <em>${esc(h.s)}</em><time>${esc(h.t)}</time></li>`).join('')}</ul>`:'<p class="hint">Nothing recorded yet.</p>'}</section>`;
}
function heroStart(){let r;try{r=E.page([1,2,3,1,4,5,2],3,'LRU')}catch{return}heroC=-1;
 const draw=()=>{const el=$('#hero-demo');if(!el){clearInterval(heroT);return}morph(el,miniPage(r,Math.max(heroC,0)));$('#hero-cap').textContent=heroC>=0?r.steps[heroC].text:'LRU · 3 frames'};
 draw();heroT=setInterval(()=>{heroC=heroC>=r.steps.length+1?-1:heroC+1;if(heroC>=r.steps.length){draw();return}draw()},1100)}

/* ---- navigation & playback ---- */
function go(v,auto){S.view=v;if(M[v]){S.last=v;try{localStorage.setItem('osa-last',v)}catch{}}compute();shell();window.scrollTo(0,0);if(auto)play()}
function play(){const n=N();if(!n)return;if(S.play){stop();ctlr();return}
 if(S.c>=n-1)S.c=-1;S.play=true;
 timer=setInterval(()=>{if(S.c<N()-1){S.c++;if(S.c>=N()-1)stop();stage();ctlr()}else{stop();ctlr()}},S.speed);ctlr()}
const summ=r=>{const s=r.summary;return s.avgWT!==undefined?`avg waiting ${fmt(s.avgWT)}`:s.faults!==undefined?`${s.faults} faults`:s.total!==undefined?`${s.total} cylinders`:s.allocated!==undefined?`${s.allocated} allocated`:s.safe!==undefined?(s.safe?'safe / no deadlock':'unsafe / deadlock'):''};
const jump=k=>{stop();S.c=Math.max(-1,Math.min(N()-1,k));ctlr();stage()};
document.addEventListener('click',e=>{const t=e.target.closest('[data-go],[data-act],[data-algo],[data-fold],[data-clear],[data-goto],[data-fsel],[data-cmpmod],[data-resume]');if(!t)return;const d=t.dataset;
 if(d.go){go(d.go,d.play);return}
 if(d.fold!==undefined){S.min=!S.min;shell();return}
 if(d.clear!==undefined){S.hist=[];try{localStorage.removeItem('osa-hist')}catch{}body();return}
 if(d.resume!==undefined){const h=S.hist[0];S.inp[h.m]=h.inp;S.algo[h.m]=h.a;go(h.m);return}
 if(d.cmpmod){S.cmp=d.cmpmod;compute();body();return}
 if(d.algo){S.algo[mod()]=d.algo;S.err=S.errs[d.algo]||'';S.run=S.err?null:S.runs[S.rk.indexOf(d.algo)];S.c=-1;stop();S.ui={fsel:-1,tk:0};viz();learn();return}
 if(d.goto!==undefined){jump(+d.goto);return}
 if(d.fsel!==undefined){S.ui.fsel=S.ui.fsel===+d.fsel?-1:+d.fsel;S.ui.tk=0;stage();return}
 const n=N();
 if(d.act==='reset'){stop();S.c=-1;ctlr();stage()}
 else if(d.act==='prev')jump(S.c-1);else if(d.act==='next')jump(S.c+1);
 else if(d.act==='play')play();
 else if(d.act==='run'){compute();viz();if(S.err){toast('Fix the highlighted input first','err');return}
  const k=mod(),r=S.view==='cmp'?S.runs[0]:S.run;S.hist=[{m:k,name:M[k].name,a:S.algo[k],al:S.view==='cmp'?'all algorithms':M[k].algos[S.algo[k]],inp:{...S.inp[k]},s:summ(r),t:new Date().toLocaleTimeString()},...S.hist].slice(0,8);
  try{localStorage.setItem('osa-hist',JSON.stringify(S.hist))}catch{}toast(`✔ Simulation ready: ${N()} steps. Press Play or Next.`)}
 else if(d.act==='sample'){S.inp[mod()]=defaults(mod());compute();body();toast('Sample workload restored')}
});
document.addEventListener('change',e=>{const t=e.target;
 if(t.dataset.f!==undefined){S.inp[mod()][t.dataset.f]=t.value;compute();viz()}
 else if(t.dataset.speed!==undefined){S.speed=+t.value;if(S.play){stop();play()}}});
document.addEventListener('input',e=>{const t=e.target;
 if(t.dataset.scrub!==undefined){stop();S.c=+t.value;stage();const c=$('.count');if(c)c.textContent=`Step ${S.c+1} / ${N()}`;const p=document.querySelector('.prog i');if(p)p.style.width=(N()?(S.c+1)/N()*100:0)+'%';const pb=document.querySelector('[data-act=play]');if(pb)pb.textContent='▶ Play'}
 else if(t.dataset.tk!==undefined){S.ui.tk=+t.value;stage()}});
document.addEventListener('toggle',e=>{const k=e.target.dataset&&e.target.dataset.sec;if(k)S.open[k]=e.target.open},true);
document.addEventListener('keydown',e=>{const t=e.target;
 if((e.key==='Enter'||e.key===' ')&&t.matches&&t.matches('[data-goto],[data-fsel]')){e.preventDefault();t.click();return}
 if(!isMod()||/INPUT|TEXTAREA|SELECT|BUTTON/.test(t.tagName)&&e.key===' '||/TEXTAREA|SELECT/.test(t.tagName)||t.type==='text')return;
 if(e.key==='ArrowRight'){e.preventDefault();jump(S.c+1)}else if(e.key==='ArrowLeft'){e.preventDefault();jump(S.c-1)}
 else if(e.key===' '&&t.tagName!=='BUTTON'){e.preventDefault();play()}else if(e.key.toLowerCase()==='r'&&!e.ctrlKey&&!e.metaKey){stop();S.c=-1;ctlr();stage()}});
shell();
