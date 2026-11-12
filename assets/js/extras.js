/* Cross-cutting UI: theme, command palette, learning path, progress page, comparison page, a11y, counts, error→lab links. */
(function () {
  'use strict';
  var KL = window.KL, store = KL.store, $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── modules: append the extra ones and re-render ──
  if (typeof MODULES !== 'undefined' && KL.modulesExtra && MODULES.length === 12) { KL.modulesExtra.forEach(function (m) { MODULES.push(m); }); if (typeof renderModules === 'function') renderModules(); }
  function decorateModules() {
    document.querySelectorAll('.module-card').forEach(function (c, i) { c.classList.toggle('done', store.moduleDone(i + 1)); var n = c.querySelector('.module-num'); if (n && !c.querySelector('.mod-check') && store.moduleDone(i + 1)) n.insertAdjacentHTML('beforeend', ' <span class="mod-check">✓</span>'); });
  }
  if (typeof openModule === 'function') {
    var _open = openModule;
    window.openModule = function (idx) {
      _open(idx); var body = document.querySelector('#modalContent .modal-body'); if (!body) return; var n = idx + 1, done = store.moduleDone(n), b = document.createElement('button');
      b.className = done ? 'btn-secondary' : 'btn-primary'; b.style.margin = '1rem 0 0'; b.textContent = done ? '✓ Completed — undo' : '✓ Mark module complete';
      b.onclick = function () { store.markModule(n, !store.moduleDone(n)); closeModal(); decorateModules(); if (store.moduleDone(n) && KL.fx) KL.fx.confetti(); }; body.appendChild(b);
      var close = document.querySelector('#modalContent .modal-close'); if (close) close.focus();
    };
  }
  window.addEventListener('kl:store', decorateModules); decorateModules();

  // ── counts ──
  function counts() {
    var c = { modules: typeof MODULES !== 'undefined' ? MODULES.length : 12, ilabs: KL.Labs.list.length, labs: KL.Labs.list.length + (typeof LABS !== 'undefined' ? LABS.length : 0), quiz: (KL.quizAll || []).length, cheat: typeof CHEATSHEET !== 'undefined' ? CHEATSHEET.reduce(function (a, s) { return a + ((s.cmds || s.commands || s.items || []).length || 0); }, 0) : 0, tools: typeof TOOLS !== 'undefined' ? TOOLS.length : 9, errors: typeof ENC_DATA !== 'undefined' ? ENC_DATA.length : 0 };
    document.querySelectorAll('[data-count]').forEach(function (el) { var k = el.dataset.count, v = c[k]; if (!v) return; if (k === 'cheat') v = Math.floor(v / 10) * 10 + '+'; el.textContent = v; });
  }
  if (KL.quizInit) KL.quizInit(); counts();

  // ── theme ──
  function setTheme(t) { document.documentElement.dataset.theme = t; try { localStorage.setItem('kubelab:theme', t); } catch (e) { /* ignore */ } var b = $('themeBtn'); if (b) b.setAttribute('aria-pressed', String(t === 'light')); }
  if ($('themeBtn')) $('themeBtn').onclick = function () { setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'); };

  // ── a11y: make [onclick] non-buttons keyboard operable; Esc closes modal ──
  function a11y(root) {
    (root || document).querySelectorAll('[onclick]:not(button):not(a):not(input):not(select):not([tabindex])').forEach(function (el) { el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button'); });
  }
  document.addEventListener('keydown', function (e) {
    var t = e.target; if ((e.key === 'Enter' || e.key === ' ') && t && t.getAttribute && t.getAttribute('role') === 'button' && t.tagName !== 'BUTTON' && t.hasAttribute('onclick')) { e.preventDefault(); t.click(); }
    if (e.key === 'Escape') { var m = $('moduleModal'); if (m && m.classList.contains('show')) closeModal(); }
  });
  a11y(); new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) a11y(n); }); }); }).observe(document.body, { childList: true, subtree: true });

  // ── error encyclopedia → lab links ──
  var ENC2LAB = { 'CrashLoopBackOff': 's03-oomkilled', 'OOMKilled': 's03-oomkilled', 'ImagePullBackOff': 's02-imagepull', 'ErrImagePull': 's02-imagepull', 'Pending': 's01-pending-cpu', '0/N nodes available: Insufficient cpu': 's01-pending-cpu', 'Readiness probe failed': 's08-probes', 'Liveness probe failed': 's08-probes', 'Service has no endpoints': 's04-no-endpoints', 'Pod has unbound PersistentVolumeClaims': 's13-pvc-pending', 'PVC stuck in Pending': 's13-pvc-pending', 'Secret not found': 's18-secret-env', 'NetworkPolicy blocking traffic': 's12-netpol-isolate', 'Forbidden: User cannot get resource': 's11-rbac-sa', 'secrets is forbidden': 's11-rbac-sa', 'node(s) did not match node affinity': 's07-scheduling', 'node(s) had untolerated taint': 's07-scheduling', 'Ingress 503 Service Unavailable': 's19-ingress', 'Ingress 502 Bad Gateway': 's04-no-endpoints', 'Init:CrashLoopBackOff': 's10-sidecar' };
  function encLinks() {
    if (typeof ENC_DATA === 'undefined') return;
    ENC_DATA.forEach(function (e, i) { var id = ENC2LAB[e.name], inner = document.querySelector('#encbody-' + i + ' .enc-body-inner'); if (!id || !inner || inner.querySelector('.enc-lab')) return; var l = KL.Labs.byId[id]; if (l) inner.insertAdjacentHTML('beforeend', '<div class="enc-section enc-full-width"><a class="enc-lab" href="#lab/' + id + '">🧪 Practise this failure in a lab: ' + esc(l.title) + ' →</a></div>'); });
  }
  encLinks();

  // ── command palette ──
  var PAGES = [['home', 'Home'], ['modules', 'Modules'], ['path', 'Learning path'], ['labs', 'Labs'], ['exam', 'Exam mode'], ['quiz', 'Quiz'], ['visualize', 'Visualize'], ['cheatsheet', 'Cheatsheet'], ['tools', 'Tools'], ['errors', 'Error encyclopedia'], ['progress', 'My progress'], ['compare', 'Compare KubeLab']];
  var pal = { items: [], sel: 0 };
  function palItems() {
    var it = PAGES.map(function (p) { return { t: p[1], k: 'Page', h: '#' + p[0] }; });
    if (typeof MODULES !== 'undefined') MODULES.forEach(function (m, i) { it.push({ t: m.title, k: 'Module ' + m.num, s: m.desc + ' ' + m.tagLabels.join(' '), fn: function () { showPage('modules'); openModule(i); } }); });
    KL.Labs.list.forEach(function (l) { it.push({ t: l.title, k: 'Lab ' + l.num, s: l.domain + ' ' + l.track.join(' '), h: '#lab/' + l.id }); });
    if (typeof ENC_DATA !== 'undefined') ENC_DATA.forEach(function (e, i) { it.push({ t: e.name, k: 'Error', s: e.short + ' ' + e.cat, fn: function () { showPage('errors'); setTimeout(function () { if (typeof toggleEnc === 'function') { toggleEnc(i); var c = $('enc-' + i); if (c) c.scrollIntoView({ block: 'center' }); } }, 60); } }); });
    if (typeof CHEATSHEET !== 'undefined') CHEATSHEET.forEach(function (sec) { (sec.cmds || sec.commands || sec.items || []).forEach(function (c) { var cmd = c.cmd || c.c || c[0] || (typeof c === 'string' ? c : ''); if (cmd) it.push({ t: cmd, k: 'Command', s: (c.exp || c.desc || c.d || c[1] || '') + ' ' + (sec.title || sec.cat || ''), fn: function () { try { navigator.clipboard.writeText(cmd); } catch (e) { /* ignore */ } KL.toast && KL.toast('Copied: ' + cmd); } }); }); });
    return it;
  }
  KL.palItems = palItems;
  function palOpen() { if (KL.openPalette) { KL.openPalette(); return; } var p = $('palette'); if (!pal.items.length) pal.items = palItems(); p.hidden = false; $('paletteInput').value = ''; palFilter(''); $('paletteInput').focus(); }
  function palClose() { $('palette').hidden = true; }
  function palFilter(q) {
    q = q.toLowerCase().trim(); var words = q.split(/\s+/).filter(Boolean);
    var res = pal.items.map(function (x) { var hay = (x.t + ' ' + (x.s || '') + ' ' + x.k).toLowerCase(), sc = 0; if (!words.length) sc = x.k === 'Page' ? 2 : 0; else { for (var i = 0; i < words.length; i++) { if (hay.indexOf(words[i]) < 0) return null; sc += x.t.toLowerCase().indexOf(words[i]) >= 0 ? 3 : 1; } if (x.t.toLowerCase() === q) sc += 5; } return { x: x, sc: sc }; }).filter(Boolean).sort(function (a, b) { return b.sc - a.sc; }).slice(0, 12);
    pal.res = res.map(function (r) { return r.x; }); pal.sel = 0; palRender();
  }
  function palRender() { $('paletteList').innerHTML = pal.res.length ? pal.res.map(function (x, i) { return '<div class="pal-item' + (i === pal.sel ? ' sel' : '') + '" role="option" data-i="' + i + '"><span class="pal-k">' + esc(x.k) + '</span><span class="pal-t">' + esc(x.t.length > 90 ? x.t.slice(0, 90) + '…' : x.t) + '</span></div>'; }).join('') : '<div class="pal-none">No results</div>'; }
  function palGo(i) { var x = pal.res[i]; if (!x) return; palClose(); if (x.fn) x.fn(); else location.hash = x.h.slice(1); }
  if ($('paletteBtn')) $('paletteBtn').onclick = palOpen;
  document.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { if (!KL.openPalette) { e.preventDefault(); if ($('palette').hidden) palOpen(); else palClose(); } } else if (e.key === 'Escape' && !$('palette').hidden) palClose(); else if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && $('palette').hidden && !document.querySelector('.pal-bg')) { e.preventDefault(); palOpen(); } });
  $('paletteInput').oninput = function () { palFilter(this.value); };
  $('paletteInput').onkeydown = function (e) { if (e.key === 'ArrowDown') { e.preventDefault(); pal.sel = Math.min(pal.sel + 1, pal.res.length - 1); palRender(); } else if (e.key === 'ArrowUp') { e.preventDefault(); pal.sel = Math.max(pal.sel - 1, 0); palRender(); } else if (e.key === 'Enter') { e.preventDefault(); palGo(pal.sel); } };
  $('paletteList').onclick = function (e) { var r = e.target.closest('.pal-item'); if (r) palGo(+r.dataset.i); };
  $('palette').onclick = function (e) { if (e.target === this) palClose(); };

  // ── learning path ──
  var PATHS = {
    CKA: { title: 'CKA — Certified Kubernetes Administrator', mods: [1, 2, 3, 4, 5, 6, 8, 13, 14], labs: ['s01-pending-cpu', 's02-imagepull', 's03-oomkilled', 's04-no-endpoints', 's07-scheduling', 's13-pvc-pending', 's14-statefulset-pvc', 's15-quota-limits', 's17-drain-cordon', 's20-pdb-spread', 's23-gateway-api', 's29-svc-targetport', 's34-nodeselector', 's35-taint-toleration', 's44-static-pv', 's46-pdb-blocks-drain', 's49-clusterrole-nodes', 's63-etcd-backup', 's64-jsonpath-nodes', 's28-incident', 's97-pv-retain', 's98-drain-bare-pod', 's99-noexecute-eviction', 's100-hpa-unknown', 's101-clusterrole-reuse', 's102-httproute-fix', 's110-default-deny'], quiz: 'CKA' },
    CKAD: { title: 'CKAD — Certified Kubernetes Application Developer', mods: [19, 3, 4, 7, 15, 16], labs: ['s02-imagepull', 's05-config-error', 's06-rollout-rollback', 's08-probes', 's09-jobs', 's10-sidecar', 's16-hpa', 's18-secret-env', 's19-ingress', 's25-kustomize', 's31-init-container', 's33-cm-volume', 's39-rollout-revision', 's40-cronjob-fix', 's55-image-pull-secret', 's60-canary-weights', 's66-imperative-speedrun', 's100-hpa-unknown', 's103-job-parallel', 's104-cronjob-policy', 's105-startup-probe', 's106-config-injection', 's107-rolling-strategy', 's108-old-apiversion', 's111-secret-volume'], quiz: 'CKAD' },
    CKS: { title: 'CKS — Certified Kubernetes Security Specialist', mods: [9, 17, 18], labs: ['s11-rbac-sa', 's12-netpol-isolate', 's21-psa-restricted', 's22-sa-token', 's26-multitenant', 's27-image-scan', 's49-clusterrole-nodes', 's50-rolebinding-wrong-role', 's51-netpol-egress', 's52-netpol-namespace', 's53-psa-baseline', 's54-hostpath-baseline', 's101-clusterrole-reuse', 's109-seccomp-default', 's110-default-deny', 's111-secret-volume', 's112-audit-hunt', 's113-open-binding', 's114-psa-rollout'], quiz: 'CKS' }
  };
  var pathTrack = 'CKA'; KL.PATHS = PATHS; KL.setPathTrack = function (t) { if (PATHS[t]) pathTrack = t; };
  function renderPath() {
    var root = $('pathRoot'); if (!root) return; var P = PATHS[pathTrack], mods = typeof MODULES !== 'undefined' ? MODULES : [];
    var steps = []; P.mods.forEach(function (n) { var m = mods[n - 1]; if (m) steps.push({ k: 'mod', id: n, t: m.title, sub: 'Module ' + m.num + ' · ' + m.level, done: store.moduleDone(n), a: function () { showPage('modules'); openModule(n - 1); } }); });
    P.labs.forEach(function (id) { var l = KL.Labs.byId[id]; if (l) steps.push({ k: 'lab', t: l.title, sub: 'Lab ' + l.num + ' · ' + l.diff + ' · ' + l.time, done: store.labDone(id), h: '#lab/' + id }); });
    steps.push({ k: 'quiz', t: P.quiz + ' quiz round', sub: '20 questions · spaced repetition', done: false, a: function () { showPage('quiz'); startQuiz({ track: P.quiz }); } });
    steps.push({ k: 'exam', t: 'Timed exam simulation', sub: 'Pass mark 66%', done: store.data().exams.some(function (e) { return e.track === pathTrack && e.pct >= 66; }), h: '#exam' });
    var done = steps.filter(function (s) { return s.done; }).length;
    root.innerHTML = '<div class="section-header"><div class="section-tag">Roadmap</div><h2 class="section-title">Learning path</h2><p class="section-desc">A suggested order: learn the concept, practise the failure, then test yourself. Checkmarks come from your saved progress.</p></div><div class="an-tabs">' + Object.keys(PATHS).map(function (k) { return '<button class="an-tab' + (k === pathTrack ? ' active' : '') + '" data-p="' + k + '">' + k + '</button>'; }).join('') + '</div><h3 class="path-h">' + P.title + ' <span class="path-pct">' + Math.round(done / steps.length * 100) + '%</span></h3><div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:' + Math.round(done / steps.length * 100) + '%"></div></div><ol class="path-list">' + steps.map(function (s, i) { return '<li class="path-step ' + s.k + (s.done ? ' done' : '') + '"><a ' + (s.h ? 'href="' + s.h + '"' : 'href="#path" data-i="' + i + '"') + '><span class="path-dot">' + (s.done ? '✓' : (s.k === 'mod' ? '📚' : s.k === 'lab' ? '🧪' : s.k === 'quiz' ? '✦' : '⏱')) + '</span><span class="path-t">' + esc(s.t) + '</span><span class="path-s">' + esc(s.sub) + '</span></a></li>'; }).join('') + '</ol>';
    root.querySelectorAll('.an-tab').forEach(function (b) { b.onclick = function () { pathTrack = b.dataset.p; renderPath(); }; });
    root.querySelectorAll('a[data-i]').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); steps[+a.dataset.i].a(); }; });
  }
  KL.route('path', renderPath); window.addEventListener('kl:store', function () { if ($('page-path').classList.contains('active')) renderPath(); });

  // ── progress page ──
  function renderProgress() {
    var root = $('progressRoot'); if (!root) return; var d = store.data(), L = KL.Labs.list, labsDone = L.filter(function (l) { return store.labDone(l.id); }).length, md = typeof MODULES !== 'undefined' ? MODULES.length : 0, modDone = Object.keys(d.modules).length, q = d.quiz, seen = Object.keys(q).length, boxes = [0, 0, 0, 0, 0], due = KL.quizDueCount ? KL.quizDueCount() : 0;
    Object.keys(q).forEach(function (k) { boxes[Math.min(4, q[k].box || 0)]++; });
    var days = []; for (var i = 27; i >= 0; i--) { var dt = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); days.push('<i class="' + (d.days.indexOf(dt) >= 0 ? 'on' : '') + '" title="' + dt + '"></i>'); }
    var bestExam = d.exams.reduce(function (m, e) { return Math.max(m, e.pct); }, 0);
    root.innerHTML = '<div class="section-header"><div class="section-tag">Your data</div><h2 class="section-title">My progress</h2><p class="section-desc">Stored only in this browser (localStorage). Nothing is uploaded. Export a backup or move it to another device.</p></div>' +
      '<div class="pg-grid"><div class="pg-card"><b>' + labsDone + ' / ' + L.length + '</b><span>interactive labs</span></div><div class="pg-card"><b>' + modDone + ' / ' + md + '</b><span>modules</span></div><div class="pg-card"><b>' + seen + ' / ' + ((KL.quizAll || []).length) + '</b><span>questions seen</span></div><div class="pg-card"><b>' + due + '</b><span>due for review</span></div><div class="pg-card"><b>🔥 ' + store.streak() + '</b><span>day streak</span></div><div class="pg-card"><b>' + (d.exams.length ? bestExam + '%' : '—') + '</b><span>best exam</span></div></div>' +
      '<h3 class="path-h">Last 28 days</h3><div class="pg-days">' + days.join('') + '</div><h3 class="path-h">Quiz boxes (spaced repetition)</h3><div class="pg-boxes">' + boxes.map(function (n, i) { return '<div><i style="height:' + Math.min(100, n * 3 + 4) + 'px"></i><span>Box ' + (i + 1) + '</span><b>' + n + '</b></div>'; }).join('') + '</div>' +
      (due ? '<button class="btn-primary" id="pgDue">Review ' + due + ' due questions</button> ' : '') +
      '<div class="pg-actions"><button class="btn-secondary" id="pgExp">⬇ Export progress (JSON)</button><label class="btn-secondary" style="cursor:pointer">⬆ Import<input type="file" id="pgImp" accept="application/json" hidden></label><button class="btn-secondary" id="pgRst">Reset all</button></div><p class="ex-note" id="pgMsg">' + (store.persistent() ? '' : '⚠ Browser storage is blocked (private mode?) — progress will be lost when you close the tab. Use Export.') + '</p>';
    if (navigator.storage && navigator.storage.estimate) Promise.all([navigator.storage.estimate(), navigator.storage.persisted ? navigator.storage.persisted() : false, KL.sessions ? KL.sessions.keys() : []]).then(function (r) { var el = $('pgStore'); if (el) el.textContent = 'Storage: ' + (r[1] ? '🔒 persistent (the browser will not clear it automatically)' : '⚠ not marked persistent — the browser may clear it if the device is low on space; export a backup') + ' · using ' + Math.round((r[0].usage || 0) / 1024 / 1024 * 10) / 10 + ' MB · ' + r[2].length + ' saved lab session(s)'; }).catch(function () { /* ignore */ });
    if ($('pgDue')) $('pgDue').onclick = function () { showPage('quiz'); startQuiz({ mode: 'due' }); };
    $('pgExp').onclick = function () { try { localStorage.setItem('kubelab:lastExport', String(Date.now())); } catch (e) { /* ignore */ } var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([store.exportJSON()], { type: 'application/json' })); a.download = 'kubelab-progress-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000); };
    $('pgImp').onchange = function () { var f = this.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { try { store.importJSON(rd.result); $('pgMsg').textContent = '✓ Progress imported.'; renderProgress(); } catch (e) { $('pgMsg').textContent = '✗ ' + e.message; } }; rd.readAsText(f); };
    $('pgRst').onclick = function () { if (confirm('Delete ALL saved progress in this browser?')) { store.reset(); renderProgress(); } };
  }
  KL.route('progress', renderProgress);

  // ── compare page ──
  function renderCompare() {
    var root = $('compareRoot'); if (!root) return;
    var rows = [['Price', 'Free', 'Free tier + paid', 'Paid', 'Paid sessions', 'Free'], ['Ads / tracking', 'None / none', 'Varies', 'Varies', 'Varies', 'Varies'], ['Works offline', 'Yes (PWA + single file)', 'No', 'No', 'No', 'No'], ['Needs account', 'No', 'Yes', 'Yes', 'Yes', 'No'], ['Real clusters', 'Optional: kind lab packs (you run)', 'Yes (cloud VMs)', 'Yes (cloud)', 'Yes (exam-like)', 'Simulated'], ['In-browser simulator', 'Yes (teaching model)', 'No', 'No', 'No', 'Yes'], ['Auto-checked labs', 'Yes', 'Yes', 'Yes', 'Scored', 'Partly'], ['Timed exam mode', 'Yes (simulated)', 'Partly', 'Mock exams', 'Yes (the real thing)', 'Partly'], ['Open source', 'Yes (MIT)', 'Partly', 'No', 'No', 'Varies']];
    root.innerHTML = '<div class="section-header"><div class="section-tag">Honest comparison</div><h2 class="section-title">Where KubeLab fits</h2><p class="section-desc">KubeLab is a free, offline-first <b>practice companion</b>. It is not a replacement for a real cluster or for the paid exam simulators — it is the cheap, instant, no-signup way to drill commands and failure modes before you use them.</p></div><div class="cmp-wrap"><table class="cmp"><thead><tr><th></th><th class="me">KubeLab</th><th>iximiuz Labs</th><th>KodeKloud</th><th>Killer.sh</th><th>Browser simulators</th></tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return (i ? '<td' + (i === 1 ? ' class="me"' : '') + '>' : '<th scope="row">') + esc(c) + (i ? '</td>' : '</th>'); }).join('') + '</tr>'; }).join('') + '</tbody></table></div><p class="ex-note">Competitor details are summarised from public information and may change — check each site. Use paid exam simulators (e.g. killer.sh, included with the CKA/CKAD/CKS purchase) for the final week.</p><div class="cmp-notes"><div><h4>Use KubeLab for</h4><p>Daily drills, error triage practice, kubectl muscle memory, quizzes, a plane/train/no-wifi study session.</p></div><div><h4>Use a real cluster for</h4><p>Networking/CNI behaviour, upgrades, etcd restore, node-level work. The <code>lab-packs/</code> folder gives you the same scenarios on kind.</p></div></div>';
  }
  KL.route('compare', renderCompare);

  // ── hero terminal: staged reveal ──
  function hero() { if (reduce) return; var lines = document.querySelectorAll('.hero-terminal .terminal-body > div'); lines.forEach(function (l, i) { l.style.opacity = 0; setTimeout(function () { l.style.transition = 'opacity .3s'; l.style.opacity = 1; }, 250 + i * 260); }); }
  hero();

  // ── PWA: offline status badge, install, safe updates, storage persistence, backup reminder ──
  (function pwa() {
    var nr = document.querySelector('.nav-right'), badge = document.createElement('span'), inst = document.createElement('button'), st = { done: 0, total: 0, ready: false }, reg = null, wantReload = false;
    badge.id = 'offBadge'; badge.className = 'off-badge'; badge.setAttribute('role', 'status'); badge.hidden = true; inst.id = 'installBtn'; inst.className = 'nav-icon-btn'; inst.textContent = '⬇ Install'; inst.hidden = true; inst.title = 'Install KubeLab as an app (works offline)';
    if (nr) { nr.insertBefore(badge, nr.firstChild); nr.insertBefore(inst, nr.firstChild); }
    function paint() {
      var on = navigator.onLine; badge.hidden = false;
      if (!('serviceWorker' in navigator) || location.protocol.indexOf('http') !== 0) { badge.hidden = location.protocol === 'file:' ? false : true; badge.className = 'off-badge ok'; badge.textContent = location.protocol === 'file:' ? '✓ offline file' : ''; return; }
      if (!on) { badge.className = 'off-badge off'; badge.textContent = st.ready ? '✈ Offline · all features work' : '✈ Offline'; }
      else if (st.ready) { badge.className = 'off-badge ok'; badge.textContent = '✓ Works offline'; badge.title = 'Everything is cached in this browser. Version ' + (st.version || ''); }
      else if (st.total) { badge.className = 'off-badge wait'; badge.textContent = '⬇ Caching ' + st.done + '/' + st.total; }
      else { badge.hidden = true; }
    }
    KL.pwa = { status: function () { return { ready: st.ready, done: st.done, total: st.total, version: st.version }; } };
    window.addEventListener('online', paint); window.addEventListener('offline', paint);
    var deferred = null; window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; inst.hidden = false; });
    window.addEventListener('appinstalled', function () { inst.hidden = true; deferred = null; KL.toast && KL.toast('KubeLab installed ✓'); });
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !navigator.standalone && !(window.matchMedia && matchMedia('(display-mode: standalone)').matches);
    if (ios) { inst.hidden = false; inst.textContent = '⬇ Add to Home Screen'; }
    inst.onclick = function () { if (deferred) { deferred.prompt(); deferred.userChoice.finally(function () { deferred = null; inst.hidden = true; }); } else if (ios) KL.toast && KL.toast('Tap Share, then “Add to Home Screen” to install.', { sticky: true }); };
    function onMsg(e) { var d = e.data || {}; if (d.type === 'precache') { if (st.ready && navigator.serviceWorker.controller) return; st.done = d.done; st.total = d.total; st.version = d.version; st.ready = d.done >= d.total && d.total > 0; paint(); } else if (d.type === 'ready') { st.ready = true; st.version = d.version; paint(); persist(); } else if (d.type === 'version') { st.version = d.version; paint(); } }
    function persist() { if (KL.persistStorage) KL.persistStorage().then(function (ok) { KL.storagePersisted = ok; }); }
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.addEventListener('message', onMsg);
      navigator.serviceWorker.addEventListener('controllerchange', function () { if (wantReload) location.reload(); });
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').then(function (r) {
          reg = r;
          // already installed from an earlier visit → ready right away
          if (r.active && navigator.serviceWorker.controller) { st.ready = true; paint(); persist(); navigator.serviceWorker.controller.postMessage('VERSION'); }
          if (r.waiting && navigator.serviceWorker.controller) offerUpdate(r.waiting);
          r.addEventListener('updatefound', function () { var w = r.installing; if (!w) return; w.addEventListener('statechange', function () { if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w); }); });
          setInterval(function () { r.update().catch(function () { /* offline */ }); }, 6 * 3600 * 1000);
        }).catch(function () { /* unsupported */ });
      });
    } else paint();
    function offerUpdate(w) { KL.toast && KL.toast('A new version of KubeLab is ready (your labs are saved).', { sticky: true, action: { label: 'Reload', fn: function () { wantReload = true; w.postMessage('SKIP_WAITING'); } } }); }
    paint();
  })();
  (function backupReminder() {
    try {
      var d = store.data(), active = Object.keys(d.labs).length + d.exams.length + Object.keys(d.quiz).length > 8, last = +localStorage.getItem('kubelab:lastExport') || 0, asked = +localStorage.getItem('kubelab:remind') || 0, now = Date.now();
      if (active && now - last > 14 * 864e5 && now - asked > 7 * 864e5) setTimeout(function () { localStorage.setItem('kubelab:remind', String(now)); KL.toast && KL.toast('Back up your progress — it only lives in this browser.', { sticky: true, action: { label: 'Export', fn: function () { location.hash = 'progress'; } } }); }, 4000);
    } catch (e) { /* ignore */ }
  })();
  // initial route handlers for pages already visible when scripts ran are called by routeFromHash() in index.html
})();
