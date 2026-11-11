/* Cautions, terminal skins, troubleshooting flowcharts, diagram traffic/pending/ingress helpers. Local only. */
(function () {
  'use strict';
  var KL = window.KL, Labs = KL.Labs || window.Labs;
  function $(i) { return document.getElementById(i); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} }
  function code(s) { return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>'); }
  function curLab() { var m = location.hash.match(/^#lab\/([^/?]+)/); return m ? (Labs || window.Labs).byId[m[1]] : null; }

  // ── cautions ──
  var DATA_NOTE = 'Use placeholder values only. Never paste real passwords, tokens, kubeconfigs or private keys here. Your progress is stored in this browser, unencrypted, and is cleared with your browser data.';
  function cautionBanner() {
    var lab = curLab(); var old = document.querySelector('.lr-caution'); if (old) old.remove(); if (!lab) return;
    var bar = document.querySelector('.story-bar') || document.querySelector('.lr-bar'); if (!bar) return;
    var d = document.createElement('details'); d.className = 'lr-caution'; d.open = ls('kl.cautionOpen') !== '0';
    d.innerHTML = '<summary>⚠ Caution before you try this on a real cluster</summary><p>' + code(lab.caution || 'Check the current context and the namespace before any change, and read the output of a command with `get` before you delete anything.') + '</p><p class="lr-caution-data">🔒 ' + esc(DATA_NOTE) + '</p>';
    d.addEventListener('toggle', function () { ls('kl.cautionOpen', d.open ? '1' : '0'); });
    bar.parentNode.insertBefore(d, bar.nextSibling);
  }
  function warnFor(line) { var out = []; KL.risky.forEach(function (r) { if (r[0].test(line)) out.push(r[1]); }); return out; }
  document.addEventListener('input', function (e) {
    if (!e.target || e.target.id !== 'lrIn') return; var w = warnFor(e.target.value); if (!w.length) return;
    var box = $('lrTeach'); if (!box) return; box.hidden = false; box.innerHTML += '<div class="lr-warn">⚠ ' + code(w[0]) + '</div>';
  });
  document.addEventListener('paste', function (e) {
    if (!e.target || e.target.id !== 'lrIn') return; var t = (e.clipboardData || window.clipboardData); if (!t) return; var s = t.getData('text'), hit = '';
    KL.secretPatterns.forEach(function (p) { if (!hit && p[0].test(s)) hit = p[1]; });
    if (!hit) return; e.preventDefault();
    var box = $('lrTeach'); if (box) { box.hidden = false; box.innerHTML = '<div class="lr-warn">⚠ That looks like ' + esc(hit) + '. It was not pasted. Real credentials do not belong in a practice terminal; use a placeholder.</div>'; }
  }, true);

  // ── terminal skins ──
  var SKINS = [['default', 'Default'], ['matrix', 'Green phosphor'], ['amber', 'Amber'], ['solar', 'Solarized dark'], ['paper', 'Paper (light)'], ['contrast', 'High contrast']];
  function applySkin() {
    var t = $('lrTerm'); if (!t) return; var s = ls('kl.skin') || 'default', fs = +(ls('kl.tfs') || 13);
    if (s === 'default') t.removeAttribute('data-skin'); else t.setAttribute('data-skin', s); t.style.fontSize = fs + 'px';
    var sel = $('lrSkin'); if (sel) sel.value = s;
  }
  function skinPicker() {
    var bar = document.querySelector('.lr-bar'); if (!bar || $('lrSkinBox')) { applySkin(); return; }
    var box = document.createElement('span'); box.id = 'lrSkinBox'; box.className = 'lr-skinbox';
    box.innerHTML = '<label class="sr-only" for="lrSkin">Terminal skin</label><select id="lrSkin" title="Terminal skin">' + SKINS.map(function (s) { return '<option value="' + s[0] + '">' + s[1] + '</option>'; }).join('') + '</select><button type="button" class="btn-secondary" id="lrFsM" aria-label="Smaller terminal text">A−</button><button type="button" class="btn-secondary" id="lrFsP" aria-label="Larger terminal text">A+</button>';
    var timer = $('lrTimer'); bar.insertBefore(box, timer || null);
    $('lrSkin').onchange = function () { ls('kl.skin', this.value); applySkin(); };
    function fs(d) { var v = Math.max(10, Math.min(22, +(ls('kl.tfs') || 13) + d)); ls('kl.tfs', String(v)); applySkin(); }
    $('lrFsM').onclick = function () { fs(-1); }; $('lrFsP').onclick = function () { fs(1); };
    applySkin();
  }

  // ── diagram: traffic lines, ingress trace, why-Pending popover ──
  function simNow() { var lab = curLab(); if (!lab || !KL.labRun) return Promise.resolve(null); return KL.labRun(lab.id).then(function (r) { return r && r.sim; }); }
  function clearTrace() { var o = document.querySelector('.dia-lines'); if (o) o.remove(); var t = document.querySelector('.dia-trace'); if (t) t.remove(); }
  function drawLines(svcEl) {
    clearTrace(); var root = $('lrDia'); if (!root || !svcEl) return;
    setTimeout(function () {
      var pods = root.querySelectorAll('.dia-pod.hl'), rb = root.getBoundingClientRect(), sb = svcEl.getBoundingClientRect(); if (!pods.length) return;
      var ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'); svg.setAttribute('class', 'dia-lines'); svg.setAttribute('width', root.scrollWidth); svg.setAttribute('height', root.scrollHeight); svg.setAttribute('aria-hidden', 'true');
      var x1 = sb.left - rb.left + sb.width / 2 + root.scrollLeft, y1 = sb.top - rb.top + sb.height + root.scrollTop;
      pods.forEach(function (p) { var pb = p.getBoundingClientRect(), x2 = pb.left - rb.left + pb.width / 2 + root.scrollLeft, y2 = pb.top - rb.top + root.scrollTop, path = document.createElementNS(ns, 'path'); path.setAttribute('d', 'M' + x1 + ',' + y1 + ' C' + x1 + ',' + (y1 + 40) + ' ' + x2 + ',' + (y2 - 40) + ' ' + x2 + ',' + y2); svg.appendChild(path); });
      root.appendChild(svg);
    }, 30);
    var key = (svcEl.dataset.svc || '').split('/'); simNow().then(function (s) {
      if (!s || key.length < 2 || !root.contains(svcEl)) return;
      try {
        var ings = s.list('Ingress', key[0]).filter(function (g) { return JSON.stringify(g.spec || {}).indexOf('"name":"' + key[1] + '"') >= 0; }), n = s.endpointsFor(s.get('Service', key[0], key[1])).length;
        var tr = document.createElement('div'); tr.className = 'dia-trace';
        tr.innerHTML = (ings.length ? '🌐 Ingress <b>' + esc(ings[0].metadata.name) + '</b> → ' : '') + 'Service <b>' + esc(key[1]) + '</b> → <b>' + n + '</b> ready pod' + (n === 1 ? '' : 's') + (n ? '' : ' <em>(no traffic can flow)</em>');
        root.insertBefore(tr, root.firstChild);
      } catch (e) {}
    });
  }
  document.addEventListener('mouseover', function (e) { var sv = e.target.closest && e.target.closest('#lrDia .dia-svc'); if (sv) drawLines(sv); });
  document.addEventListener('focusin', function (e) { var sv = e.target.closest && e.target.closest('#lrDia .dia-svc'); if (sv) drawLines(sv); });
  document.addEventListener('mouseout', function (e) { if (e.target.closest && e.target.closest('#lrDia .dia-svc')) clearTrace(); });
  document.addEventListener('focusout', function (e) { if (e.target.closest && e.target.closest('#lrDia .dia-svc')) clearTrace(); });
  document.addEventListener('click', function (e) {
    var old = document.querySelector('.dia-why'); if (old) old.remove();
    var p = e.target.closest && e.target.closest('#lrDia .dia-pod.st-wait'); if (!p) return; var k = (p.dataset.k || '').split('/');
    simNow().then(function (s) {
      if (!s) return; var ev = null; s.events.forEach(function (x) { if (x.kind === 'Pod' && x.name === k[1] && x.ns === k[0] && /FailedScheduling|Failed|Backoff/.test(x.reason)) ev = x; });
      var d = document.createElement('div'); d.className = 'dia-why'; d.setAttribute('role', 'status');
      d.innerHTML = '<b>Why is ' + esc(k[1]) + ' waiting?</b><br>' + (ev ? esc(ev.reason) + ': ' + esc(ev.msg) : 'No scheduler event yet. Run <code>kubectl describe pod ' + esc(k[1]) + ' -n ' + esc(k[0]) + '</code> and read Events.') + '<button type="button" aria-label="Close">×</button>';
      d.querySelector('button').onclick = function () { d.remove(); }; var root = $('lrDia'); if (root) root.insertBefore(d, root.firstChild);
    });
  });

  // ── flowcharts (Field Guide tab) ──
  var fs = { flow: 0, path: [] };
  function flowHtml() {
    var f = KL.flows[fs.flow], cur = fs.path.length ? fs.path[fs.path.length - 1] : f.start, n = f.nodes[cur];
    var h = '<p class="fg-sub">Pick a symptom, answer the questions, and end at a fix and a lab that trains it. Commands are copy-only: run them in a lab terminal. ' + esc('Guidance only; adapt to your cluster.') + '</p><div class="cp-tabs" role="tablist">' + KL.flows.map(function (x, i) { return '<button role="tab" aria-selected="' + (i === fs.flow) + '" data-fl="' + i + '">' + esc(x.title) + '</button>'; }).join('') + '</div><div class="fl-card">';
    h += '<div class="fl-crumb">' + [f.title].concat(fs.path.slice(0, -1).map(function () { return '•'; })).join(' › ') + '</div>';
    if (n.leaf) {
      h += '<h4 class="fl-leaf">✔ ' + esc(n.title) + '</h4><p>' + code(n.fix) + '</p>' + (n.caution ? '<div class="lr-warn">⚠ ' + code(n.caution) + '</div>' : '') + (n.lab && Labs.byId[n.lab] ? '<a class="fg-lab" href="#lab/' + n.lab + '"><b>' + esc(Labs.byId[n.lab].num + ' · ' + Labs.byId[n.lab].title) + '</b><em>Practise this</em></a>' : '');
    } else {
      h += '<h4>' + code(n.q) + '</h4>' + (n.cmd ? '<div class="fl-cmd"><code>' + esc(n.cmd) + '</code><button type="button" class="btn-secondary" data-copy="' + esc(n.cmd) + '">Copy</button></div>' : '') + '<div class="fl-opts">' + n.opts.map(function (o, i) { return '<button type="button" class="btn-secondary fl-opt" data-o="' + i + '">' + esc(o[0]) + '</button>'; }).join('') + '</div>';
    }
    return h + '<div class="fl-nav">' + (fs.path.length ? '<button type="button" class="btn-secondary" id="flBack">← Back</button>' : '') + (fs.path.length ? '<button type="button" class="btn-secondary" id="flRestart">↺ Start over</button>' : '') + '</div></div>';
  }
  KL.renderFlows = function (root) {
    function draw() {
      root.innerHTML = flowHtml();
      root.querySelectorAll('[data-fl]').forEach(function (b) { b.onclick = function () { fs.flow = +b.dataset.fl; fs.path = []; draw(); }; });
      var f = KL.flows[fs.flow], cur = fs.path.length ? fs.path[fs.path.length - 1] : f.start;
      root.querySelectorAll('.fl-opt').forEach(function (b) { b.onclick = function () { fs.path.push(f.nodes[cur].opts[+b.dataset.o][1]); draw(); }; });
      root.querySelectorAll('[data-copy]').forEach(function (b) { b.onclick = function () { try { navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Copied'; } catch (e) {} }; });
      var bk = $('flBack'); if (bk) bk.onclick = function () { fs.path.pop(); draw(); }; var rs = $('flRestart'); if (rs) rs.onclick = function () { fs.path = []; draw(); };
    }
    draw();
  };

  function decorate() { cautionBanner(); skinPicker(); }
  KL.route('lab', function () { setTimeout(decorate, 50); setTimeout(decorate, 350); });
  window.addEventListener('kl:page', function (e) { if (e.detail && e.detail.name !== 'lab') clearTrace(); });
})();
