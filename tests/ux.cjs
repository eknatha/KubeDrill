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
await pg.click('[data-t="outages"]');ok(await pg.locator('.fg-out').count()===3,'3 outage explainers');
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
await pg.setViewportSize({width:390,height:800});await pg.goto(BASE+'#field');await pg.waitForTimeout(300);
ok(await pg.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'field guide no overflow on mobile');
await pg.screenshot({path:'/tmp/field-mobile.png'});
console.log('errors:',errs.length,errs.slice(0,3));await b.close();process.exit(bad||errs.length?1:0)})();
