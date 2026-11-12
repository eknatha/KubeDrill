const {chromium}=require('playwright-core');const BASE='file://'+require('path').resolve(__dirname,'..','index.html');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const pg=await b.newPage({viewport:{width:1300,height:850}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));
let bad=0;const ok=(c,m)=>{console.log(c?'✔':'✘',m);if(!c)bad++};
const run=async c=>{await pg.fill('#lrIn',c);await pg.press('#lrIn','Enter');await pg.waitForTimeout(120)};
// onboarding
await pg.goto(BASE);await pg.waitForTimeout(500);ok(await pg.locator('#obOverlay').count()===0,'onboarding not forced under automation');
await pg.evaluate(()=>KL.onboarding.open(true));ok(await pg.locator('#obOverlay').isVisible(),'onboarding opens on demand');
await pg.click('#obNext');ok(await pg.locator('#obNext').isDisabled(),'step 2 Next locked until a command runs');
await pg.click('.ob-chip[data-c="kubectl get nodes"]');await pg.waitForTimeout(100);ok((await pg.locator('#obOut').innerText()).includes('cp1'),'mini terminal shows nodes');
ok(!(await pg.locator('#obNext').isDisabled()),'Next unlocked after real command');await pg.click('#obNext');
await pg.click('[data-go="#lab/s01-pending-cpu"]');await pg.waitForSelector('#lrIn');ok(await pg.locator('#obOverlay').count()===0,'overlay closes and lab opens');
// layout
await pg.waitForTimeout(400);ok(await pg.locator('.lr-layout button').count()===3,'3 layout buttons');
await pg.click('.lr-layout [data-l="focus"]');ok(await pg.locator('.lr-left').isHidden(),'focus hides instructions');
await pg.click('.lr-layout [data-l="stack"]');ok(await pg.locator('.lr-split.lay-stack').count()===1,'stacked layout');
await pg.click('.lr-layout [data-l="split"]');ok(await pg.locator('.lr-left').isVisible(),'split restores');
await pg.click('.lr-layout [data-l="focus"]');await pg.reload();await pg.waitForSelector('#lrIn');await pg.waitForTimeout(400);ok(await pg.locator('.lr-split.lay-focus').count()===1,'layout persisted across reload');
await pg.click('.lr-layout [data-l="split"]');
// terminal teaching
await pg.fill('#lrIn','kubectl get po -n payments -o wide');await pg.waitForTimeout(100);
const tt=await pg.locator('#lrTeach').innerText();ok(/list resources/.test(tt)&&/namespace/.test(tt)&&/pods/.test(tt),'live explanation: '+tt.replace(/\n/g,' '));
await pg.fill('#lrIn','');await run('kubectl get podz');ok((await pg.locator('.lr-o.hint').allInnerTexts()).join(' ').includes('pods'),'did-you-mean for resource type');
await run('kubctl get pods');ok((await pg.locator('.lr-o.hint').allInnerTexts()).join(' ').includes('kubectl'),'did-you-mean for command');
// failure strip
await pg.goto(BASE+'#labs');await pg.waitForTimeout(400);ok(await pg.locator('.fail-card').count()===5,'failure library strip: 5 cards');
// field guide
await pg.goto(BASE+'#field');await pg.waitForTimeout(300);ok(await pg.locator('.fg-ep').count()===3,'3 story episodes');
await pg.click('[data-t="outages"]');ok(await pg.locator('.fg-out').count()===5,'5 outage explainers');
ok(await pg.locator('.fg-src a[href^="https://"]').count()>=4,'outage sources linked');
await pg.click('[data-t="concepts"]');const s1=await pg.locator('.cp-stage h4').innerText();await pg.click('#cpNext');ok((await pg.locator('.cp-stage h4').innerText())!==s1,'animation steps forward');
await pg.click('#cpPlay');await pg.waitForTimeout(3000);ok((await pg.locator('.cp-n').innerText()).startsWith('2')||(await pg.locator('.cp-n').innerText()).startsWith('3'),'autoplay advances: '+await pg.locator('.cp-n').innerText());
// story banner
await pg.goto(BASE+'#lab/s70-kubelet-down');await pg.waitForSelector('#lrIn');await pg.waitForTimeout(600);ok(await pg.locator('.story-bar').count()===1,'story banner on chapter lab');
// failure sim in UI
ok(await pg.locator('.dia-node.notready').count()===1,'diagram marks NotReady node');
await run('kubectl get nodes');ok((await pg.locator('#lrOut').innerText()).includes('NotReady'),'get nodes shows NotReady');
await run("ssh worker2 'sudo systemctl start kubelet'");await run('kubectl get nodes');await pg.click('#lrCheck');await pg.waitForTimeout(500);
ok((await pg.locator('#lrTasks li.ok').count())>=2,'checker passes node tasks');
await pg.goto(BASE+'#lab/s73-expired-certs');await pg.waitForSelector('#lrIn');await pg.waitForTimeout(500);await run('kubectl get nodes');
ok((await pg.locator('#lrOut').innerText()).includes('x509'),'expired certs block kubectl');

// flowcharts, cautions, skins, diagram
await pg.setViewportSize({width:1280,height:800});await pg.goto(BASE+'#field');await pg.waitForTimeout(300);await pg.click('[data-t="flows"]');
ok(await pg.locator('.fl-opt').count()>=2,'flowchart shows options');
await pg.click('.fl-opt >> nth=0');await pg.click('.fl-opt >> nth=0');await pg.click('.fl-opt >> nth=0');await pg.waitForTimeout(100);
ok(await pg.locator('.fl-card').count()===1,'flowchart walks');
await pg.click('[data-fl="4"]');ok((await pg.locator('.fl-card').innerText()).includes('autoscaler'),'autoscaling flow');
await pg.goto(BASE+'#lab/s74-privileged-hunt');await pg.waitForSelector('#lrIn');await pg.waitForTimeout(700);
ok(await pg.locator('.lr-caution').count()===1,'caution banner');
ok((await pg.locator('.lr-caution').innerText()).includes('real cluster'),'caution text from lab');
await pg.fill('#lrIn','kubectl delete pods --all');await pg.dispatchEvent('#lrIn','input');await pg.waitForTimeout(100);
ok(await pg.locator('#lrTeach .lr-warn').count()===1,'risky command warning');
await pg.fill('#lrIn','');
await pg.evaluate(()=>{const i=document.getElementById('lrIn');const e=new Event('paste',{bubbles:true,cancelable:true});e.clipboardData={getData:()=>'-----BEGIN RSA PRIVATE KEY-----'};i.dispatchEvent(e)});
ok((await pg.locator('#lrTeach').innerText()).includes('private key'),'secret paste blocked');
await pg.selectOption('#lrSkin','matrix');ok(await pg.getAttribute('#lrTerm','data-skin')==='matrix','skin applied');
await pg.click('#lrFsP');ok((await pg.evaluate(()=>document.getElementById('lrTerm').style.fontSize))==='14px','font size up');
await pg.reload();await pg.waitForSelector('#lrIn');await pg.waitForTimeout(700);ok(await pg.getAttribute('#lrTerm','data-skin')==='matrix','skin persists');
await pg.goto(BASE+'#lab/s84-service-ladder');await pg.waitForSelector('.dia-svc');await pg.waitForTimeout(500);await pg.dispatchEvent('.dia-svc >> nth=0','mouseover');await pg.waitForTimeout(200);ok(await pg.locator('.dia-trace').count()===1,'service trace shown');

// animations, ghost typing, tour
await pg.goto(BASE+'#lab/s84-service-ladder');await pg.waitForSelector('.dia-svc');await pg.waitForTimeout(800);
ok(await pg.locator('.dia-chain').count()===1,'controller chain strip');
ok(await pg.locator('.dia-svc .dia-epbar').count()>=1,'endpoint bar on service');
await pg.fill('#lrIn','kubectl scale deploy --replicas=2 x');await pg.press('#lrIn','Enter');await pg.waitForTimeout(150);
ok(await pg.locator('.dia-chain span.on').count()>=1,'chain pulses on mutating command');
await pg.evaluate(()=>window.KL.ghostType('kubectl get pods -A'));await pg.waitForTimeout(1200);
ok((await pg.inputValue('#lrIn'))==='kubectl get pods -A','ghost typing types the command');
await pg.press('#lrIn','Enter');await pg.waitForTimeout(200);
await pg.dispatchEvent('.dia-svc >> nth=0','mouseover');await pg.waitForTimeout(250);ok(await pg.locator('.dia-trace').count()===1&&await pg.locator('.dia-lines').count()===1,'service trace + traffic layer');
await pg.click('#lrTourBtn');await pg.waitForSelector('.tour-card');ok(await pg.locator('.tour-hole').count()===1,'tour spotlight');
const t1=await pg.locator('.tour-card h4').innerText();await pg.click('#tourNext');await pg.waitForTimeout(450);ok((await pg.locator('.tour-card h4').innerText())!==t1,'tour advances');
await pg.keyboard.press('Escape');await pg.waitForTimeout(100);ok(await pg.locator('.tour-card').count()===0,'tour closes on Esc');
await pg.click('#lrMotion');ok(await pg.getAttribute('html','data-motion')==='off','motion toggle off');await pg.click('#lrMotion');
await pg.goto(BASE+'#field');await pg.waitForTimeout(1200);ok(await pg.locator('#fgUiTour').count()===1,'field guide UI tour button');

// unified UI: hero, palette, labs states, progress, mobile tabs
await pg.setViewportSize({width:1280,height:800});await pg.goto(BASE+'#home');await pg.waitForTimeout(500);
ok(await pg.locator('.hero-grid .hero-terminal').count()===1,'split hero: terminal beside copy');ok(await pg.locator('.hero-proof span').count()===3,'proof chips');
await pg.keyboard.press('Control+k');await pg.waitForSelector('#palIn');await pg.fill('#palIn','monzo');await pg.waitForTimeout(100);
ok((await pg.locator('.pal li').count())===1,'palette filters outages');await pg.keyboard.press('Enter');await pg.waitForTimeout(500);
ok(pg.url().endsWith('#field'),'palette navigates');ok(await pg.locator('.pal').count()===0,'palette closes');
await pg.keyboard.press('Control+k');await pg.fill('#palIn','s84');await pg.keyboard.press('Enter');await pg.waitForTimeout(500);ok(/#lab\/s84/.test(pg.url()),'palette opens a lab');
await pg.goto(BASE+'#labs');await pg.waitForTimeout(600);ok(await pg.locator('.ilab-tag.inc').count()>=1,'incident tag on labs');
await pg.goto(BASE+'#progress');await pg.waitForTimeout(500);ok(await pg.locator('.pg-ring').count()===1,'progress ring');
const [dl]=await Promise.all([pg.waitForEvent('download'),pg.click('#pgShare')]);ok(dl.suggestedFilename()==='kubedrill-progress.png','share card downloads');
await pg.setViewportSize({width:390,height:800});await pg.goto(BASE+'#lab/s84-service-ladder');await pg.waitForSelector('.lr-mtabs');await pg.waitForTimeout(500);
ok(await pg.locator('.lr-mtabs').isVisible(),'mobile tabs visible');ok(await pg.locator('.lr-left').isVisible(),'mobile tasks shown first');
await pg.click('.lr-mtabs [data-m="term"]');ok(!(await pg.locator('.lr-left').isVisible())&&await pg.locator('#lrTerm').isVisible(),'mobile terminal tab');
await pg.click('.lr-mtabs [data-m="dia"]');ok(await pg.locator('.lr-state').isVisible(),'mobile cluster tab');
await pg.setViewportSize({width:1280,height:800});
await pg.setViewportSize({width:390,height:800});await pg.goto(BASE+'#field');await pg.waitForTimeout(300);
ok(await pg.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'field guide no overflow on mobile');
await pg.screenshot({path:'/tmp/field-mobile.png'});
console.log('errors:',errs.length,errs.slice(0,3));await b.close();process.exit(bad||errs.length?1:0)})();
