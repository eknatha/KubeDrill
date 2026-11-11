/* UX layer: 90-second onboarding, workbench layouts, terminal coaching, failure-library strip, Field Guide
   (stories · outage explainers · concept animations). Loads after lab-ui/extras; all state is local. */
(function () {
  'use strict';
  var KL = window.KL, Labs = KL.Labs, store = KL.store, $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ───────────────────────── onboarding (≈90 s) ─────────────────────────
  var OB = KL.onboarding = {
    open: function (force) {
      if (document.getElementById('obOverlay')) return; var step = 0, sim = new KL.Sim(), ran = false;
      var ov = document.createElement('div'); ov.id = 'obOverlay'; ov.className = 'ob-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Welcome to KubeLab');
      document.body.appendChild(ov);
      function close(go) { ls('kl.ob', '1'); ov.remove(); if (go) location.hash = go; }
      function dots() { return '<div class="ob-dots">' + [0, 1, 2].map(function (i) { return '<i class="' + (i === step ? 'on' : '') + '"></i>'; }).join('') + '</div>'; }
      function paint() {
        var h;
        if (step === 0) h = '<h2>Break it. Fix it. Learn it.</h2><p>KubeLab drops you into a <b>broken Kubernetes cluster</b>. You fix it with real <code>kubectl</code> commands in a built-in terminal. Everything runs <b>in your browser</b> — free, offline, no ads.</p><ul class="ob-list"><li>🧪 73 hands-on labs with automatic checking</li><li>⏱ Learn mode (hints) or Exam mode (timed, no hints)</li><li>🗺 A live diagram of your cluster as you work</li></ul>';
        else if (step === 1) h = '<h2>Try it: run one command</h2><p>This is the same terminal you will use in labs. Type a command (or click one) and press Enter.</p><div class="ob-chips">' + ['kubectl get nodes', 'kubectl get pods -A', 'kubectl get ns'].map(function (c) { return '<button type="button" class="ob-chip" data-c="' + c + '">' + c + '</button>'; }).join('') + '</div><div class="ob-term"><pre id="obOut" aria-live="polite">student@kubelab:~$ </pre><div class="ob-line"><span>$</span><input id="obIn" autocomplete="off" spellcheck="false" aria-label="Try a kubectl command" placeholder="kubectl get nodes"></div></div>';
        else h = '<h2>Pick your first mission</h2><p>You can change this any time from the Labs page.</p><div class="ob-go"><button class="btn-primary" data-go="#lab/s01-pending-cpu">Start with a beginner lab</button><button class="btn-secondary" data-go="#path">Follow a learning path</button><button class="btn-secondary" data-go="#labs">Browse all labs</button><button class="btn-secondary" data-go="#field">Read a real outage story</button></div>';
        ov.innerHTML = '<div class="ob-card">' + dots() + h + '<div class="ob-foot"><button class="ob-skip" id="obSkip">Skip</button>' + (step < 2 ? '<button class="btn-primary" id="obNext"' + (step === 1 && !ran ? ' disabled' : '') + '>' + (step === 0 ? 'Show me' : 'Next →') + '</button>' : '') + '</div></div>';
        $('obSkip').onclick = function () { close(); };
        if ($('obNext')) $('obNext').onclick = function () { step++; paint(); };
        ov.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { close(b.dataset.go); }; });
        if (step === 1) {
          var inp = $('obIn'), out = $('obOut');
          function run(c) { c = String(c || '').trim(); if (!c) return; var r; try { r = sim.exec(c); } catch (e) { r = { stdout: '', stderr: String(e.message), code: 1 }; } out.textContent += c + '\n' + (r.stdout + r.stderr) + '\nstudent@kubelab:~$ '; out.scrollTop = out.scrollHeight; inp.value = ''; if (!ran && /^(kubectl|k)\s/.test(c) && r.code === 0) { ran = true; var n = $('obNext'); if (n) { n.disabled = false; n.focus(); } } }
          inp.onkeydown = function (e) { if (e.key === 'Enter') run(inp.value); }; ov.querySelectorAll('.ob-chip').forEach(function (b) { b.onclick = function () { run(b.dataset.c); }; }); inp.focus();
        } else { var f = $('obNext') || ov.querySelector('[data-go]'); if (f) f.focus(); }
      }
      ov.onkeydown = function (e) { if (e.key === 'Escape') close(); };
      paint();
    }
  };
  document.addEventListener('DOMContentLoaded', function () { if (!ls('kl.ob') && !navigator.webdriver && !/^#lab\//.test(location.hash)) setTimeout(function () { OB.open(); }, 700); });

  // ───────────────────────── workbench layouts ─────────────────────────
  var LAYOUTS = [['split', '◧', 'Split: instructions beside terminal'], ['focus', '▣', 'Focus: terminal only (press F)'], ['stack', '☰', 'Stacked: instructions above terminal']];
  function layout() { var l = ls('kl.layout'); return LAYOUTS.some(function (x) { return x[0] === l; }) ? l : 'split'; }
  function applyLayout(l) { var sp = document.querySelector('.lr-split'); if (!sp) return; sp.classList.remove('lay-split', 'lay-focus', 'lay-stack'); sp.classList.add('lay-' + l); document.querySelectorAll('.lr-layout button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.l === l)); }); }
  function installLayout() {
    var bar = document.querySelector('.lr-bar'); if (!bar || bar.querySelector('.lr-layout')) return;
    var d = document.createElement('div'); d.className = 'lr-layout'; d.setAttribute('role', 'group'); d.setAttribute('aria-label', 'Layout');
    d.innerHTML = LAYOUTS.map(function (x) { return '<button type="button" data-l="' + x[0] + '" title="' + x[2] + '" aria-label="' + x[2] + '" aria-pressed="false">' + x[1] + '</button>'; }).join('');
    d.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; ls('kl.layout', b.dataset.l); applyLayout(b.dataset.l); };
    bar.insertBefore(d, bar.querySelector('#lrDocsBtn') || bar.lastChild); applyLayout(layout());
  }
  document.addEventListener('keydown', function (e) { if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && document.querySelector('.lr-split')) { var cur = layout(); var nx = cur === 'focus' ? 'split' : 'focus'; ls('kl.layout', nx); applyLayout(nx); } });

  // ───────────────────────── terminal that teaches ─────────────────────────
  var VERB = { get: 'list resources', describe: 'show details + recent events', logs: 'print container logs', apply: 'create/update from a manifest', delete: 'delete resources', create: 'create a resource', edit: 'edit live object in $EDITOR', patch: 'change fields in place', scale: 'change replica count', rollout: 'manage rollouts (status/undo/restart/history)', exec: 'run a command in a container', label: 'add/change labels', annotate: 'add/change annotations', cordon: 'mark node unschedulable', uncordon: 'mark node schedulable', drain: 'evict pods from a node', taint: 'add a node taint', top: 'CPU/memory usage', expose: 'create a Service for a workload', run: 'start a pod', set: 'update image/env/resources', explain: 'show field documentation', 'auth': 'check permissions (can-i)', events: 'list cluster events', wait: 'wait for a condition', config: 'kubeconfig contexts/namespaces', 'api-resources': 'list resource types', kustomize: 'render a kustomization' };
  var FLAG = { '-n': 'namespace', '--namespace': 'namespace', '-A': 'all namespaces', '--all-namespaces': 'all namespaces', '-o': 'output format (wide, yaml, json, name, jsonpath=…)', '-l': 'label selector', '--selector': 'label selector', '-f': 'file / manifest', '-c': 'container name', '--container': 'container name', '-w': 'watch for changes', '--watch': 'watch for changes', '--previous': 'logs from the previous (crashed) container', '-p': 'previous logs / patch body (depends on verb)', '-it': 'interactive terminal', '--dry-run=client': 'preview, send nothing', '--show-labels': 'add a LABELS column', '--sort-by': 'sort by a JSONPath field', '--replicas': 'replica count', '--image': 'container image', '--field-selector': 'filter by field', '--force': 'skip graceful deletion', '--grace-period': 'seconds before force-kill', '--ignore-daemonsets': 'drain: skip DaemonSet pods', '--delete-emptydir-data': 'drain: allow losing emptyDir data', '--type': 'patch type (merge, json, strategic)', '--as': 'impersonate a user/SA', '--all': 'apply to all objects of the kind' };
  var KIND = { po: 'pods', pod: 'pods', pods: 'pods', svc: 'services', deploy: 'deployments', rs: 'replicasets', cm: 'configmaps', ns: 'namespaces', no: 'nodes', ep: 'endpoints', ing: 'ingresses', netpol: 'networkpolicies', sa: 'serviceaccounts', pvc: 'persistentvolumeclaims', pv: 'persistentvolumes', sts: 'statefulsets', ds: 'daemonsets', cj: 'cronjobs', hpa: 'horizontalpodautoscalers', pdb: 'poddisruptionbudgets', sc: 'storageclasses' };
  function explain(line) {
    var t = line.trim().split(/\s+/); if (!t[0]) return ''; var bits = [];
    if (/^(kubectl|k)$/.test(t[0])) {
      if (t[1] && VERB[t[1]]) bits.push('<b>' + t[1] + '</b> — ' + VERB[t[1]]); else if (t[1] && t.length > 2) bits.push('unknown verb “' + esc(t[1]) + '”');
      t.slice(2).forEach(function (w) { var f = w.split('=')[0]; if (FLAG[w] || FLAG[f]) bits.push('<code>' + esc(w) + '</code> ' + (FLAG[w] || FLAG[f])); else if (KIND[w] && KIND[w] !== w) bits.push('<code>' + esc(w) + '</code> = ' + KIND[w]); });
    } else if (t[0] === 'ssh') bits.push('<b>ssh</b> — run one command on a node, e.g. <code>ssh worker1 "sudo systemctl status kubelet"</code>');
    else if (t[0] === 'journalctl') bits.push('<b>journalctl -u kubelet</b> — systemd logs for the kubelet');
    return bits.join(' · ');
  }
  function lev(a, b) { var m = [], i, j; for (i = 0; i <= a.length; i++) m[i] = [i]; for (j = 1; j <= b.length; j++) m[0][j] = j; for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return m[a.length][b.length]; }
  function nearest(w, pool) { var best = '', bd = 3; pool.forEach(function (p) { var d = lev(w, p); if (d < bd) { bd = d; best = p; } }); return best; }
  var TOPPOOL = ['kubectl', 'kubeadm', 'systemctl', 'journalctl', 'crictl', 'etcdctl', 'helm', 'grep', 'curl', 'cat', 'ls', 'vi'];
  document.addEventListener('input', function (e) {
    if (!e.target || e.target.id !== 'lrIn') return; var box = $('lrTeach'); if (!box) { var t = $('lrTerm'); if (!t) return; box = document.createElement('div'); box.id = 'lrTeach'; box.className = 'lr-teach'; box.setAttribute('aria-live', 'polite'); t.parentNode.insertBefore(box, t.nextSibling); }
    var x = explain(e.target.value); box.innerHTML = x ? '💡 ' + x : ''; box.hidden = !x;
  });
  document.addEventListener('keydown', function (e) { if (e.target && e.target.id === 'lrIn' && e.key === 'Enter') { var b = $('lrTeach'); if (b) { b.innerHTML = ''; b.hidden = true; } } }, true);
  var mo = new MutationObserver(function (list) {
    list.forEach(function (m) { m.addedNodes.forEach(function (n) {
      if (!n.classList || !n.classList.contains('lr-o') || n.classList.contains('hint')) return; var txt = n.textContent, h = '', m1;
      if ((m1 = txt.match(/the server doesn't have a resource type "([^"]+)"/))) { var k = nearest(m1[1], Object.keys(KIND).concat(['pods', 'nodes', 'services', 'deployments', 'namespaces'])); if (k) h = 'Did you mean <code>' + (KIND[k] || k) + '</code>? Try <code>kubectl api-resources</code> to list valid types.'; }
      else if ((m1 = txt.match(/^bash: (\S+): command not found/))) { var c = nearest(m1[1], TOPPOOL); if (c) h = 'Did you mean <code>' + c + '</code>?'; }
      if (h) { var d = document.createElement('div'); d.className = 'lr-o hint'; d.innerHTML = '💡 ' + h; n.parentNode.insertBefore(d, n.nextSibling); }
    }); });
  });
  function watchOut() { var o = $('lrOut'); if (o && !o._w) { o._w = 1; mo.observe(o, { childList: true }); } }

  // ───────────────────────── runner decoration (stories banner, layout, teach) ─────────────────────────
  function chapterOf(id) { for (var i = 0; i < KL.stories.length; i++) for (var j = 0; j < KL.stories[i].chapters.length; j++) if (KL.stories[i].chapters[j].lab === id) return { ep: KL.stories[i], i: j }; return null; }
  function decorate() {
    installLayout(); watchOut(); var m = location.hash.match(/^#lab\/(.+)$/); if (!m) return; var c = chapterOf(m[1]), old = document.querySelector('.story-bar'); if (old) old.remove(); if (!c) return;
    var ch = c.ep.chapters[c.i], b = document.createElement('div'); b.className = 'story-bar';
    var prev = c.ep.chapters[c.i - 1], next = c.ep.chapters[c.i + 1];
    b.innerHTML = '<span class="story-tag">🚨 ' + esc(c.ep.title) + ' · Chapter ' + (c.i + 1) + '/' + c.ep.chapters.length + '</span><span class="story-time">' + esc(ch.time) + '</span><span class="story-page">“' + esc(ch.page) + '”</span><span class="story-note">' + esc(ch.note) + '</span>' +
      '<span class="story-nav">' + (prev ? '<a href="#lab/' + prev.lab + '">← prev</a>' : '') + (next ? '<a href="#lab/' + next.lab + '">next chapter →</a>' : '<a href="#field">finish episode</a>') + '</span>';
    var bar = document.querySelector('.lr-bar'); if (bar) bar.parentNode.insertBefore(b, bar.nextSibling);
  }
  KL.route('lab', function () { setTimeout(decorate, 0); setTimeout(decorate, 250); });

  // ───────────────────────── labs page: failure library ─────────────────────────
  function failureStrip() {
    var host = $('failureStrip'); if (!host) { var d = $('dailyCard'); if (!d) return; host = document.createElement('div'); host.id = 'failureStrip'; d.parentNode.insertBefore(host, d.nextSibling); }
    var fl = Labs.list.filter(function (l) { return l.failure; });
    host.innerHTML = '<section class="fail-strip"><div class="fail-h"><b>🔥 Real-world failure library</b><span>Failure classes behind real outages: stuck finalizers, dead nodes, swap, dead webhooks, expired certs. <a href="#field">Read the outages →</a></span></div><div class="fail-row">' +
      fl.map(function (l) { return '<a class="fail-card' + (store.labDone(l.id) ? ' done' : '') + '" href="#lab/' + l.id + '"><span class="ilab-num">' + l.num + '</span><b>' + esc(l.title) + '</b><em>' + esc(l.diff) + ' · ' + esc(l.time) + (store.labDone(l.id) ? ' · ✓' : '') + '</em></a>'; }).join('') + '</div></section>';
  }
  KL.route('labs', failureStrip); window.addEventListener('kl:store', failureStrip);

  // ───────────────────────── Field Guide ─────────────────────────
  var tab = 'stories';
  function labLink(id, why) { var l = Labs.byId[id]; return l ? '<a class="fg-lab" href="#lab/' + id + '"><b>' + esc(l.num + ' · ' + l.title) + '</b><em>' + esc(why) + '</em></a>' : ''; }
  function renderStories() {
    return KL.stories.map(function (ep) {
      var done = ep.chapters.filter(function (c) { return store.labDone(c.lab); }).length;
      return '<article class="fg-ep"><header><h3>' + esc(ep.title) + '</h3><span class="fg-prog">' + done + '/' + ep.chapters.length + ' chapters</span></header><p class="fg-sub">' + esc(ep.blurb) + ' <em>(Fictional story. Each chapter is a real, auto-checked lab.)</em></p><ol class="fg-chap">' +
        ep.chapters.map(function (c) { var l = Labs.byId[c.lab]; if (!l) return ''; return '<li class="' + (store.labDone(c.lab) ? 'done' : '') + '"><span class="fg-time">' + esc(c.time) + '</span><div><div class="fg-pager">📟 ' + esc(c.page) + '</div><div class="fg-note">' + esc(c.note) + '</div><a class="btn-secondary" href="#lab/' + c.lab + '">' + (store.labDone(c.lab) ? 'Replay' : 'Take the page') + ': ' + esc(l.title) + '</a></div></li>'; }).join('') + '</ol></article>';
    }).join('');
  }
  function renderOutages() {
    return '<p class="fg-sub">Three real, public post-mortems, summarised in our own words from the cited sources, with the labs that train the same failure class. Click through to read the originals.</p>' + KL.outages.map(function (o) {
      return '<article class="fg-out"><header><h3>' + esc(o.title) + '</h3><span class="fg-meta">' + esc(o.org) + ' · ' + esc(o.when) + ' · ' + esc(o.dur) + '</span></header><ol class="fg-chain">' + o.chain.map(function (c) { return '<li>' + esc(c).replace(/`([^`]+)`/g, '<code>$1</code>') + '</li>'; }).join('') + '</ol>' +
        '<div class="fg-cols"><div><h4>Root cause</h4><p>' + esc(o.cause) + '</p></div><div><h4>How to spot it earlier</h4><ul>' + o.spot.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul></div></div>' +
        '<h4>Practise this failure class</h4><div class="fg-labs">' + o.labs.map(function (x) { return labLink(x[0], x[1]); }).join('') + '</div><div class="fg-src">Sources: ' + o.src.map(function (s) { return '<a href="' + s.u + '" target="_blank" rel="noopener noreferrer">' + esc(s.t) + '</a>'; }).join(' · ') + '</div></article>';
    }).join('');
  }
  var anim = { id: 0, i: 0, timer: 0 };
  function sceneHtml() {
    var sc = KL.concepts[anim.id], st = sc.steps[anim.i];
    return '<div class="cp-tabs" role="tablist">' + KL.concepts.map(function (c, i) { return '<button role="tab" aria-selected="' + (i === anim.id) + '" data-sc="' + i + '">' + esc(c.title) + '</button>'; }).join('') + '</div>' +
      '<div class="cp-stage" aria-live="polite"><div class="cp-items">' + st.items.map(function (x) { return '<div class="cp-it ' + (x.c || '') + '">' + esc(x.l) + '</div>'; }).join('') + '</div><h4>' + esc(st.t) + '</h4><p>' + esc(st.note) + '</p></div>' +
      '<div class="cp-ctl"><button class="btn-secondary" id="cpPrev" ' + (anim.i === 0 ? 'disabled' : '') + '>← Back</button><button class="btn-primary" id="cpPlay">' + (anim.timer ? '⏸ Pause' : '▶ Play') + '</button><button class="btn-secondary" id="cpNext" ' + (anim.i === sc.steps.length - 1 ? 'disabled' : '') + '>Next →</button><span class="cp-n">' + (anim.i + 1) + ' / ' + sc.steps.length + '</span></div>';
  }
  function bindAnim(root) {
    function stop() { clearInterval(anim.timer); anim.timer = 0; }
    function draw() { root.innerHTML = sceneHtml(); root.querySelectorAll('[data-sc]').forEach(function (b) { b.onclick = function () { stop(); anim.id = +b.dataset.sc; anim.i = 0; draw(); }; }); var n = KL.concepts[anim.id].steps.length;
      $('cpPrev').onclick = function () { stop(); anim.i = Math.max(0, anim.i - 1); draw(); }; $('cpNext').onclick = function () { stop(); anim.i = Math.min(n - 1, anim.i + 1); draw(); };
      $('cpPlay').onclick = function () { if (anim.timer) { stop(); draw(); return; } if (anim.i >= n - 1) anim.i = 0; anim.timer = setInterval(function () { if (anim.i >= n - 1) { stop(); draw(); return; } anim.i++; draw(); }, 2600); draw(); }; }
    draw();
  }
  function renderField() {
    var r = $('fieldRoot'); if (!r) return; if (anim.timer) { clearInterval(anim.timer); anim.timer = 0; }
    var tabs = [['stories', '🚨 3 a.m. page'], ['outages', '🔍 Anatomy of an outage'], ['concepts', '🎞 Concepts in motion']];
    r.innerHTML = '<div class="section-header"><h2>Field Guide</h2><p>Stories, real post-mortems and animated explainers that put the labs in context. <button class="btn-secondary" id="fgTour">▶ 90-second tour</button></p></div><div class="fg-tabs" role="tablist">' + tabs.map(function (t) { return '<button role="tab" aria-selected="' + (t[0] === tab) + '" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div><div id="fgBody"></div>';
    r.querySelectorAll('[data-t]').forEach(function (b) { b.onclick = function () { tab = b.dataset.t; renderField(); }; });
    $('fgTour').onclick = function () { OB.open(true); };
    var body = $('fgBody'); if (tab === 'stories') body.innerHTML = renderStories(); else if (tab === 'outages') body.innerHTML = renderOutages(); else bindAnim(body);
  }
  KL.route('field', renderField); window.addEventListener('kl:store', function () { if (/^#field/.test(location.hash)) renderField(); });
  KL.fieldTab = function (t) { tab = t; };
})();
