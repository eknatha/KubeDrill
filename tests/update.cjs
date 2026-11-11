// Update flow: a changed sw.js must NOT take over silently; user sees a toast and a click on Reload applies it.
const { chromium } = require('playwright-core'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), swp = path.join(root, 'sw.js'), orig = fs.readFileSync(swp, 'utf8');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const srv = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p === '/') p = '/index.html'; fs.readFile(path.join(root, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }); r.end(d); } }); });
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://localhost:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }), pg = await (await b.newContext()).newPage(); let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log(c ? '✔' : '✘', m); };
  try {
    await pg.goto(base + '#lab/s01-pending-cpu'); await pg.evaluate(() => navigator.serviceWorker.ready); await pg.waitForTimeout(1500);
    const v1 = await pg.evaluate(() => KL.pwa.status().version);
    fs.writeFileSync(swp, orig.replace(/kubelab-[0-9a-f]{10}/g, 'kubelab-0000000002').replace(/'[0-9a-f]{10}'/g, "'0000000002'") + '\n// changed\n');
    await pg.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update())); await pg.waitForTimeout(2500);
    ok(await pg.isVisible('.toast .toast-btn'), 'update toast with Reload button appears');
    ok(await pg.evaluate(() => KL.pwa.status().version) === v1, 'old version still in control before click (no silent takeover)');
    await pg.click('.toast .toast-btn'); await pg.waitForTimeout(3000);
    ok(await pg.evaluate(() => KL.pwa.status().version) !== v1, 'after Reload the new version is active (' + v1 + ' → ' + await pg.evaluate(() => KL.pwa.status().version) + ')');
  } finally { fs.writeFileSync(swp, orig); }
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch(e => { fs.writeFileSync(swp, orig); console.error(e); process.exit(2); });
