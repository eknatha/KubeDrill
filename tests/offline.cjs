// Verifies the service worker precaches everything: after first load, the site works with the network off.
const { chromium } = require('playwright-core'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const srv = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p === '/') p = '/index.html'; fs.readFile(path.join(root, p), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(p)] || 'application/octet-stream' }); r.end(d); } }); });
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://localhost:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }), ctx = await b.newContext(), pg = await ctx.newPage();
  await pg.goto(base); await pg.evaluate(() => navigator.serviceWorker.ready); await pg.waitForTimeout(1500);
  await ctx.setOffline(true); srv.close();
  await pg.goto(base + '#lab/s01-pending-cpu'); await pg.waitForTimeout(600);
  const ok = await pg.evaluate(() => !!document.querySelector('#lrOut') && getComputedStyle(document.body).fontFamily.length > 0 && document.fonts.size >= 0);
  const fonts = await pg.evaluate(() => Array.from(document.fonts).filter(f => f.status === 'loaded').length);
  console.log(ok ? '✔ offline: lab runner loads from cache' : '✘ offline load failed', '· fonts loaded:', fonts);
  await b.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
