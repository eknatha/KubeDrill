// Headless smoke: loads every page, drives the lab runner/quiz/exam/palette, fails on console errors.
const { chromium } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(root, p); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://localhost:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const pg = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage(); const errs = [];
  pg.on('pageerror', e => errs.push('pageerror: ' + e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✘', m); } else console.log('✔', m); };
  await pg.goto(base); await pg.waitForTimeout(600);
  ok(await pg.evaluate(() => document.querySelectorAll('.module-card').length) === 19, '19 module cards');
  ok(await pg.evaluate(() => KL.quizAll.length) >= 300, 'quiz >= 300: ' + await pg.evaluate(() => KL.quizAll.length));
  for (const p of ['modules', 'path', 'labs', 'exam', 'quiz', 'visualize', 'cheatsheet', 'tools', 'errors', 'progress', 'compare']) { await pg.goto(base + '#' + p); await pg.waitForTimeout(250); ok(await pg.evaluate(n => document.getElementById('page-' + n).classList.contains('active') && document.getElementById('page-' + n).innerText.length > 80, p), 'page #' + p + ' renders'); }
  // labs
  await pg.goto(base + '#labs'); await pg.waitForTimeout(200);
  ok(await pg.evaluate(() => document.querySelectorAll('.ilab-card').length === KL.Labs.list.length), 'a card for every lab');
  // runner
  await pg.goto(base + '#lab/s02-imagepull'); await pg.waitForTimeout(300);
  const run = async c => { await pg.fill('#lrIn', c); await pg.press('#lrIn', 'Enter'); await pg.waitForTimeout(150); if (await pg.locator('.br-pop').count()) await pg.keyboard.press('Enter'); await pg.waitForTimeout(80); };
  await run('kubectl get pods'); ok((await pg.innerText('#lrOut')).includes('ImagePullBackOff') || (await pg.innerText('#lrOut')).includes('ErrImagePull'), 'runner shows broken pods');
  await pg.click('#lrCheck'); ok((await pg.innerText('#lrFeedback')).includes('Still failing'), 'check fails before fix');
  await run('kubectl set image deployment/web web=nginx:1.25'); await pg.click('#lrWait'); await pg.waitForTimeout(100); await pg.click('#lrCheck');
  ok((await pg.innerText('#lrFeedback')).includes('Lab complete'), 'check passes after fix');
  await run('cat > a.yaml <<EOF'); await run('x: 1'); await run('EOF'); await run('cat a.yaml'); ok((await pg.innerText('#lrOut')).includes('x: 1'), 'heredoc multi-line in terminal');
  await run('vi a.yaml'); ok(await pg.isVisible('#lrEditor'), 'editor opens'); await pg.keyboard.press('Escape');
  // quiz
  await pg.goto(base + '#quiz'); await pg.waitForTimeout(300);
  for (let i = 0; i < 3; i++) { const t = await pg.evaluate(() => document.querySelector('.quiz-meta').innerText); if (await pg.$('.quiz-opt')) await pg.click('.quiz-opt'); else if (await pg.$('#qcmd')) { await pg.waitForTimeout(150); await pg.fill('#qcmd', 'kubectl get pods'); await pg.press('#qcmd', 'Enter'); } else { const n = await pg.evaluate(() => document.querySelectorAll('.qo-item').length); for (let j = 0; j < n; j++) await pg.click('.qo-item'); await pg.click('#qoGo'); } await pg.waitForSelector('#quizExplain', { state: 'visible', timeout: 3000 }).catch(() => {}); ok(await pg.isVisible('#quizExplain'), 'quiz answer ' + (i + 1) + ' (' + t.split('\n')[0].slice(0, 12) + ') shows explanation'); await pg.click('#quizNext'); }
  // exam
  await pg.goto(base + '#exam'); await pg.waitForTimeout(200); await pg.selectOption('#exLen', 'mini'); await pg.click('#exGo'); await pg.waitForTimeout(300);
  ok(await pg.isVisible('#exFinish'), 'exam started'); await pg.click('.ex-q'); await pg.waitForTimeout(300); ok(!(await pg.$('.lr-hints')) && !(await pg.$('.lr-sol')), 'exam hides hints/solution');
  await pg.goto(base + '#exam'); await pg.waitForTimeout(200); pg.once('dialog', d => d.accept()); await pg.click('#exFinish'); await pg.waitForTimeout(300); ok(await pg.isVisible('.ex-score'), 'exam scored');
  // visualize
  await pg.goto(base + '#visualize'); await pg.waitForTimeout(300); for (const t of ['life', 'ru', 'np', 'cp']) { await pg.click('.an-tab[data-t=' + t + ']'); await pg.click('#anNext'); await pg.waitForTimeout(80); } ok(true, 'animations step');
  // palette
  await pg.goto(base); await pg.keyboard.press('Control+k'); await pg.fill('#palIn', 'oomkilled'); await pg.waitForTimeout(100); ok((await pg.innerText('#palList')).toLowerCase().includes('oom'), 'palette finds OOMKilled'); await pg.keyboard.press('Escape');
  // theme + progress
  const th0 = await pg.evaluate(() => document.documentElement.dataset.theme); await pg.click('#themeBtn'); ok(await pg.evaluate(() => document.documentElement.dataset.theme) !== th0, 'theme toggles');
  await pg.goto(base + '#progress'); await pg.waitForTimeout(200); ok((await pg.innerText('#progressRoot')).includes('interactive labs'), 'progress shows stats');
  // mobile
  await pg.setViewportSize({ width: 390, height: 800 }); await pg.goto(base + '#lab/s01-pending-cpu'); await pg.waitForTimeout(300);
  ok(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'no horizontal overflow on mobile lab page');
  await pg.goto(base); await pg.waitForTimeout(300); ok(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'no horizontal overflow on mobile home');
  const real = errs.filter(e => !/manifest|sw\.js|favicon|icon|404/.test(e)); real.forEach(e => console.log('ERR', e)); ok(real.length === 0, 'no console errors (' + real.length + ')');
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
