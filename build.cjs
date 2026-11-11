// Builds dist/kubelab-offline.html — ONE self-contained file (css, js, fonts, icon inlined). Open it from disk, no server needed.
const fs = require('fs'), path = require('path'), root = __dirname, rd = f => fs.readFileSync(path.join(root, f));
let html = rd('index.html').toString();
const safeJs = s => s.replace(/<\/script/gi, '<\\/script');
// fonts
let fonts = rd('fonts/fonts.css').toString().replace(/url\((['"]?)([^)'"]+\.woff2)\1\)/g, (m, q, u) => 'url(data:font/woff2;base64,' + rd(path.join('fonts', u)).toString('base64') + ')');
html = html.replace('<link rel="stylesheet" href="fonts/fonts.css">', () => '<style>' + fonts + '</style>');
html = html.replace('<link rel="stylesheet" href="assets/css/extra.css">', () => '<style>' + rd('assets/css/extra.css') + '</style>');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => '<script>/* ' + src + ' */\n' + safeJs(rd(src).toString()) + '\n</script>');
html = html.replace(/<link rel="manifest"[^>]*>\n?/, '').replace(/<link rel="apple-touch-icon"[^>]*>\n?/, '').replace(/<link rel="icon"[^>]*>/, () => '<link rel="icon" href="data:image/svg+xml;base64,' + rd('icons/icon.svg').toString('base64') + '">');
html = html.replace('<body>', '<body data-build="offline-single-file">');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true }); fs.writeFileSync(path.join(root, 'dist/kubelab-offline.html'), html);
console.log('dist/kubelab-offline.html', (html.length / 1024).toFixed(0) + ' KB', 'external refs left:', (html.match(/(src|href)="(?!#|data:|https?:|mailto:)[^"]+"/g) || []).length);
