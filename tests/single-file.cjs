// dist/kubedrill-offline.html must work from file:// with zero network requests.
const { chromium } = require('playwright-core'); const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }), pg = await b.newPage({ viewport: { width: 1300, height: 900 } }), errs = [], net = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('request', r => { if (!/^(file|data|blob):/.test(r.url())) net.push(r.url()); });
  await pg.goto('file://' + path.resolve(__dirname, '../dist/kubedrill-offline.html') + '#lab/s02-imagepull'); await pg.waitForTimeout(700);
  await pg.fill('#lrIn', 'kubectl get pods'); await pg.press('#lrIn', 'Enter'); await pg.waitForTimeout(100);
  const out = await pg.innerText('#lrOut'), fonts = await pg.evaluate(() => Array.from(document.fonts).filter(f => f.status === 'loaded').length);
  const ok = /ImagePull|ErrImage/.test(out) && !errs.length && !net.length;
  console.log(ok ? '✔' : '✘', 'single-file build: runner works, fonts loaded =', fonts, ', network requests =', net.length, ', errors =', errs.length); if (net.length) console.log(net); if (errs.length) console.log(errs);
  await b.close(); process.exit(ok ? 0 : 1);
})();
