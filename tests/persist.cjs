// Session persistence: a lab (and a running exam) must survive a full page reload; offline badge + update flow basics.
const { chromium } = require('playwright-core'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const srv = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p === '/') p = '/index.html'; fs.readFile(path.join(root, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(p)] || 'application/octet-stream' }); r.end(d); } }); });
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://localhost:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }), ctx = await b.newContext({ viewport: { width: 1400, height: 900 } }), pg = await ctx.newPage(), errs = []; let fails = 0;
  pg.on('pageerror', e => errs.push(e.message)); const ok = (c, m) => { if (!c) fails++; console.log(c ? '✔' : '✘', m); };
  const run = async c => { await pg.fill('#lrIn', c); await pg.press('#lrIn', 'Enter'); await pg.waitForTimeout(120); };
  // lab survives reload
  await pg.goto(base + '#lab/s02-imagepull'); await pg.waitForTimeout(500);
  await run('mkdir notes'); await run('echo hello > notes/a.txt'); await run('kubectl set image deployment/web web=nginx:1.25');
  await pg.waitForTimeout(600); await pg.reload(); await pg.waitForTimeout(800);
  let out = await pg.innerText('#lrOut'); ok(out.includes('Session restored'), 'lab shows "Session restored" after reload');
  await run('cat notes/a.txt'); ok((await pg.innerText('#lrOut')).includes('hello'), 'files created before reload still exist');
  await run('kubectl get deploy web -o jsonpath={.spec.template.spec.containers[0].image}'); ok((await pg.innerText('#lrOut')).includes('nginx:1.25'), 'cluster changes survive reload');
  await pg.click('#lrCheck'); await pg.waitForTimeout(150); ok((await pg.innerText('#lrFeedback')).includes('Lab complete') || (await pg.innerText('#lrFeedback')).includes('tasks'), 'check works on restored session');
  // reset wipes
  pg.once('dialog', d => d.accept()); await pg.click('#lrReset'); await pg.waitForTimeout(400); await run('ls notes'); ok(/No such file/.test(await pg.innerText('#lrOut')), 'Reset lab clears the saved session');
  // exam survives reload
  await pg.goto(base + '#exam'); await pg.waitForTimeout(300); await pg.selectOption('#exLen', 'mini'); await pg.click('#exGo'); await pg.waitForSelector('#exFinish'); const ids = await pg.evaluate(() => KL.exam.active.ids.join(','));
  await pg.click('.ex-q'); await pg.waitForTimeout(400); await run('mkdir examwork'); await pg.waitForTimeout(500);
  await pg.reload(); await pg.waitForTimeout(900);
  ok(await pg.evaluate(() => !!KL.exam.active) && await pg.evaluate(() => KL.exam.active.ids.join(',')) === ids, 'running exam restored after reload');
  ok(!(await pg.$('.lr-hints')), 'exam restrictions still applied after reload (no hints)'); await run('ls'); ok((await pg.innerText('#lrOut')).includes('examwork'), 'exam lab work restored');
  // offline badge + storage persistence api
  await pg.goto(base + '#home'); await pg.evaluate(() => navigator.serviceWorker.ready); await pg.waitForTimeout(2500);
  const badge = await pg.evaluate(() => document.getElementById('offBadge').textContent); ok(/Works offline/.test(badge), 'badge says "Works offline" (got: ' + badge + ')');
  await ctx.setOffline(true); await pg.waitForTimeout(300); ok(/Offline/.test(await pg.evaluate(() => document.getElementById('offBadge').textContent)), 'badge switches to Offline');
  await pg.goto(base + '#lab/s05-config-error'); await pg.waitForTimeout(600); await run('kubectl get pods'); ok((await pg.innerText('#lrOut')).includes('NAME'), 'lab works while offline');
  const real = errs.filter(e => !/sw\.js|manifest/.test(e)); real.forEach(e => console.log('ERR', e)); ok(!real.length, 'no page errors');
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
