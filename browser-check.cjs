// Optional browser test. Needs: npm i -D playwright && npx playwright install chromium, and `npm start` running in another terminal.
const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});
 const errs=[];p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.type()+': '+m.text())});p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
 const ok=[],fail=[];globalThis.__ok=ok;const T=(n,c)=>{(c?ok:fail).push(n)};
 const cnt=async()=>(await p.textContent('.count')).trim();
 await p.goto('http://localhost:5173/');await p.waitForSelector('.mcard');
 T('dash: 6 module cards',await p.locator('.mcard').count()===6);T('dash: hero live demo renders',(await p.locator('#hero-demo .slot').count())===3);
 T('dash: empty state before any run',(await p.textContent('#body')).includes('No simulations yet'));
 T('dash: disclaimer',(await p.textContent('.disclaimer')).includes('simulated'));
 await p.waitForTimeout(1300);T('dash: hero caption advances with real trace',/Request \d/.test(await p.textContent('#hero-cap')));
 const mods=[['cpu','.lanes'],['mem','.mem'],['file','.grid'],['dl','.ragsvg'],['page','.frames'],['disk','.disksvg']];
 for(const [id,sel] of mods){
  await p.click(`nav [data-go=${id}]`);await p.waitForSelector(sel);
  const n=+(await cnt()).split('/')[1];T(`${id}: renders ${n} steps`,n>0);
  T(`${id}: learn sections (4 details)`,await p.locator('#learn details').count()===4);
  T(`${id}: insights panel`,await p.locator('.insights .ins').count()>=4);
  await p.click('[data-act=next]');T(`${id}: next`,(await cnt()).startsWith('Step 1 /'));
  T(`${id}: live step explanation`,(await p.textContent('.note')).length>25);
  await p.click('[data-act=next]');await p.click('[data-act=prev]');T(`${id}: prev`,(await cnt()).startsWith('Step 1 /'));
  await p.click('[data-act=reset]');T(`${id}: reset`,(await cnt()).startsWith('Step 0'));
  await p.locator('[data-goto="1"]').first().click().catch(()=>{});
  await p.click('[data-act=reset]');
  await p.selectOption('[data-speed]','200');await p.click('[data-act=play]');
  await p.waitForFunction(n=>document.querySelector('.count').textContent.includes('Step '+n+' /'),n,{timeout:20000});T(`${id}: play reaches final`,true);
  T(`${id}: status Complete`,(await p.textContent('.status')).includes('Complete'));
  const tabs=await p.locator('.tab').count();for(let i=0;i<tabs;i++){await p.locator('.tab').nth(i).click();T(`${id}: algo ${i} resets`,(await cnt()).startsWith('Step 0'))}
  T(`${id}: comparison + tradeoffs`,await p.locator('.chart .bar').count()>=tabs&&await p.locator('.tradeoffs .to').count()===tabs);
 }
 // module specifics
 await p.click('nav [data-go=cpu]');for(let i=0;i<3;i++)await p.click('[data-act=next]');T('cpu: process chips in lanes',await p.locator('.pchip').count()===4);T('cpu: running chip highlighted',await p.locator('.pchip.on').count()===1);
 await p.locator('.tab',{hasText:'Round Robin'}).click();T('cpu: RR quantum line chart',await p.locator('.line').count()===1);
 await p.click('nav [data-go=mem]');for(let i=0;i<4;i++)await p.click('[data-act=next]');T('mem: rejection shown',(await p.textContent('#stage')).includes('could not be placed'));T('mem: fragmentation metric',(await p.textContent('#stage')).includes('Fragmentation'));
 await p.click('nav [data-go=file]');for(let i=0;i<4;i++)await p.click('[data-act=next]');await p.locator('tr[data-fsel="0"]').click();T('file: selecting a file dims others',await p.locator('.cell.dim').count()>0);T('file: traversal explanation',/Sequential|Indexed|Linked/.test(await p.textContent('.trace2')));
 await p.locator('.tab',{hasText:'Linked'}).click();for(let i=0;i<2;i++)await p.click('[data-act=next]');await p.locator('tr[data-fsel="1"]').click();await p.locator('[data-tk]').fill('2');T('file: linked pointer hops',(await p.textContent('.trace2')).includes('2 hops')||(await p.textContent('.trace2')).includes('2 pointer'));
 await p.click('nav [data-go=dl]');await p.locator('.tab',{hasText:'Banker'}).click();T('dl: RAG edges',await p.locator('.eg').count()>0);for(let i=0;i<20;i++){if(await p.locator('[data-act=next]').isEnabled())await p.click('[data-act=next]')}
 T('dl: safe verdict + released edges fade',(await p.textContent('#stage')).includes('SAFE')&&await p.locator('.eg.gone').count()>0);
 await p.locator('.tab',{hasText:'Detection'}).click();await p.fill('[data-f=avail]','0 0 0');await p.press('[data-f=avail]','Tab');await p.fill('[data-f=alloc]','0 1 0; 2 0 0');await p.press('[data-f=alloc]','Tab');await p.fill('[data-f=req]','1 0 0; 0 0 1');await p.press('[data-f=req]','Tab');
 await p.click('[data-act=play]');await p.waitForTimeout(1500);for(let i=0;i<6;i++){if(await p.locator('[data-act=next]').isEnabled())await p.click('[data-act=next]')}
 T('dl: deadlock verdict + stuck nodes',(await p.textContent('#stage')).includes('DEADLOCK')&&await p.locator('.pn.stuck').count()>=1);
 await p.click('nav [data-go=page]');await p.click('[data-act=next]');await p.click('[data-act=next]');await p.click('[data-act=next]');await p.click('[data-act=next]');await p.click('[data-act=next]');
 T('page: frame shows recency/entry caption',(await p.textContent('.frames')).match(/entered #|last used|next use/)!==null);
 T('page: victim slot highlighted',await p.locator('.slot.victim').count()===1);T('page: faults vs frames line chart',await p.locator('.line').count()===1);
 await p.locator('[data-goto="2"]').first().click();T('page: history click jumps',(await cnt()).startsWith('Step 3'));
 await p.locator('.tab',{hasText:'Optimal'}).click();for(let i=0;i<5;i++)await p.click('[data-act=next]');T('page: optimal reason mentions future use / never',/never used again|farthest/.test(await p.textContent('.note')));
 await p.locator('.tab',{hasText:'FIFO'}).click();await p.click('[data-act=run]');T('toast on run',(await p.textContent('#toast')).includes('Simulation ready'));
 await p.click('nav [data-go=disk]');await p.locator('.tab',{hasText:'FCFS'}).click();for(let i=0;i<2;i++)await p.click('[data-act=next]');
 T('disk: FCFS tab works + step table',await p.locator('table.steps tbody tr').count()===8);T('disk: head marker + trail',await p.locator('.head').count()===1&&await p.locator('.mv').count()===2);
 await p.locator('.tab',{hasText:'C-SCAN'}).click();for(let i=0;i<30;i++){if(await p.locator('[data-act=next]').isEnabled())await p.click('[data-act=next]')}
 T('disk: C-SCAN wraparound row',(await p.textContent('table.steps')).includes('wraparound'));
 // keyboard
 await p.click('[data-act=reset]');await p.focus('body');await p.keyboard.press('ArrowRight');await p.keyboard.press('ArrowRight');T('keyboard: arrows step',(await cnt()).startsWith('Step 2'));await p.keyboard.press('ArrowLeft');T('keyboard: left',(await cnt()).startsWith('Step 1'));await p.keyboard.press('r');T('keyboard: R resets',(await cnt()).startsWith('Step 0'));
 // validation
 await p.click('nav [data-go=page]');await p.fill('[data-f=ref]','1 x 3');await p.press('[data-f=ref]','Tab');T('invalid input: readable error',(await p.textContent('#viz')).includes('Please fix'));
 await p.click('[data-act=sample]');T('sample restores',await p.locator('.frames').count()===1);
 await p.fill('[data-f=nf]','0');await p.press('[data-f=nf]','Tab');T('frames=0 error',(await p.textContent('#viz')).includes('Frames'));await p.click('[data-act=sample]');
 // compare
 await p.click('nav [data-go=cmp]');await p.waitForSelector('.cmpgrid');T('compare: panels',await p.locator('.sub').count()===3);await p.click('[data-cmpmod=disk]');await p.waitForSelector('.cmpgrid svg');T('compare: disk 4 panels',await p.locator('.sub').count()===4);
 await p.click('[data-cmpmod=dl]');T('compare: deadlock note',(await p.textContent('.interp')).includes('Max matrix'));await p.click('[data-cmpmod=cpu]');await p.click('[data-act=next]');T('compare: shared step',(await cnt()).startsWith('Step 1'));
 // dash after runs
 await p.click('nav [data-go=dash]');T('dash: latest simulation insight',(await p.textContent('#body')).includes('Your latest simulation')&&await p.locator('.hist li').count()>=1&&!(await p.textContent('#body')).includes('No simulations yet'));
 await p.click('[data-resume]');T('dash: resume opens module',(await p.textContent('.crumbs')).includes('Page Replacement'));
 // collapse + responsive
 await p.click('[data-fold]');T('sidebar collapses',(await p.locator('.side.min').count())===1);await p.click('[data-fold]');
 await p.screenshot({path:'/tmp/s_page.png'});
 await p.click('nav [data-go=cpu]');for(let i=0;i<4;i++)await p.click('[data-act=next]');await p.screenshot({path:'/tmp/s_cpu.png'});
 await p.click('nav [data-go=dl]');await p.locator('.tab',{hasText:'Banker'}).click();await p.fill('[data-f=avail]','3 3 2');await p.press('[data-f=avail]','Tab');await p.fill('[data-f=alloc]','0 1 0; 2 0 0; 3 0 2; 2 1 1; 0 0 2');await p.press('[data-f=alloc]','Tab');for(let i=0;i<4;i++)await p.click('[data-act=next]');await p.screenshot({path:'/tmp/s_dl.png'});
 await p.click('nav [data-go=disk]');await p.locator('.tab',{hasText:'C-SCAN'}).click();for(let i=0;i<8;i++)await p.click('[data-act=next]');await p.screenshot({path:'/tmp/s_disk.png'});
 await p.click('nav [data-go=dash]');await p.waitForTimeout(500);await p.screenshot({path:'/tmp/s_dash.png'});
 await p.setViewportSize({width:820,height:1000});await p.click('nav [data-go=mem]');T('tablet: no horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await p.setViewportSize({width:420,height:900});await p.click('nav [data-go=file]');T('mobile: no horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 // reduced motion
 const p2=await b.newPage();await p2.emulateMedia({reducedMotion:'reduce'});await p2.goto('http://localhost:5173/');await p2.click('nav [data-go=page]');await p2.click('[data-act=next]');
 T('reduced motion: animations disabled',await p2.evaluate(()=>getComputedStyle(document.querySelector('.ref.on')).animationName==='none'));
 T('no console errors/warnings',errs.length===0);
 console.log('PASS',ok.length,'FAIL',fail.length);fail.forEach(x=>console.log('FAILED:',x));errs.slice(0,5).forEach(x=>console.log('ERR:',x));await b.close();
})().catch(e=>{console.log('LAST OK:',(globalThis.__ok||[]).slice(-3));console.log('SCRIPT ERROR',e.message.split('\n').slice(0,3).join(' | '));process.exit(1)});
