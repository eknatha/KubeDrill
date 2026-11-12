/* UI3: aurora hero extras, Settings and privacy, Break-it challenge, incident war room, live cluster canvas. Offline, no deps, local only. */
(function () {
  'use strict';
  var KL = window.KL, store = KL.store;
  function $(i) { return document.getElementById(i); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* blocked */ } return null; }
  function motionOn() { return document.documentElement.getAttribute('data-motion') !== 'off'; }
  function mmss(s) { s = Math.max(0, Math.round(s)); return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2); }
  function toast(m) { if (KL.toast) KL.toast(m); }
  function labsList() { return (KL.Labs && KL.Labs.list) || []; }
  function pageOn(n) { var p = $('page-' + n); return !!(p && p.classList.contains('active')); }
  var TICK = '<span class="u3-tick"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>';

  // ───────── palette entries ─────────
  KL.palExtra = [
    { k: 'PAGE', t: 'Settings and privacy', go: function () { location.hash = '#settings'; } },
    { k: 'PAGE', t: 'Why KubeDrill is free (comparison)', go: function () { location.hash = '#why'; } },
    { k: 'PAGE', t: 'Break-it challenge', go: function () { location.hash = '#break'; } }
  ];

  // ───────── hero: command marquee; zero counter ─────────
  function heroExtras() {
    var proof = document.getElementById('mqSlot');
    if (proof && !document.querySelector('.hero-mq')) {
      var c = ['kubectl describe pod', 'kubectl rollout undo', 'kubectl top nodes', 'kubectl auth can-i', 'kubectl drain node', 'kubectl logs --previous', 'kubectl port-forward', 'kubectl get events'];
      var h = c.concat(c).map(function (x) { return '<span>' + x + '</span>'; }).join('');
      var d = document.createElement('div'); d.className = 'hero-mq'; d.setAttribute('aria-hidden', 'true'); d.innerHTML = '<div>' + h + '</div>';
      proof.appendChild(d);
    }
    var z = $('zeroN');
    if (z && !z.dataset.u3) {
      z.dataset.u3 = '1';
      if (!motionOn() || !window.IntersectionObserver) return;
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return; io.disconnect();
        var steps = [49, 29, 12, 3, 0], i = 0; z.textContent = '$' + steps[0];
        var t = setInterval(function () { i++; z.textContent = '$' + steps[Math.min(i, steps.length - 1)]; if (i >= steps.length - 1) clearInterval(t); }, 420);
      }, { threshold: .6 });
      io.observe(z);
    }
  }

  // ───────── settings and privacy ─────────
  function seg(id, opts, cur) { return '<div class="seg" role="group" id="' + id + '">' + opts.map(function (o) { return '<button type="button" data-v="' + o[0] + '" aria-pressed="' + (o[0] === cur) + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
  function applyMotionAttr() { var m = ls('kl.motion'); var off = m === 'off' || (m !== 'on' && window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); document.documentElement.setAttribute('data-motion', off ? 'off' : 'on'); }
  function dl(name, text, type) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); }
  function renderSettings() {
    var root = $('settingsRoot'); if (!root) return;
    var theme = ls('kubelab:theme') || 'system', motion = ls('kl.motion') || 'system', skin = ls('kl.skin') || 'default', fs = ls('kl.tfs') || '13', mode = ls('kl.labmode') || 'learn';
    var d = store.data(), done = labsList().filter(function (l) { return store.labDone(l.id); }).length, kb = Math.max(1, Math.round(store.exportJSON().length / 1024));
    var skins = [['default', 'Default'], ['matrix', 'Green phosphor'], ['amber', 'Amber'], ['solar', 'Solarized dark'], ['paper', 'Paper (light)'], ['contrast', 'High contrast']];
    root.innerHTML =
      '<div class="section-header"><div class="section-tag">Settings and privacy</div><h2 class="section-title">Your preferences, your data</h2><p class="section-desc">Everything here is stored in this browser only. There is no account and nothing is uploaded.</p></div>' +
      '<div class="set-grid">' +
      '<div class="u3-card"><div class="u3-eyebrow">Look and feel</div>' +
      '<div class="set-row"><div><b>Theme</b><small>System follows your device.</small></div>' + seg('setTheme', [['dark', 'Dark'], ['light', 'Light'], ['system', 'System']], theme) + '</div>' +
      '<div class="set-row"><div><b>Motion</b><small>Turns off animated backgrounds, traffic dots and ghost typing.</small></div>' + seg('setMotion', [['on', 'On'], ['off', 'Off'], ['system', 'System']], motion) + '</div>' +
      '<div class="set-row"><div><b>Terminal skin</b></div><select id="setSkin" aria-label="Terminal skin">' + skins.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === skin ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="set-row"><div><b>Terminal text size</b></div><select id="setFs" aria-label="Terminal text size">' + ['12', '13', '14', '16', '18'].map(function (n) { return '<option value="' + n + '"' + (n === fs ? ' selected' : '') + '>' + n + ' px</option>'; }).join('') + '</select></div>' +
      '<div class="set-row"><div><b>Default lab mode</b><small>Learn shows hints. Exam and Real do not.</small></div>' + seg('setMode', [['learn', 'Learn'], ['exam', 'Exam'], ['real', 'Real']], mode) + '</div>' +
      '</div>' +
      '<div class="u3-card"><div class="u3-eyebrow">Your data</div>' +
      '<div class="set-stat"><div><b>' + done + '</b>labs fixed</div><div><b>' + (d.days || []).length + '</b>days practised</div><div><b>' + kb + ' KB</b>saved here</div></div>' +
      '<p style="font-size:13.5px;color:var(--text2);line-height:1.55;margin:6px 0 0">' + (store.persistent() ? 'Progress is saved in this browser.' : 'This browser is blocking storage, so progress lasts only until you close the tab. Use Backup before leaving.') + '</p>' +
      '<div class="set-actions"><button class="btn-primary" id="setBackup" type="button">Backup (JSON)</button><button class="btn-secondary" id="setRestore" type="button">Restore from file</button><input type="file" id="setFile" accept="application/json,.json" hidden></div>' +
      '<div class="set-actions"><button class="btn-secondary" id="setResetPrefs" type="button">Reset preferences</button><button class="btn-danger" id="setClear" type="button">Clear all progress</button></div>' +
      '</div></div>' +
      '<p class="u3-warn" style="margin-top:16px">Never paste real kubeconfigs, tokens or private keys into a lab terminal. KubeDrill blocks common secret formats on paste, but that is a guard, not a guarantee. Clearing your browser data also removes progress, so take a backup first.</p>';
    function bindSeg(id, fn) { var g = $(id); g.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; g.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); fn(b.dataset.v); }; }
    bindSeg('setTheme', function (v) { if (v === 'system') { ls('kubelab:theme', null); document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; } else { ls('kubelab:theme', v); document.documentElement.dataset.theme = v; } });
    bindSeg('setMotion', function (v) { ls('kl.motion', v === 'system' ? null : v); applyMotionAttr(); });
    bindSeg('setMode', function (v) { ls('kl.labmode', v); });
    $('setSkin').onchange = function () { ls('kl.skin', this.value); };
    $('setFs').onchange = function () { ls('kl.tfs', this.value); };
    $('setBackup').onclick = function () { dl('kubedrill-progress-' + new Date().toISOString().slice(0, 10) + '.json', store.exportJSON()); ls('kubelab:lastExport', String(Date.now())); toast('Backup downloaded'); };
    $('setRestore').onclick = function () { $('setFile').click(); };
    $('setFile').onchange = function () { var f = this.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { try { store.importJSON(String(rd.result)); toast('Progress restored'); renderSettings(); } catch (e) { toast('That file is not a KubeDrill backup'); } }; rd.readAsText(f); };
    $('setResetPrefs').onclick = function () { if (!confirm('Reset theme, motion, terminal and lab-mode preferences? Your progress is kept.')) return; ['kubelab:theme', 'kl.motion', 'kl.skin', 'kl.tfs', 'kl.labmode', 'kl.layout', 'kl.labview', 'kl.cvs', 'kl.blast'].forEach(function (k) { ls(k, null); }); document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; applyMotionAttr(); toast('Preferences reset'); renderSettings(); };
    $('setClear').onclick = function () {
      if (!confirm('Delete ALL progress, saved lab sessions and challenge times from this browser? This cannot be undone. Tip: make a backup first.')) return;
      store.reset(); try { Object.keys(localStorage).filter(function (k) { return /^kubelab:sess:/.test(k) || k === 'kl.break' || k === 'kl.daily'; }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) { /* ignore */ }
      toast('All progress cleared'); renderSettings();
    };
  }
  KL.route('settings', renderSettings);

  // ───────── break-it challenge ─────────
  var ACT = 'kl.break.active';
  function actGet() { try { return JSON.parse(sessionStorage.getItem(ACT) || 'null'); } catch (e) { return null; } }
  function actSet(a) { try { if (a) sessionStorage.setItem(ACT, JSON.stringify(a)); else sessionStorage.removeItem(ACT); } catch (e) { /* ignore */ } }
  function bk() { try { return JSON.parse(ls('kl.break') || '{}') || {}; } catch (e) { return {}; } }
  function newSeed() { var s = ''; for (var i = 0; i < 4; i++) s += Math.floor(Math.random() * 16).toString(16); return s; }
  function seedNum(s) { var n = parseInt(s, 16); if (isNaN(n)) { n = 0; for (var i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0; } return n; }
  function labFor(seed) { var L = labsList(); return L.length ? L[seedNum(seed) % L.length] : null; }
  function limitFor(l) { return l.diff === 'Beginner' ? 360 : l.diff === 'Intermediate' ? 600 : 900; }
  var HINT_PEN = 30;
  function remaining(a) { var hints = 0; try { hints = Math.max(0, store.hintsUsed(a.id) - (a.h0 || 0)); } catch (e) { /* none */ } return a.limit - ((Date.now() - a.start) / 1000 + hints * HINT_PEN); }
  function renderBreak(rest) {
    var root = $('breakRoot'); if (!root) return;
    var seed = String(rest || '').split('/')[0].replace(/[^a-z0-9]/gi, '').slice(0, 12).toLowerCase();
    if (!seed) { seed = newSeed(); try { history.replaceState(null, '', '#break/' + seed); } catch (e) { /* ignore */ } }
    var lab = labFor(seed); if (!lab) { root.innerHTML = '<p class="cvs-none">No labs loaded.</p>'; return; }
    var lim = limitFor(lab), n = lab.tasks ? lab.tasks.length : 0, a = actGet(), mine = a && a.seed === seed ? a : null;
    var runs = (bk().runs || {})[seed] || [], best = runs.length ? Math.min.apply(null, runs) : 0, last = runs.length ? runs[runs.length - 1] : 0, first = runs.length ? runs[0] : 0, mx = Math.max.apply(null, [lim].concat(runs));
    var bars = runs.length ? [['Your best', best, '#22c55e'], ['Your last try', last, '#38bdf8'], ['First attempt', first, '#64748b']].map(function (b) { return '<div><div class="row"><span>' + b[0] + '</span><span>' + mmss(b[1]) + '</span></div><div class="bar"><i style="width:' + Math.max(6, Math.round(100 * (1 - b[1] / mx) + 6)) + '%;background:' + b[2] + '"></i></div></div>'; }).join('') : '<p style="color:var(--text2);font-size:14px;line-height:1.5;margin:0">No attempts yet. Times are saved on this device only.</p>';
    var url = location.origin.replace(/^null$/, '') + location.pathname + '#break/' + seed;
    root.innerHTML =
      '<div class="section-header"><div class="section-tag">Break-it challenge</div><h2 class="section-title">Fix the cluster before the clock runs out</h2><p class="section-desc">Challenge <b>' + esc(seed) + '</b>. The same number gives the same broken cluster to anyone who opens the link.</p></div>' +
      '<div class="brk"><div class="u3-card"><div class="brk-ring"><svg width="150" height="150" viewBox="0 0 150 150" role="img" aria-label="Time limit"><circle cx="75" cy="75" r="64" fill="none" stroke="rgba(148,163,184,.25)" stroke-width="10"/><circle id="brkFg" class="fg" cx="75" cy="75" r="64" fill="none" stroke="#38bdf8" stroke-width="10" stroke-linecap="round" stroke-dasharray="402" stroke-dashoffset="0" transform="rotate(-90 75 75)"/><text id="brkTime" x="75" y="82" text-anchor="middle" fill="currentColor" font-size="28" font-weight="700" font-family="monospace">' + mmss(mine ? remaining(mine) : lim) + '</text><text x="75" y="102" text-anchor="middle" fill="currentColor" opacity=".6" font-size="11">' + (mine ? 'left' : 'time limit') + '</text></svg>' +
      '<div class="brk-info"><b><span class="dot"></span>' + n + ' task' + (n === 1 ? '' : 's') + ' to fix</b><p style="color:var(--text2);font-size:14px;line-height:1.55;margin:8px 0 0">' + esc(lab.title) + ' · ' + esc(lab.diff) + '. Each hint adds ' + HINT_PEN + ' seconds to your time.</p><div class="set-actions"><button class="btn-primary" id="brkStart" type="button">' + (mine ? 'Back to the lab' : 'Start challenge') + '</button><button class="btn-secondary" id="brkNew" type="button">New challenge</button></div></div></div></div>' +
      '<div class="u3-card brk-bars"><div class="u3-eyebrow" style="margin-bottom:12px">Your times on this device</div>' + bars + '</div></div>' +
      '<div class="u3-card brk-share"><div style="flex:1 1 260px"><b>Challenge a friend</b><div style="color:var(--text2);font-size:13.5px;margin-top:4px;line-height:1.5">The link holds only the challenge number. Nothing is uploaded.</div></div><div class="url" id="brkUrl">' + esc(url) + '</div><button class="btn-secondary" id="brkCopy" type="button">Copy</button></div>' +
      '<p class="u3-warn" style="margin-top:14px">This breaks the practice cluster only. Never run these commands against a real cluster.</p>';
    $('brkNew').onclick = function () { location.hash = '#break/' + newSeed(); };
    $('brkCopy').onclick = function () { var done = function () { toast('Link copied'); }; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { toast('Select the link and copy it'); }); else toast('Select the link and copy it'); };
    $('brkStart').onclick = function () { if (mine) { location.hash = '#lab/' + lab.id; return; } startChallenge(seed, lab, lim); };
  }
  function startChallenge(seed, lab, lim) {
    var h0 = 0; try { h0 = store.hintsUsed(lab.id); } catch (e) { /* none */ }
    actSet({ seed: seed, id: lab.id, start: Date.now(), limit: lim, h0: h0, over: 0 });
    ls('kubelab:sess:' + lab.id, null); location.hash = '#lab/' + lab.id;
    var tries = 0, iv = setInterval(function () {
      tries++; var b = $('lrReset');
      if (b && document.querySelector('#labRunner .lr-title')) { clearInterval(iv); var oc = window.confirm; window.confirm = function () { return true; }; try { b.click(); } finally { window.confirm = oc; } }
      else if (tries > 40) clearInterval(iv);
    }, 100);
  }
  KL.route('break', renderBreak);
  function pill() {
    var a = actGet(), p = $('brkPill');
    if (!a || !pageOn('lab')) { if (p) p.remove(); return; }
    var rem = remaining(a), low = rem < 60;
    if (!p) { p = document.createElement('div'); p.id = 'brkPill'; p.className = 'brk-pill'; p.setAttribute('role', 'timer'); p.innerHTML = '<span>Challenge ' + esc(a.seed) + '</span><b></b><button type="button">Give up</button>'; p.querySelector('button').onclick = function () { actSet(null); p.remove(); toast('Challenge cancelled'); }; document.body.appendChild(p); }
    p.classList.toggle('low', low); p.querySelector('b').textContent = rem >= 0 ? mmss(rem) : '+' + mmss(-rem);
    if (rem < 0 && !a.over) { a.over = 1; actSet(a); toast('Time is up. Keep going, or give up.'); }
  }
  function tickBreakPage() {
    var a = actGet(); if (!a || !pageOn('break')) return; var t = $('brkTime'), fg = $('brkFg'); if (!t || !fg || String(location.hash).indexOf(a.seed) < 0) return;
    var rem = remaining(a); t.textContent = mmss(rem); fg.setAttribute('stroke-dashoffset', String(Math.round(402 * (1 - Math.max(0, Math.min(1, rem / a.limit))))));
  }
  window.addEventListener('kl:labdone', function (e) {
    var a = actGet(); if (!a || !e.detail || e.detail.lab.id !== a.id) return;
    var hints = 0; try { hints = Math.max(0, store.hintsUsed(a.id) - (a.h0 || 0)); } catch (x) { /* none */ }
    var secs = Math.round((Date.now() - a.start) / 1000 + hints * HINT_PEN), d = bk(); d.runs = d.runs || {}; var arr = d.runs[a.seed] = d.runs[a.seed] || [], prevBest = arr.length ? Math.min.apply(null, arr) : Infinity;
    arr.push(secs); if (arr.length > 20) arr.shift(); ls('kl.break', JSON.stringify(d)); actSet(null);
    toast('Challenge done in ' + mmss(secs) + (secs < prevBest && prevBest !== Infinity ? ' · new best!' : '') + (secs > a.limit ? ' (over the limit)' : ''));
    var p = $('brkPill'); if (p) p.remove();
  });

  // ───────── incident war room ─────────
  var war = null;
  function labIdNow() { var m = /^#\/?lab\/([^/?]+)/.exec(location.hash); return m ? m[1] : ''; }
  function simFor(id) { return KL.labRun ? KL.labRun(id).then(function (r) { return r && r.sim; }) : Promise.resolve(null); }
  function warBuild() {
    var id = labIdNow(), lab = KL.Labs && KL.Labs.byId && KL.Labs.byId[id], sp = document.querySelector('#labRunner .lr-split');
    if (!lab || !lab.incident || !sp) { return; }
    if (document.querySelector('#labRunner .war')) return;
    var sev = lab.diff === 'Expert' ? 1 : 2, w = document.createElement('section'); w.className = 'war'; w.setAttribute('aria-label', 'Incident status'); w.dataset.t0 = String(Date.now());
    w.innerHTML = '<div class="war-ban" role="status"><span class="sev">SEV ' + sev + '</span><b>' + esc(lab.title.replace(/^Incident:\s*/i, '')) + '</b><span class="ago">Paged just now</span><span class="clk">00:00</span></div>' +
      '<div class="war-row"><div class="war-run" aria-label="Runbook"><span data-s="1"><i></i>1. Confirm scope</span><span data-s="2"><i></i>2. Stabilise</span><span data-s="3"><i></i>3. Find the root cause</span><span data-s="4"><i></i>4. Read the debrief</span></div><div class="war-health" aria-label="Service health"></div></div>' +
      '<p class="u3-warn war-caution">Under pressure, check your context and namespace before any delete.</p>';
    var before = document.querySelector('#labRunner .lr-mtabs') || sp; before.parentNode.insertBefore(w, before);
    war = { el: w, id: id, sim: null, over: false }; simFor(id).then(function (s) { if (war && war.id === id) { war.sim = s; warUpdate(); } });
  }
  function warUpdate() {
    var w = document.querySelector('#labRunner .war'); if (!w) return; var lab = KL.Labs.byId[labIdNow()]; if (!lab) return;
    var el = (Date.now() - (+w.dataset.t0)) / 1000, ban = w.querySelector('.war-ban'); w.querySelector('.clk').textContent = mmss(el);
    w.querySelector('.ago').textContent = ban.classList.contains('ok') ? 'Resolved' : (el < 60 ? 'Paged just now' : 'Paged ' + Math.floor(el / 60) + ' min ago');
    var tasks = document.querySelectorAll('#lrTasks .lr-task'), ok = document.querySelectorAll('#lrTasks .lr-task.ok').length, cmds = document.querySelectorAll('#lrOut .lr-o.cmd').length, deb = !!document.querySelector('#lrFeedback .lr-debrief');
    if (tasks.length && ok === tasks.length) ban.classList.add('ok'); else ban.classList.remove('ok');
    var st = { 1: cmds > 0 ? 'done' : 'on', 2: ok > 0 ? 'done' : (cmds > 0 ? 'on' : ''), 3: tasks.length && ok === tasks.length ? 'done' : (ok > 0 ? 'on' : ''), 4: deb ? 'done' : (tasks.length && ok === tasks.length ? 'on' : '') };
    w.querySelectorAll('.war-run span').forEach(function (s) { s.className = st[s.dataset.s] || ''; });
    var s = war && war.sim, hb = w.querySelector('.war-health');
    if (s && hb) {
      var rows = [];
      try {
        s.list('Service').filter(function (x) { return !/^kube-/.test(x.metadata.namespace) && x.spec.selector && Object.keys(x.spec.selector).length; }).slice(0, 5).forEach(function (x) {
          var sel = x.spec.selector, want = s.list('Pod', x.metadata.namespace).filter(function (p) { return !/Completed|Succeeded/.test(s.podStatus(p)) && Object.keys(sel).every(function (k) { return (p.metadata.labels || {})[k] === sel[k]; }); }).length, have = s.endpointsFor(x).length, pct = want ? Math.round(100 * have / want) : 0;
          rows.push('<div class="h"><span title="' + esc(x.metadata.name) + '">' + esc(x.metadata.name) + '</span><span class="bar"><i style="width:' + pct + '%;background:' + (!have ? '#ef4444' : have < want ? '#f59e0b' : '#22c55e') + '"></i></span><span>' + have + '/' + want + '</span></div>');
        });
      } catch (e) { /* sim not ready */ }
      hb.innerHTML = rows.length ? rows.join('') : '<div class="h"><span>No services in this lab</span></div>';
    }
  }
  window.addEventListener('kl:labdone', function () { setTimeout(warUpdate, 50); });

  // ───────── live cluster canvas ─────────
  var cv = { sig: '', seen: null, newUntil: {}, sim: null, id: '' };
  function podCls(s, p) {
    var st = s.podStatus(p); if (s.podReady(p) && p.status.phase === 'Running' && !p.metadata.deletionTimestamp) return ['ok', st];
    if (/Completed|Succeeded/.test(st)) return ['done', st]; if (/Terminating/.test(st)) return ['term', st];
    if (/^(Pending|ContainerCreating|PodInitializing|Init:\d)/.test(st)) return ['wait', st]; return ['bad', st];
  }
  var COL = { ok: '#22c55e', wait: '#f59e0b', bad: '#ef4444', term: '#94a3b8', done: '#64748b', nw: '#38bdf8' };
  function cvDraw() {
    var host = $('lrCvs'); if (!host || host.hidden || !cv.sim) return; var s = cv.sim, now = Date.now();
    var pods = s.list('Pod').filter(function (p) { return !/^kube-/.test(p.metadata.namespace); }), nodes = s.list('Node', '').map(function (n) { return n.metadata.name; });
    var svcs = s.list('Service').filter(function (x) { return !/^kube-/.test(x.metadata.namespace) && !(x.metadata.namespace === 'default' && x.metadata.name === 'kubernetes') && x.spec.selector && Object.keys(x.spec.selector).length; });
    var per = {}, first = cv.seen === null; if (first) cv.seen = {};
    pods.forEach(function (p) {
      var k = p.metadata.namespace + '/' + p.metadata.name; if (!cv.seen[k]) { cv.seen[k] = 1; if (!first) cv.newUntil[k] = now + 5000; }
      var nm = p.spec.nodeName && nodes.indexOf(p.spec.nodeName) >= 0 ? p.spec.nodeName : ''; (per[nm] = per[nm] || []).push(p);
    });
    var cols = nodes.slice(); if ((per[''] || []).length) cols.push('');
    var sig = JSON.stringify([motionOn(), cols.map(function (n) { return [n, (per[n] || []).map(function (p) { var k = p.metadata.namespace + '/' + p.metadata.name, c = podCls(s, p); return [k, c[1], (cv.newUntil[k] || 0) > now ? 1 : 0]; })]; }), svcs.map(function (x) { return [x.metadata.name, s.endpointsFor(x).map(function (p) { return p.metadata.name; })]; })]);
    if (sig === cv.sig) return; cv.sig = sig;
    if (!cols.length) { host.innerHTML = '<div class="cvs-none">No nodes to draw yet.</div>'; return; }
    var W = 1060, gap = 18, nw = Math.min(300, (W - gap * (cols.length - 1)) / cols.length), total = nw * cols.length + gap * (cols.length - 1), x0 = (W - total) / 2, perRow = Math.max(1, Math.floor((nw - 20) / 62));
    var maxRows = 1; cols.forEach(function (n) { maxRows = Math.max(maxRows, Math.ceil(((per[n] || []).length || 1) / perRow)); });
    var topH = 110, nh = 56 + maxRows * 64, H = topH + nh + 10, pos = {}, out = '';
    cols.forEach(function (n, ci) {
      var nx = x0 + ci * (nw + gap); out += '<rect x="' + nx + '" y="' + topH + '" width="' + nw + '" height="' + nh + '" rx="14" fill="rgba(148,163,184,.07)" stroke="rgba(148,163,184,.35)"/><text x="' + (nx + 14) + '" y="' + (topH + 26) + '" font-size="13" font-weight="600" fill="currentColor">' + esc(n || 'Unscheduled') + '</text>';
      (per[n] || []).sort(function (a, b) { return a.metadata.name < b.metadata.name ? -1 : 1; }).forEach(function (p, i) {
        var px = nx + 12 + (i % perRow) * 62, py = topH + 40 + Math.floor(i / perRow) * 64, k = p.metadata.namespace + '/' + p.metadata.name, c = podCls(s, p), isNew = (cv.newUntil[k] || 0) > now, col = COL[isNew && c[0] !== 'bad' ? 'nw' : c[0]], parts = p.metadata.name.split('-'), app = parts.length > 2 ? parts.slice(0, -2).join('-') : parts[0];
        pos[k] = [px + 28, py]; var cls = c[0] === 'bad' ? 'pbad' : 'pd';
        out += '<g class="' + cls + '" style="animation-delay:' + ((i % 5) * .5) + 's"><title>' + esc(k + ' — ' + c[1]) + '</title><rect x="' + px + '" y="' + py + '" width="56" height="56" rx="12" fill="' + col + '22" stroke="' + col + '"/><text x="' + (px + 28) + '" y="' + (py + 23) + '" text-anchor="middle" font-size="9.5" fill="currentColor">' + esc(app.slice(0, 8)) + '</text><circle cx="' + (px + 28) + '" cy="' + (py + 36) + '" r="5" fill="' + col + '"/><text x="' + (px + 28) + '" y="' + (py + 52) + '" text-anchor="middle" font-size="7.5" fill="currentColor" opacity=".7">' + esc(c[1].slice(0, 11)) + '</text></g>';
        if (c[0] === 'bad' && motionOn()) out += '<circle class="rip" cx="' + (px + 28) + '" cy="' + (py + 36) + '" r="6" fill="none" stroke="#ef4444" stroke-width="2"/>';
      });
    });
    var defs = '', lines = '', chips = '', n = Math.max(1, svcs.length), sw = Math.min(190, (W - 20) / n - 12), pc = 0;
    svcs.forEach(function (x, i) {
      var cx = (W / (n + 1)) * (i + 1), eps = s.endpointsFor(x), bad = !eps.length;
      chips += '<rect x="' + (cx - sw / 2) + '" y="8" width="' + sw + '" height="38" rx="12" fill="' + (bad ? 'rgba(239,68,68,.14)' : 'rgba(56,189,248,.12)') + '" stroke="' + (bad ? '#ef4444' : '#38bdf8') + '"/><text x="' + cx + '" y="31" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">' + esc((x.metadata.name.length > 20 ? x.metadata.name.slice(0, 19) + '…' : x.metadata.name) + ' · ' + eps.length + ' ep') + '</text>';
      if (bad) chips += '<path d="M' + (cx - 7) + ' 62 l14 14 M' + (cx + 7) + ' 62 l-14 14" stroke="#ef4444" stroke-width="2.4" stroke-linecap="round"/>';
      eps.slice(0, 8).forEach(function (p, j) {
        var t = pos[p.metadata.namespace + '/' + p.metadata.name]; if (!t || pc > 28) return; var id = 'cvp' + (pc++), d = 'M' + cx + ' 46 C' + cx + ' 80 ' + t[0] + ' 70 ' + t[0] + ' ' + (t[1] - 2);
        defs += '<path id="' + id + '" d="' + d + '"/>'; lines += '<use href="#' + id + '" fill="none" stroke="rgba(148,163,184,.4)" stroke-width="1.4" stroke-dasharray="4 5"/>';
        if (motionOn()) lines += '<circle r="3.6" fill="#38bdf8"><animateMotion dur="' + (2 + (j % 3) * .5) + 's" begin="' + ((pc % 4) * .35) + 's" repeatCount="indefinite"><mpath href="#' + id + '"/></animateMotion></circle>';
      });
    });
    host.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Live cluster: services send requests to ready pods on each node"><defs>' + defs + '</defs>' + lines + chips + out + '</svg>' +
      '<div class="cvs-key"><span><i style="background:#22c55e"></i>Running</span><span><i style="background:#38bdf8"></i>New pod</span><span><i style="background:#f59e0b"></i>Pending</span><span><i style="background:#ef4444"></i>Failing (ripple)</span><span>Dots are requests reaching ready endpoints</span></div>';
  }
  function cvSetup() {
    var tabs = document.querySelector('#labRunner .lr-tabs'), dia = $('lrDia'); if (!tabs || !dia || $('lrTabCvs')) return;
    var host = document.createElement('div'); host.id = 'lrCvs'; host.className = 'cvs'; host.hidden = true; dia.parentNode.insertBefore(host, dia.nextSibling);
    var b = document.createElement('button'); b.id = 'lrTabCvs'; b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', 'false'); b.textContent = 'Canvas'; b.title = 'Animated cluster canvas'; tabs.appendChild(b);
    function on() { var st = $('lrState'); dia.hidden = true; if (st) st.hidden = true; host.hidden = false; b.classList.add('on', 'cv-on'); b.setAttribute('aria-selected', 'true'); ['lrTabDia', 'lrTabTxt'].forEach(function (i) { var t = $(i); if (t) { t.classList.remove('on'); t.setAttribute('aria-selected', 'false'); } }); ls('kl.cvs', '1'); cv.sig = ''; cvLoad(); }
    function off() { host.hidden = true; b.classList.remove('on', 'cv-on'); b.setAttribute('aria-selected', 'false'); ls('kl.cvs', '0'); }
    b.onclick = on; ['lrTabDia', 'lrTabTxt'].forEach(function (i) { var t = $(i); if (t) t.addEventListener('click', off); });
    if (ls('kl.cvs') === '1') on();
  }
  function cvLoad() { var id = labIdNow(); if (!id) return; if (cv.id !== id) { cv = { sig: '', seen: null, newUntil: {}, sim: null, id: id }; } simFor(id).then(function (s) { if (cv.id === id) { cv.sim = s; cv.sig = ''; cvDraw(); } }); }

  // ───────── shared tick ─────────
  function decorate() { warBuild(); cvSetup(); }
  KL.route('lab', function () { war = null; cv = { sig: '', seen: null, newUntil: {}, sim: null, id: '' }; setTimeout(decorate, 120); setTimeout(decorate, 500); setTimeout(function () { if (!$('lrCvs') || $('lrCvs').hidden) return; cvLoad(); }, 600); });
  window.addEventListener('kl:runner', function () { setTimeout(decorate, 60); });
  setInterval(function () {
    if (pageOn('lab')) { warBuild(); warUpdate(); cvDraw(); pill(); } else { var p = $('brkPill'); if (p) p.remove(); }
    if (pageOn('home')) heroExtras();
    tickBreakPage();
  }, 1000);
  document.addEventListener('DOMContentLoaded', heroExtras); heroExtras();
})();
