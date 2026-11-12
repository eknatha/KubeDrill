const {chromium}=require('playwright-core');const BASE='file://'+require('path').resolve(__dirname,'..','index.html');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const pg=await b.newPage({viewport:{width:1300,height:850}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));
let bad=0;const ok=(c,m)=>{console.log(c?'✔':'✘',m);if(!c)bad++};
const run=async c=>{await pg.fill('#lrIn',c);await pg.press('#lrIn','Enter');await pg.waitForTimeout(150)};
await pg.goto(BASE);await pg.waitForTimeout(700);
// home
ok(await pg.locator('.aurora i').count()===3,'aurora blobs present');
ok(await pg.locator('.hero-mq span').count()===16,'command marquee');
ok(await pg.locator('#homeFree .gate .g1').count()===1&&await pg.locator('#homeFree .gate .g2').count()===1,'no-paywall gate card pair');
ok((await pg.locator('#page-home .free-top .lead').innerText()).includes('payment gateway'),'free section mentions no payment gateway');
ok(await pg.locator('.pledge-grid .u3-card').count()===4,'promise cards x4');
// motion off hides gate loop
await pg.evaluate(()=>{localStorage.setItem('kl.motion','off');document.documentElement.setAttribute('data-motion','off')});
ok(await pg.evaluate(()=>getComputedStyle(document.querySelector('.gate .g1')).display)==='none','motion off: gate shows the open state only');
await pg.evaluate(()=>{localStorage.removeItem('kl.motion');document.documentElement.setAttribute('data-motion','on')});
// why
await pg.goto(BASE+'#why');await pg.waitForTimeout(300);ok(await pg.locator('.why-row').count()===7,'why table: header + 6 rows');
ok((await pg.locator('#page-why').innerText()).includes('not any one product'),'why page generic disclaimer');
// settings
await pg.goto(BASE+'#settings');await pg.waitForTimeout(300);ok(await pg.locator('#setTheme button').count()===3,'settings theme');
await pg.click('#setTheme [data-v="light"]');ok(await pg.evaluate(()=>document.documentElement.dataset.theme)==='light','theme -> light');
await pg.click('#setTheme [data-v="dark"]');
await pg.click('#setMotion [data-v="off"]');ok(await pg.evaluate(()=>document.documentElement.getAttribute('data-motion'))==='off','motion -> off');
await pg.click('#setMotion [data-v="on"]');ok(await pg.evaluate(()=>document.documentElement.getAttribute('data-motion'))==='on','motion -> on');
await pg.selectOption('#setSkin','matrix');ok(await pg.evaluate(()=>localStorage.getItem('kl.skin'))==='matrix','skin saved');
await pg.selectOption('#setSkin','default');
const [dl]=await Promise.all([pg.waitForEvent('download'),pg.click('#setBackup')]);ok(/kubedrill-progress-.*\.json/.test(dl.suggestedFilename()),'backup downloads json');
await pg.evaluate(()=>KL.store.markLab('s01-pending-cpu',true));await pg.goto(BASE+'#settings');await pg.waitForTimeout(200);
pg.once('dialog',d=>d.accept());await pg.click('#setClear');await pg.waitForTimeout(200);ok(await pg.evaluate(()=>KL.store.labDone('s01-pending-cpu'))===false,'clear progress works');
ok((await pg.locator('#page-settings').innerText()).includes('Never paste real kubeconfigs'),'credential caution shown');
// palette
await pg.keyboard.press('Control+k');await pg.fill('#palIn','settings');ok((await pg.locator('.pal li').allInnerTexts()).join(' ').includes('Settings and privacy'),'palette finds Settings');await pg.keyboard.press('Escape');
// break
await pg.goto(BASE+'#break/0003');await pg.waitForTimeout(400);
const t1=await pg.locator('.brk-info').innerText();
await pg.goto(BASE+'#break/0003');await pg.waitForTimeout(300);ok((await pg.locator('.brk-info').innerText())===t1,'same seed -> same challenge');
ok(await pg.locator('#brkStart').count()===1&&(await pg.locator('#brkUrl').innerText()).includes('#break/0003'),'share url has only the seed');
const labId=await pg.evaluate(()=>{const L=KL.Labs.list;return L[parseInt('0003',16)%L.length].id});
await pg.click('#brkStart');await pg.waitForSelector('#brkPill',{timeout:8000});ok(true,'challenge pill shown in lab');
ok((await pg.evaluate(()=>location.hash))==='#lab/'+labId,'start opens the lab for the seed');
await pg.waitForTimeout(1500);ok(/^\d\d:\d\d$/.test(await pg.locator('#brkPill b').innerText()),'pill counts down');
// solve via lab solution if available
const sol=await pg.evaluate((id)=>{const l=KL.Labs.byId[id];return {n:l.tasks.length}},labId);ok(sol.n>0,'lab has tasks: '+sol.n);
await pg.evaluate(()=>window.dispatchEvent(new CustomEvent('kl:labdone',{detail:{lab:KL.Labs.byId[JSON.parse(sessionStorage.getItem('kl.break.active')).id]}})));
await pg.waitForTimeout(200);ok(await pg.locator('#brkPill').count()===0,'pill removed after completion');
ok(JSON.parse(await pg.evaluate(()=>localStorage.getItem('kl.break'))).runs['0003'].length===1,'time recorded locally');
await pg.goto(BASE+'#break/0003');await pg.waitForTimeout(300);ok(await pg.locator('.brk-bars .bar').count()===3,'times chart has 3 bars');
await pg.goto(BASE+'#break');await pg.waitForTimeout(300);ok(/#break\/[0-9a-f]{4}/.test(await pg.evaluate(()=>location.hash)),'bare #break gets a seed');
// war room (incident lab)
await pg.goto(BASE+'#lab/s91-black-friday');await pg.waitForTimeout(300);
const inc=await pg.evaluate(()=>KL.Labs.list.filter(l=>l.incident).map(l=>l.id));ok(inc.length>=6,'incident labs: '+inc.length);
await pg.goto(BASE+'#lab/'+inc[0]);await pg.waitForSelector('.war',{timeout:6000});ok(await pg.locator('.war .sev').count()===1,'war room banner on incident lab');
ok(await pg.locator('.war-run span').count()===4,'runbook 4 steps');
await run('kubectl get pods -A');await pg.waitForTimeout(1200);ok(await pg.locator('.war-run span.done').count()>=1,'runbook step 1 ticks after a command');
await pg.waitForTimeout(1200);ok(await pg.locator('.war-health .h').count()>=1,'service health bars');
ok(/^\d\d:\d\d$/.test(await pg.locator('.war .clk').innerText()),'incident clock');
// non-incident lab has no war room
await pg.goto(BASE+'#lab/s01-pending-cpu');await pg.waitForSelector('#lrIn');await pg.waitForTimeout(800);ok(await pg.locator('.war').count()===0,'no war room on normal lab');
// canvas
await pg.click('#lrTabCvs');await pg.waitForTimeout(900);ok(await pg.locator('#lrCvs svg').count()===1,'canvas renders svg');
ok(await pg.locator('#lrCvs svg rect[rx="12"]').count()>=1,'canvas draws pods');
ok(await pg.locator('#lrDia').isHidden(),'diagram hidden while canvas on');
await pg.click('#lrTabDia');ok(await pg.locator('#lrCvs').isHidden()&&await pg.locator('#lrDia').isVisible(),'switching back to diagram');
await pg.click('#lrTabCvs');await pg.waitForTimeout(600);
await run('kubectl get nodes');
ok(await pg.locator('#lrCvs .cvs-key').count()===1,'canvas legend');
await pg.evaluate(()=>{localStorage.setItem('kl.motion','off');document.documentElement.setAttribute('data-motion','off')});await pg.waitForTimeout(1500);
ok(await pg.locator('#lrCvs animateMotion').count()===0,'motion off: no travelling dots');
// light theme must stay readable (regression: dark surface under dark text)
await pg.evaluate(()=>{localStorage.setItem('kubelab:theme','light');document.documentElement.dataset.theme='light'});
const ratio=(sel)=>pg.evaluate((sel)=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};const L=c=>{const m=c.match(/[\d.]+/g).map(Number);return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])};
 const e=document.querySelector(sel);let n=e,bg='rgba(0, 0, 0, 0)';while(n&&bg==='rgba(0, 0, 0, 0)'){bg=getComputedStyle(n).backgroundColor;n=n.parentElement}
 const a=L(getComputedStyle(e).color),b=L(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)},sel);
for(const h of ['#labs','#settings','#why','#break/0003']){await pg.goto(BASE+h);await pg.waitForTimeout(900);const r=await ratio('.page.active .section-title');ok(r>=4.5,'light theme contrast '+h+': '+r.toFixed(1))}
await pg.goto(BASE+'#lab/s01-pending-cpu');await pg.waitForSelector('#lrIn');await pg.waitForTimeout(800);
{const r=await ratio('.lr-story');ok(r>=4.5,'light theme contrast in lab story: '+r.toFixed(1))}
await pg.evaluate(()=>{localStorage.removeItem('kubelab:theme');document.documentElement.dataset.theme='dark'});
console.log('errors:',errs.length,errs.slice(0,3));if(errs.length)bad++;
await b.close();console.log(bad?'FAILED '+bad:'ALL OK');process.exit(bad?1:0)})();
