import * as E from './engine.js';import * as V from './views.js';
const lines=s=>String(s).split('\n').map(x=>x.trim()).filter(Boolean);
const procs=s=>{const ids=new Set();return lines(s).map(l=>{const [id,...n]=l.split(/[\s,]+/),v=n.map(Number);
 if(!id||v.length<2||v.length>3||v.some(x=>!Number.isInteger(x)||x<0))throw new Error(`Bad process line "${l}" (use: id arrival burst [priority])`);
 if(ids.has(id))throw new Error('Duplicate process id '+id);ids.add(id);return{id,arrival:v[0],burst:v[1],priority:v[2]??0}})};
const files=s=>s.split(',').map(x=>x.trim()).filter(Boolean).map(x=>{const [name,sz]=x.split(':');const size=Number(sz);
 if(!name||!Number.isInteger(size))throw new Error(`Bad file "${x}" (use name:size)`);return{name:name.trim(),size}});
const used=s=>s.trim()?E.ints(s,'occupied blocks'):[];
const num=(s,n)=>{const v=Number(s);if(!Number.isInteger(v)||v<0)throw new Error(n+' must be a non-negative whole number');return v};
export const M={
 cpu:{name:'CPU Scheduling',icon:'⏱',desc:'FCFS, SJF, Priority and Round Robin on an animated Gantt chart.',algos:{FCFS:'FCFS',SJF:'SJF (non-preemptive)',PRIORITY:'Priority (non-preemptive)',RR:'Round Robin'},
  fields:[{k:'procs',l:'Processes: id arrival burst priority (one per line)',t:'area',d:'P1 0 5 2\nP2 1 3 1\nP3 2 8 4\nP4 3 6 3'},{k:'q',l:'Time quantum (Round Robin)',d:'2'}],
  run:(i,a)=>E.cpu(procs(i.procs),a,num(i.q,'Quantum')),view:V.cpuView,
  extra:i=>{const ps=procs(i.procs),qs=Array.from({length:Math.min(Math.max(...ps.map(p=>p.burst)),8)},(_,k)=>k+1);
   return `<h4>Effect of the time quantum (Round Robin)</h4>`+V.lineChart([{name:'Average waiting time',vals:qs.map(q=>E.cpu(ps,'RR',q).summary.avgWT)},{name:'Average response time',vals:qs.map(q=>E.cpu(ps,'RR',q).summary.avgRT)}],qs,{title:'Quantum sweep',xl:'time quantum',yl:'time units'})+'<p class="hint">Each point runs the Round Robin implementation with that quantum on your processes.</p>'},
  metrics:[{l:'Average waiting time',f:r=>r.summary.avgWT,low:true},{l:'Average turnaround time',f:r=>r.summary.avgTAT,low:true},{l:'Average response time',f:r=>r.summary.avgRT,low:true}],
  info:'Waiting = turnaround − burst. Turnaround = completion − arrival. Response = first run − arrival. Ties: key, then arrival, then input order. Lower priority number = higher priority.'},
 mem:{name:'Memory Allocation',icon:'▦',desc:'First, Best and Worst Fit over variable-size blocks with reusable leftover capacity.',algos:{FF:'First Fit',BF:'Best Fit',WF:'Worst Fit'},
  fields:[{k:'blocks',l:'Block sizes',d:'100 500 200 300 600'},{k:'procs',l:'Process sizes',d:'212 417 112 426'}],
  run:(i,a)=>E.mem(E.ints(i.blocks,'blocks'),E.ints(i.procs,'processes'),a),view:V.memView,
  metrics:[{l:'Processes allocated',f:r=>r.summary.allocated,low:false},{l:'Total unused capacity (informational)',f:r=>r.summary.unused,low:null},{l:'External fragmentation % (informational)',f:r=>r.summary.frag,low:null}],
  info:'Model: a block keeps its leftover capacity after an allocation and later processes may use it (no fixed partitions). Fit rules compare remaining capacity.'},
 file:{name:'File Allocation',icon:'▤',desc:'Contiguous, indexed and linked allocation on a numbered block grid.',algos:{SEQ:'Sequential',IDX:'Indexed',LINK:'Linked'},
  fields:[{k:'n',l:'Disk blocks',d:'24'},{k:'used',l:'Pre-occupied blocks',d:'3 4 9 10 15'},{k:'files',l:'Files name:size, comma separated',d:'A:4, B:5, C:6, D:3'}],
  run:(i,a)=>E.file(num(i.n,'Disk size'),used(i.used),files(i.files),a),view:V.fileView,
  metrics:[{l:'Files allocated',f:r=>r.summary.allocated,low:false},{l:'Free blocks left (informational)',f:r=>r.summary.free,low:null},{l:'Metadata units (index blocks or pointers, informational)',f:r=>r.summary.metadata,low:null}],
  info:'Sequential needs a contiguous run (external fragmentation can fail it). Indexed spends one extra index block per file. Linked uses any free blocks, chained by pointers; direct access is slow.'},
 dl:{name:'Deadlock Management',icon:'⛓',desc:"Banker's safety check and deadlock detection with Work/Finish tracing.",algos:{BANKER:"Banker's (avoidance)",DETECT:'Detection'},
  fields:[{k:'avail',l:'Available (e.g. 3 3 2)',d:'3 3 2'},{k:'alloc',l:'Allocation rows separated by ;',d:'0 1 0; 2 0 0; 3 0 2; 2 1 1; 0 0 2'},{k:'max',l:'Max rows (Banker)',d:'7 5 3; 3 2 2; 9 0 2; 2 2 2; 4 3 3'},{k:'req',l:'Request rows (Detection)',d:'0 0 0; 2 0 2; 0 0 0; 1 0 0; 0 0 2'}],
  cmpNote:"Banker's uses the Max matrix; Detection uses the Request matrix. They answer different questions, so compare their reasoning, not a winner.",
  run:(i,a)=>E.deadlock(a,E.ints(i.avail,'Available'),E.mat(i.alloc,'Allocation'),E.mat(a==='BANKER'?i.max:i.req,a==='BANKER'?'Max':'Request')),view:V.dlView,
  metrics:[{l:'Processes able to finish',f:r=>r.summary.finished,low:false}],
  info:'UNSAFE ≠ DEADLOCK: an unsafe state only means no guaranteed completion order exists; a deadlock is an actual circular wait. A Resource Allocation Graph is not drawn: with multi-instance resources a cycle is not sufficient to prove deadlock, so Work/Finish tracing is shown instead.'},
 page:{name:'Page Replacement',icon:'▥',desc:'FIFO, Optimal and LRU with frame-by-frame replacement reasons.',algos:{FIFO:'FIFO',OPT:'Optimal',LRU:'LRU'},
  fields:[{k:'ref',l:'Reference string',d:'1 2 3 1 4 5 2'},{k:'nf',l:'Frames',d:'3'}],
  run:(i,a)=>E.page(E.ints(i.ref,'reference string'),num(i.nf,'Frames'),a),view:V.pageView,
  extra:i=>{const ref=E.ints(i.ref,'reference string'),fs=[1,2,3,4,5,6,7,8],nm={FIFO:'FIFO',OPT:'Optimal',LRU:'LRU'};
   return `<h4>Page faults versus number of frames</h4>`+V.lineChart(Object.keys(nm).map(a=>({name:nm[a],vals:fs.map(f=>E.page(ref,f,a).summary.faults)})),fs,{title:'Faults vs frames',xl:'frames',yl:'page faults'})+'<p class="hint">Each point is a full run of that algorithm with that many frames on your reference string.</p>'},
  metrics:[{l:'Page faults',f:r=>r.summary.faults,low:true},{l:'Page hits',f:r=>r.summary.hits,low:false}],
  info:'Optimal evicts the page used farthest in the future (or never again); ties pick the first frame. LRU evicts the least recently used resident page. FIFO evicts the oldest arrival.'},
 disk:{name:'Disk Scheduling',icon:'◎',desc:'SCAN, C-SCAN and LOOK head paths with boundary and wraparound handling.',algos:{FCFS:'FCFS',SCAN:'SCAN',CSCAN:'C-SCAN',LOOK:'LOOK'},
  fields:[{k:'reqs',l:'Requests',d:'98 183 37 122 14 124 65 67'},{k:'head',l:'Head position',d:'53'},{k:'max',l:'Max cylinder',d:'199'},{k:'dir',l:'Initial direction',t:'sel',o:['up','down'],d:'up'}],
  run:(i,a)=>E.disk(E.ints(i.reqs,'requests'),num(i.head,'Head'),i.dir,num(i.max,'Max cylinder'),a),view:V.diskView,
  metrics:[{l:'Total head movement',f:r=>r.summary.total,low:true},{l:'Average movement per request',f:r=>r.summary.avg,low:true}],
  info:'Convention: SCAN travels to the physical end before reversing. C-SCAN travels to the end, then jumps to the opposite end; that jump IS counted in total movement. LOOK reverses at the last request.'}
};
