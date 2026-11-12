const {chromium}=require('playwright-core');const BASE='file://'+require('path').resolve(__dirname,'..','index.html');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:1300,height:850}});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));
let bad=0;const ok=(c,m)=>{console.log(c?'✔':'✘',m);if(!c)bad++};
const run=async(c)=>{await pg.fill('#lrIn',c);await pg.press('#lrIn','Enter');await pg.waitForTimeout(150);if(await pg.locator('.br-pop').count())await pg.press('#lrIn','Enter');await pg.waitForTimeout(250)};
const open=async(id)=>{await pg.goto(BASE+'#lab/'+id);await pg.waitForSelector('#lrIn');await pg.waitForTimeout(500)};
await pg.goto(BASE);await pg.waitForTimeout(800);
await pg.evaluate(()=>{try{localStorage.clear()}catch(e){}});

// ── terminal quality ──
await open('s97-pv-retain');
ok(await pg.locator('#proTmBtn').count()===1&&await pg.locator('#proPredBtn').count()===1&&await pg.locator('#proExBtn').count()===1,'toolbar: time machine, predict, explain');
await pg.fill('#lrIn','kubectl describe pv pv-r');await pg.press('#lrIn','Tab');ok((await pg.inputValue('#lrIn')).trim()==='kubectl describe pv pv-reports','Tab completes a PV name from the cluster');
await pg.fill('#lrIn','kubectl get pods -n st');await pg.press('#lrIn','Tab');ok((await pg.inputValue('#lrIn')).trim()==='kubectl get pods -n store','Tab completes a namespace after -n');
await pg.fill('#lrIn','kubectl rollout st');await pg.press('#lrIn','Tab');ok((await pg.inputValue('#lrIn')).trim()==='kubectl rollout status','Tab completes subcommands');
await pg.fill('#lrIn','');await run('kubectl get sc');await run('kubectl get pv');
await pg.press('#lrIn','Control+r');ok(await pg.locator('.pro-rs').count()===1,'Ctrl-R opens reverse search');
await pg.keyboard.type('sc');ok((await pg.locator('.pro-rs').innerText()).includes('kubectl get sc'),'Ctrl-R finds a previous command');
await pg.keyboard.press('Enter');ok((await pg.inputValue('#lrIn'))==='kubectl get sc'&&await pg.locator('.pro-rs').count()===0,'Enter puts the match in the prompt');
await pg.fill('#lrIn','kubectl get pods --all-namespaces');await pg.press('#lrIn','Control+u');ok((await pg.inputValue('#lrIn'))==='','Ctrl-U clears the line');
ok(await pg.evaluate(()=>KL.runner.cur().sim.env.do==='--dry-run=client -o yaml'),'$do preloaded like the exam image');
await run('kubectl create deployment zz --image=nginx $do');ok((await pg.locator('#lrOut').innerText()).includes('kind: Deployment'),'$do expands to --dry-run=client -o yaml');

// ── time machine ──
const cnt0=await pg.evaluate(()=>KL.runner.cur().tm.snaps.length);
await run('kubectl patch pv pv-reports -p \'{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}\'');
ok(await pg.evaluate(()=>KL.runner.cur().tm.snaps.length)===cnt0+1,'a changing command takes a snapshot; read-only ones do not');
const pol=()=>pg.evaluate(()=>KL.runner.cur().sim.get('PersistentVolume','','pv-reports').spec.persistentVolumeReclaimPolicy);
ok(await pol()==='Retain','patch applied');
await pg.click('#proTmBtn');await pg.waitForSelector('#proTm .pro-steps li');
ok(await pg.locator('#proTm .pro-steps li').count()===cnt0+1,'timeline lists every step');
await pg.click('#proTm .pro-steps li[data-i="0"]');ok((await pg.locator('.pro-diff').innerText()).includes('revert'),'diff preview says what would be reverted');
await pg.click('#proTmGo');await pg.waitForTimeout(300);ok(await pol()==='Delete','rewind restores the old cluster state');
ok(await pg.locator('#proTmFwd').count()===1,'return-to-where-I-was is offered');
await pg.click('#proTmFwd');await pg.waitForTimeout(200);ok(await pol()==='Retain','return restores the later state');
await pg.click('#proTmX');await pg.focus('#lrIn');await pg.press('#lrIn','Control+z');await pg.waitForTimeout(250);ok(await pol()==='Delete','Ctrl-Z undoes the last change');
await pg.click('#proTmBtn');await pg.click('#proTm [data-tab="cmp"]');ok((await pg.locator('#proTm').innerText()).includes('Finish the lab'),'path comparison is locked until the lab is done');
await pg.click('#proTmX');

// ── scheduler explainer ──
await open('s01-pending-cpu');
await pg.click('#proExBtn');await pg.waitForSelector('#proSchedOut .pro-tab');
const st=await pg.locator('#proSchedOut').innerText();
ok(/Pending/.test(st)&&/0\/\d nodes are available/.test(st),'explains a Pending pod with the scheduler message');
ok(await pg.locator('#proSchedOut .pro-tab td.no').count()>0&&await pg.locator('#proSchedOut .pro-funnel').count()===1,'shows failing filters and the funnel');
ok(await pg.locator('#proSchedOut .pro-fixes').count()===1,'offers ways to fix');
ok(await pg.locator('#proExBtn .pro-badge:not([hidden])').count()===1,'Explain button badges pending pods');
await pg.click('#proExX');

// ── network tracer ──
await open('s110-default-deny');
await pg.evaluate(()=>{const r=KL.runner.cur();r.sim.exec(r.lab.solution[0]);r.sim.settle(20);KL.runner.refresh()});
await pg.click('#proExBtn');await pg.click('#proEx [data-tab="net"]');await pg.waitForSelector('#proNetOut .pro-hops');
await pg.selectOption('#proNetFrom','zt/intruder');await pg.fill('#proNetTo','db:80');await pg.click('#proNetGo');await pg.waitForTimeout(300);
let nt=await pg.locator('#proNetOut').innerText();ok(/Blocked at/.test(nt)&&/default-deny|Egress policy/.test(nt),'intruder is blocked and the policy is named');
await pg.selectOption('#proNetFrom','zt/frontend');await pg.click('#proNetGo');await pg.waitForTimeout(300);
nt=await pg.locator('#proNetOut').innerText();ok(/Connection works/.test(nt)&&/frontend-to-db|db-from-frontend/.test(nt),'frontend reaches db and the allowing policies are named');
await pg.fill('#proNetTo','nope:80');await pg.click('#proNetGo');await pg.waitForTimeout(300);ok(/does not resolve/.test(await pg.locator('#proNetOut').innerText()),'DNS failure explained');
await pg.click('#proExX');

// ── alert-first pager ──
const incId=await pg.evaluate(()=>KL.Labs.list.filter(l=>l.incident)[0].id);
await open(incId);
ok(await pg.locator('.pager').count()===1&&/FIRING/.test(await pg.locator('.pager').innerText()),'incident lab opens on a firing alert');
ok(await pg.locator('.pager svg path.pg-line').count()===1&&await pg.locator('.pager .pg-logs').count()===1,'alert has a graph and live logs');
ok(await pg.locator('.pager-story').count()===1,'story is collapsed behind the alert');
await pg.click('#pgAck');ok(/Acknowledged/.test(await pg.locator('.pager').innerText()),'page can be acknowledged (MTTA)');
await pg.evaluate(()=>{const r=KL.runner.cur();r.lab.solution.forEach(c=>r.sim.exec(c));r.sim.settle(60)});await pg.click('#lrCheck');await pg.waitForTimeout(2600);
ok(/RESOLVED/.test(await pg.locator('.pager').innerText()),'alert resolves when the lab is fixed');

// ── predict the output ──
await open('s107-rolling-strategy');
await pg.click('#proPredBtn');
await pg.fill('#lrIn','kubectl scale deployment api -n rolls --replicas=6');await pg.press('#lrIn','Enter');await pg.waitForTimeout(200);if(await pg.locator('.br-pop').count())await pg.press('#lrIn','Enter');await pg.waitForSelector('.pro-pq');
ok(await pg.locator('.pro-pqo button').count()>=3,'asks how many pods will be Ready');
await pg.click('.pro-pqo button >> nth=0');await pg.waitForTimeout(400);
ok(/You predicted/.test(await pg.locator('#lrOut').innerText()),'reveals prediction vs outcome');
ok(await pg.evaluate(()=>KL.runner.cur().sim.get('Deployment','rolls','api').spec.replicas)===6,'command still ran');

// ── fidelity ──
await pg.goto(BASE+'#fidelity');await pg.waitForSelector('.fid-tab');
const tot=await pg.evaluate(()=>KL.Labs.list.length),sum=await pg.evaluate(()=>[...document.querySelectorAll('.fid-tier b')].reduce((a,e)=>a+ +e.textContent,0));
ok(sum===tot,'fidelity tiers add up to all '+tot+' labs');ok(await pg.locator('.fid-area').count()>=8,'coverage matrix lists areas incl. not modelled');
ok((await pg.locator('.fid-areas').innerText()).includes('RuntimeClass'),'page names what is NOT modelled');
await pg.click('#fidTier [data-v="script"]');ok(await pg.locator('.fid-tab tbody tr').count()<tot,'tier filter works');
await pg.goto(BASE+'#labs');await pg.waitForTimeout(400);ok(await pg.locator('.ilab-card .fid').count()===tot,'every lab card carries a fidelity badge');
await open('s97-pv-retain');await pg.waitForTimeout(300);ok(await pg.locator('.lr-chips .fid').count()===1,'runner shows the fidelity badge');

// ── exam realism ──
await pg.goto(BASE+'#exam');await pg.waitForTimeout(300);
ok(await pg.locator('.ex-b[data-b="cka-curr"]').count()===1&&await pg.locator('.ex-b[data-b="cks-curr"]').count()===1,'curriculum-weighted mocks offered');
await pg.locator('#exEnv').uncheck();await pg.click('.ex-b[data-b="cka-curr"]');await pg.waitForSelector('.ex-bar');
await pg.click('.ex-q >> nth=0');await pg.waitForSelector('#lrIn');await pg.waitForTimeout(600);
ok(await pg.locator('.ex-nav a').count()>=4,'exam runner has a question navigator');
ok(await pg.locator('#proTmBtn').count()===0&&await pg.locator('#proExBtn').count()===0&&await pg.locator('.pager').count()===0,'no time machine, explainers or alerts during an exam');
for(const c of ['kubectl get pods -A','kubectl get nodes','kubectl get svc -A','kubectl get pvc -A','kubectl get deploy -A','kubectl get ns','kubectl get pods','kubectl get sc'])await run(c);
await pg.evaluate(()=>KL.exam.finish());await pg.goto(BASE+'#exam');await pg.waitForSelector('.ex-result');
ok(await pg.locator('.ex-coach li').count()>=1,'speed coach is shown after the exam');
ok((await pg.locator('.ex-dom').innerText()).includes('exam weight'),'domain report shows official curriculum weights');

// ── mobile toolbar ──
const mctx=await b.newContext({viewport:{width:390,height:800},hasTouch:true,isMobile:true});const mp=await mctx.newPage();mp.on('pageerror',e=>errs.push(e.message));
await mp.goto(BASE+'#lab/s97-pv-retain');await mp.waitForSelector('.lr-mtabs');await mp.waitForTimeout(600);await mp.click('.lr-mtabs [data-m="term"]');await mp.waitForTimeout(300);
ok(await mp.locator('.pro-keys').isVisible(),'mobile key toolbar visible on a phone');
await mp.locator('.pro-keys .pk.wide').dispatchEvent('pointerdown');await mp.locator('.pro-keys .pk[data-k="|"]').dispatchEvent('pointerdown');
ok((await mp.inputValue('#lrIn'))==='kubectl |','toolbar inserts text at the cursor');
await mp.fill('#lrIn','kubectl get sc');await mp.locator('.pro-keys .pk[data-k="Enter"]').dispatchEvent('pointerdown');await mp.waitForTimeout(300);ok((await mp.locator('#lrOut').innerText()).includes('fast'),'toolbar Enter runs the command');
await mp.fill('#lrIn','kubectl describe pv pv-r');await mp.locator('.pro-keys .pk[data-k="Tab"]').dispatchEvent('pointerdown');ok((await mp.inputValue('#lrIn')).includes('pv-reports'),'toolbar Tab completes');
const ov=await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);ok(ov,'no horizontal overflow on mobile lab');
ok(errs.length===0,'no console errors '+JSON.stringify(errs.slice(0,3)));
await b.close();console.log(bad?bad+' FAILED':'pro OK');process.exit(bad?1:0)})();
