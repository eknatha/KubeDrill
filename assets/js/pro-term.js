/* Pro terminal layer: smart Tab completion, Ctrl-R history search, line editing, mobile key toolbar,
   cluster time machine (rewind / undo / compare with the reference path) and predict-the-output.
   Everything is local, offline, and sits on top of the runner through KL.runner + the kl:runner / kl:cmd events. */
(function () {
  'use strict';
  var KL = window.KL, Labs = KL.Labs, store = KL.store;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function R() { return KL.runner && KL.runner.cur(); }
  function inExam(r) { var a = KL.exam && KL.exam.active; return !!(a && r && a.ids.indexOf(r.lab.id) >= 0); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* ignore */ } return null; }
  var RO = /^\s*(k|kubectl)\s+(get|describe|logs|top|explain|api-resources|api-versions|version|cluster-info|events|diff|auth\s+can-i|config\s+(view|get|current))\b|^\s*(ls|cat|cd|pwd|echo|grep|head|tail|clear|help|history|env|printenv|whoami|date|wc|find|which|man|alias)\b/;
  KL.proIsReadOnly = function (line) { return RO.test(line) && !/>/.test(line); };

  // ───────── smart Tab completion ─────────
  var VERBS = 'get describe create apply delete run expose scale set rollout logs exec label annotate taint cordon uncordon drain top auth api-resources explain wait patch edit config kustomize events autoscale replace diff version cluster-info'.split(' ');
  var FLAGS = ['--namespace=', '--output=', '--selector=', '--all-namespaces', '--dry-run=client', '--image=', '--replicas=', '--force', '--watch', '--from-literal=', '--container=', '--tail=', '--previous', '--as=', '--ignore-daemonsets', '--delete-emptydir-data', '--show-labels', '--field-selector=', '--sort-by=', '--grace-period=', '--port=', '--target-port=', '--type='];
  var OUT = ['yaml', 'json', 'wide', 'name', 'jsonpath=', 'custom-columns='];
  var SHELL = ['kubectl', 'k', 'ls', 'cat', 'cd', 'mkdir', 'echo', 'vi', 'nano', 'grep', 'help', 'clear', 'trivy', 'etcdctl', 'kubeadm', 'curl', 'wget', 'export', 'awk', 'sed', 'wc', 'head', 'tail', 'sort', 'ssh', 'systemctl', 'journalctl', 'crictl', 'history', 'alias'];
  var NAMESPACED_NAME_VERBS = /^(get|describe|delete|edit|label|annotate|scale|patch|logs|exec|top|expose|autoscale|wait|replace|rollout|set|explain)$/;
  function common(a) { if (!a.length) return ''; var p = a[0]; a.forEach(function (x) { while (x.indexOf(p) !== 0) p = p.slice(0, -1); }); return p; }
  function namesOf(sim, kindTok, ns) {
    try {
      var d = sim.findKind(kindTok.split('/')[0]); if (!d) return [];
      return sim.list(d.kind, d.ns ? ns : '').map(function (o) { return o.metadata.name; });
    } catch (e) { return []; }
  }
  function candidates(r, value) {
    var sim = r.sim, parts = value.split(/\s+/), last = parts[parts.length - 1], prev = parts[parts.length - 2] || '', head = parts[0];
    var ns = sim.ctxNs; for (var i = 0; i < parts.length - 1; i++) { if (/^(-n|--namespace)$/.test(parts[i]) && parts[i + 1]) ns = parts[i + 1]; var m = /^--namespace=(.+)$/.exec(parts[i]); if (m) ns = m[1]; }
    if (parts.length === 1) return { pool: SHELL, last: last, pre: '' };
    if (!/^(kubectl|k)$/.test(head)) {
      var files = []; try { files = Object.keys(sim.fs).filter(function (p) { return p.indexOf('/home/student/') === 0; }).map(function (p) { return p.replace('/home/student/', ''); }); } catch (e) { /* ignore */ }
      return { pool: files, last: last };
    }
    if (/^(-n|--namespace)$/.test(prev)) return { pool: namesOf(sim, 'namespaces', ''), last: last };
    if (/^(-o|--output)$/.test(prev)) return { pool: OUT, last: last };
    if (/^--namespace=/.test(last)) { var ps = namesOf(sim, 'namespaces', '').map(function (x) { return '--namespace=' + x; }); return { pool: ps, last: last }; }
    if (/^--output=|^-o=/.test(last)) return { pool: OUT.map(function (x) { return '--output=' + x; }), last: last };
    if (/^-/.test(last)) return { pool: FLAGS, last: last };
    var pos = parts.slice(1, -1).filter(function (x) { return x && x[0] !== '-' && !/^(-n|--namespace|-o|--output|-l|--selector|-f|-c|--container|--image)$/.test(parts[parts.indexOf(x) - 1] || ''); });
    var verb = pos[0];
    if (!verb) return { pool: VERBS, last: last };
    if (verb === 'config' && pos.length === 1) return { pool: ['use-context', 'get-contexts', 'current-context', 'view', 'set-context'], last: last };
    if (verb === 'rollout' && pos.length === 1) return { pool: ['status', 'undo', 'history', 'restart', 'pause', 'resume'], last: last };
    if (verb === 'set' && pos.length === 1) return { pool: ['image', 'resources', 'env', 'serviceaccount', 'selector'], last: last };
    if (verb === 'auth' && pos.length === 1) return { pool: ['can-i', 'whoami'], last: last };
    if (/^(cordon|uncordon|drain)$/.test(verb)) return { pool: namesOf(sim, 'nodes', ''), last: last };
    if (verb === 'taint') return { pool: pos.length === 1 ? ['nodes'] : namesOf(sim, 'nodes', ''), last: last };
    if (verb === 'top') return { pool: pos.length === 1 ? ['pods', 'nodes'] : namesOf(sim, pos[1] === 'nodes' || pos[1] === 'node' ? 'nodes' : 'pods', ns), last: last };
    if (/^(logs|exec)$/.test(verb)) return { pool: namesOf(sim, 'pods', ns), last: last };
    var kindIdx = (verb === 'rollout' || verb === 'set') ? 2 : 1, kind = pos[kindIdx], pool;
    if (!NAMESPACED_NAME_VERBS.test(verb)) return { pool: [], last: last };
    if (last.indexOf('/') > 0) { var k0 = last.split('/')[0]; return { pool: namesOf(sim, k0, ns).map(function (x) { return k0 + '/' + x; }), last: last }; }
    if (pos.length === kindIdx) { pool = ['pods', 'deployments', 'services', 'nodes', 'namespaces', 'configmaps', 'secrets', 'persistentvolumeclaims', 'persistentvolumes', 'storageclasses', 'ingresses', 'networkpolicies', 'roles', 'rolebindings', 'clusterroles', 'clusterrolebindings', 'serviceaccounts', 'statefulsets', 'daemonsets', 'jobs', 'cronjobs', 'horizontalpodautoscalers', 'poddisruptionbudgets', 'events', 'endpoints', 'replicasets', 'resourcequotas', 'limitranges', 'customresourcedefinitions']; if (verb === 'rollout' || verb === 'set' || verb === 'scale' || verb === 'autoscale' || verb === 'expose') pool = ['deployment', 'statefulset', 'daemonset'].concat(verb === 'expose' ? ['pod', 'service'] : []); return { pool: pool, last: last }; }
    if (kind) return { pool: namesOf(sim, kind, ns), last: last };
    return { pool: [], last: last };
  }
  function smartComplete(inp) {
    var r = R(); if (!r) return;
    var v = inp.value.slice(0, inp.selectionStart == null ? inp.value.length : inp.selectionStart), c = candidates(r, v), last = c.last;
    var m = (c.pool || []).filter(function (x, i, a) { return x.indexOf(last) === 0 && a.indexOf(x) === i; });
    if (!m.length) return;
    var parts = v.split(/\s+/), cp = common(m.slice());
    if (m.length === 1) { parts[parts.length - 1] = m[0]; inp.value = parts.join(' ') + (/[=/]$/.test(m[0]) ? '' : ' '); }
    else if (cp.length > last.length) { parts[parts.length - 1] = cp; inp.value = parts.join(' '); }
    else KL.runner.say(m.slice(0, 40).join('  ') + (m.length > 40 ? '  … +' + (m.length - 40) : ''), 'dim');
  }
  KL.proComplete = function (r, value) { var c = candidates(r, value); return (c.pool || []).filter(function (x) { return x.indexOf(c.last) === 0; }); };

  // ───────── Ctrl-R reverse history search ─────────
  var rs = null;
  function rsEnd(accept, inp) {
    if (!rs) return; var el = rs.el; if (accept && rs.match >= 0) { inp.value = rs.hits[rs.match]; } el.remove(); rs = null; inp.focus();
  }
  function rsPaint() {
    var q = rs.q, r = R(), seen = {}, hits = [];
    for (var i = r.hist.length - 1; i >= 0; i--) { var h = r.hist[i]; if (!seen[h] && (!q || h.indexOf(q) >= 0)) { seen[h] = 1; hits.push(h); } }
    rs.hits = hits; rs.match = hits.length ? Math.min(rs.match < 0 ? 0 : rs.match, hits.length - 1) : -1;
    var m = rs.match >= 0 ? hits[rs.match] : '';
    var hl = q && m ? esc(m).replace(new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), function (x) { return '<mark>' + x + '</mark>'; }) : esc(m);
    rs.el.innerHTML = '<span>(reverse-i-search)</span> <b>`' + esc(q) + '`</b>: <code>' + (hl || '<i>no match</i>') + '</code><em>Enter accept · Ctrl-R older · Esc cancel</em>';
  }
  function rsStart(inp) {
    var line = document.querySelector('.lr-line'); if (!line || rs) return; var el = document.createElement('div'); el.className = 'pro-rs'; line.parentNode.insertBefore(el, line);
    rs = { q: '', hits: [], match: -1, el: el }; rsPaint();
  }

  // ───────── key handling (capture phase, before the runner's own handler) ─────────
  function undoLast() { var r = R(); if (!r || r.mode !== 'learn' || inExam(r)) return false; var t = r.tm; if (!t || t.snaps.length < 2) { KL.runner.say('nothing to undo yet', 'dim'); return true; } rewind(r, t.snaps.length - 2, 'undo'); return true; }
  function onKey(e) {
    var inp = e.target; if (!inp || inp.id !== 'lrIn') return;
    var k = e.key, ctrl = e.ctrlKey && !e.altKey && !e.metaKey;
    if (rs) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (k === 'Escape' || (ctrl && (k === 'g' || k === 'c'))) rsEnd(false, inp);
      else if (k === 'Enter') { rsEnd(true, inp); }
      else if (k === 'Tab' || k === 'ArrowRight' || k === 'ArrowLeft') rsEnd(true, inp);
      else if (ctrl && k === 'r') { rs.match++; if (rs.match >= rs.hits.length) rs.match = 0; rsPaint(); }
      else if (k === 'Backspace') { rs.q = rs.q.slice(0, -1); rs.match = -1; rsPaint(); }
      else if (k.length === 1 && !ctrl) { rs.q += k; rs.match = -1; rsPaint(); }
      return;
    }
    if (k === 'Tab' && !e.shiftKey) { e.preventDefault(); e.stopImmediatePropagation(); smartComplete(inp); return; }
    if (ctrl && k === 'r') { e.preventDefault(); e.stopImmediatePropagation(); rsStart(inp); return; }
    if (ctrl && k === 'z') { e.preventDefault(); e.stopImmediatePropagation(); undoLast(); return; }
    if (ctrl && (k === 'u' || k === 'w' || k === 'k' || k === 'a' || k === 'e')) {
      e.preventDefault(); e.stopImmediatePropagation(); var v = inp.value, p = inp.selectionStart == null ? v.length : inp.selectionStart;
      if (k === 'u') { inp.value = v.slice(p); inp.setSelectionRange(0, 0); }
      else if (k === 'k') inp.value = v.slice(0, p);
      else if (k === 'a') inp.setSelectionRange(0, 0);
      else if (k === 'e') inp.setSelectionRange(v.length, v.length);
      else { var q = v.slice(0, p).replace(/\s+$/, ''), cut = q.lastIndexOf(' ') + 1; inp.value = v.slice(0, cut) + v.slice(p); inp.setSelectionRange(cut, cut); }
    }
  }
  document.addEventListener('keydown', onKey, true);

  // ───────── mobile / touch key toolbar ─────────
  var KEYS = [['Tab', 'Tab', 'Complete'], ['↑', 'ArrowUp', 'Previous command'], ['↓', 'ArrowDown', 'Next command'], ['^C', 'Ctrl-c', 'Cancel line'], ['^R', 'Ctrl-r', 'Search history'], ['↶', 'Ctrl-z', 'Undo last change'], ['|', '|'], ['~', '~'], ['/', '/'], ['-', '-'], ['_', '_'], ['.', '.'], ['=', '='], ['"', '"'], ["'", "'"], ['>', '>'], ['$', '$'], ['{', '{'], ['}', '}'], [':', ':'], ['⏎', 'Enter', 'Run']];
  function keyBar() {
    var bar = document.createElement('div'); bar.className = 'pro-keys'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Terminal keys');
    bar.innerHTML = '<button type="button" class="pk wide" data-ins="kubectl ">kubectl</button>' + KEYS.map(function (k) { return '<button type="button" class="pk' + (k[1].length > 1 ? ' fn' : '') + '" data-k="' + esc(k[1]) + '" aria-label="' + esc(k[2] || k[0]) + '">' + esc(k[0]) + '</button>'; }).join('');
    function press(b) {
      var inp = $('lrIn'); if (!inp) return; var ins = b.dataset.ins, key = b.dataset.k;
      if (ins) { put(inp, ins); return; }
      if (key.length === 1) { put(inp, key); return; }
      var ctrl = /^Ctrl-/.test(key), kk = ctrl ? key.slice(5) : key;
      inp.dispatchEvent(new KeyboardEvent('keydown', { key: kk, ctrlKey: ctrl, bubbles: true, cancelable: true }));
    }
    function put(inp, s) { var a = inp.selectionStart == null ? inp.value.length : inp.selectionStart, z = inp.selectionEnd == null ? a : inp.selectionEnd; inp.value = inp.value.slice(0, a) + s + inp.value.slice(z); inp.setSelectionRange(a + s.length, a + s.length); }
    bar.addEventListener('pointerdown', function (e) { var b = e.target.closest('button'); if (!b) return; e.preventDefault(); press(b); try { if (navigator.vibrate) navigator.vibrate(5); } catch (x) { /* ignore */ } });
    bar.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('button')) { e.preventDefault(); press(e.target.closest('button')); } });
    return bar;
  }

  // ───────── time machine ─────────
  function tmInit(r) { if (!r.tm) r.tm = { snaps: [{ line: r.hist.length ? 'Session restored' : 'Start of lab', at: Date.now(), t: r.sim.t, s: r.sim.dump() }], branch: null }; return r.tm; }
  function snap(r, line) {
    var t = tmInit(r); t.snaps.push({ line: line.split('\n')[0], at: Date.now(), t: r.sim.t, s: r.sim.dump() });
    if (t.snaps.length > 41) t.snaps.splice(1, 1);
    t.branch = null;
    var b = $('proTmCount'); if (b) b.textContent = String(t.snaps.length - 1);
  }
  function rewind(r, i, why) {
    var t = tmInit(r), s = t.snaps[i]; if (!s) return;
    t.branch = { snaps: t.snaps.slice(i + 1), cur: r.sim.dump(), cmd: t.snaps[t.snaps.length - 1].line };
    t.snaps = t.snaps.slice(0, i + 1);
    r.sim = new KL.Sim().load(JSON.parse(JSON.stringify(s.s)));
    KL.runner.say('⏪ ' + (why === 'undo' ? 'Undid' : 'Rewound to') + ' step ' + i + ' · ' + s.line + '   (Ctrl-Z undoes again, “Return” in the time machine redoes)', 'dim');
    KL.runner.refresh(); KL.runner.save(r, true); drawerRefresh(); var b = $('proTmCount'); if (b) b.textContent = String(t.snaps.length - 1);
  }
  function forward(r) {
    var t = tmInit(r), b = t.branch; if (!b) return;
    r.sim = new KL.Sim().load(JSON.parse(JSON.stringify(b.cur))); t.snaps = t.snaps.concat(b.snaps); t.branch = null;
    KL.runner.say('↪ Returned to where you were · ' + b.cmd, 'dim'); KL.runner.refresh(); KL.runner.save(r, true); drawerRefresh();
  }
  function sig(o) { var c = { s: o.spec, d: o.data, r: o.rules, sb: o.subjects, rr: o.roleRef, l: o.metadata && o.metadata.labels, a: o.metadata && o.metadata.annotations, f: o.metadata && o.metadata.deletionTimestamp ? 1 : 0, sc: o.secrets, au: o.automountServiceAccountToken, rp: o.reclaimPolicy, ab: o.allowVolumeExpansion }; return JSON.stringify(c); }
  function diffVs(r, snapObj) {
    var A = snapObj.objs || {}, B = r.sim.objs || {}, add = [], del = [], chg = [];
    function skip(k) { return /^(Endpoints|EndpointSlice|Lease|Event)\//.test(k) || /\/kube-(system|public|node-lease)\//.test(k) || /^Node\//.test(k) && false; }
    Object.keys(A).forEach(function (k) { if (skip(k)) return; if (!(k in B)) add.push(k); else if (sig(A[k]) !== sig(B[k])) chg.push(k); });
    Object.keys(B).forEach(function (k) { if (skip(k)) return; if (!(k in A)) del.push(k); });
    var fa = snapObj.fs || {}, fb = r.sim.fs || {}, files = []; Object.keys(fa).concat(Object.keys(fb)).forEach(function (p) { if (fa[p] !== fb[p] && files.indexOf(p) < 0 && /^\/home\/student/.test(p)) files.push(p); });
    return { restore: add, remove: del, revert: chg, files: files };
  }
  function pretty(k) { var p = k.split('/'); return p[0] + ' ' + (p[1] ? p[1] + '/' : '') + (p[2] || ''); }
  function list(a) { return a.slice(0, 8).map(function (k) { return '<li>' + esc(pretty(k)) + '</li>'; }).join('') + (a.length > 8 ? '<li class="more">+' + (a.length - 8) + ' more</li>' : ''); }
  var drawerSel = -1, drawerTab = 'steps';
  function drawer() { return $('proTm'); }
  function drawerRefresh() { var d = drawer(); if (d) drawerPaint(d); }
  function ago(ts) { var s = Math.max(0, Math.round((Date.now() - ts) / 1000)); return s < 90 ? s + 's ago' : Math.round(s / 60) + 'm ago'; }
  function mine(r) { return r.hist.filter(function (h) { return !KL.proIsReadOnly(h); }); }
  function drawerPaint(d) {
    var r = R(); if (!r) return; var t = tmInit(r), n = t.snaps.length, h = '';
    h += '<div class="pro-dh"><b>⏪ Cluster time machine</b><button type="button" id="proTmX" aria-label="Close">✕</button></div>';
    h += '<div class="pro-tabs" role="tablist"><button role="tab" data-tab="steps" class="' + (drawerTab === 'steps' ? 'on' : '') + '">Timeline</button><button role="tab" data-tab="cmp" class="' + (drawerTab === 'cmp' ? 'on' : '') + '">My path vs reference</button></div>';
    if (drawerTab === 'steps') {
      if (drawerSel < 0 || drawerSel >= n) drawerSel = n - 1;
      h += '<p class="pro-note">Every state-changing command takes a snapshot of the whole simulated cluster (and your files). Pick a step to see what would change, then rewind. <kbd>Ctrl</kbd>+<kbd>Z</kbd> undoes the last one.</p>';
      h += '<div class="pro-scrub"><input type="range" id="proTmRange" min="0" max="' + (n - 1) + '" value="' + drawerSel + '" aria-label="Timeline position"><span>' + drawerSel + ' / ' + (n - 1) + '</span></div>';
      h += '<ol class="pro-steps">' + t.snaps.map(function (s, i) { return '<li class="' + (i === n - 1 ? 'now ' : '') + (i === drawerSel ? 'sel' : '') + '" data-i="' + i + '" tabindex="0"><i>' + i + '</i><code>' + esc(s.line.slice(0, 70)) + '</code><em>' + (i === n - 1 ? 'now' : ago(s.at)) + '</em></li>'; }).join('') + '</ol>';
      if (drawerSel < n - 1) {
        var d2 = diffVs(r, t.snaps[drawerSel].s), none = !d2.restore.length && !d2.remove.length && !d2.revert.length && !d2.files.length;
        h += '<div class="pro-diff"><b>Rewinding to step ' + drawerSel + ' would:</b>' + (none ? '<p>change nothing in the cluster (only simulated time differs).</p>' : (d2.restore.length ? '<div class="g">＋ bring back<ul>' + list(d2.restore) + '</ul></div>' : '') + (d2.remove.length ? '<div class="r">－ remove<ul>' + list(d2.remove) + '</ul></div>' : '') + (d2.revert.length ? '<div class="y">≠ revert<ul>' + list(d2.revert) + '</ul></div>' : '') + (d2.files.length ? '<div class="y">▤ files<ul>' + list(d2.files.map(function (f) { return 'F/' + f.replace('/home/student/', ''); })) + '</ul></div>' : '')) +
          '<button type="button" class="btn-primary" id="proTmGo">⏪ Rewind to step ' + drawerSel + '</button></div>';
      } else h += '<p class="pro-note">You are at the latest step.</p>';
      if (t.branch) h += '<div class="pro-branch">↪ You rewound from “<code>' + esc(t.branch.cmd.slice(0, 50)) + '</code>” — <button type="button" class="btn-secondary" id="proTmFwd">Return to where I was</button></div>';
    } else {
      var done = store.labDone(r.lab.id) || r.over, mn = mine(r), ref = r.lab.solution.filter(function (l) { return !KL.proIsReadOnly(l); });
      if (!done) h += '<p class="pro-note">🔒 Finish the lab to compare your path with the reference solution. (Peeking early spoils the puzzle.)</p>';
      else {
        var eff = mn.length ? Math.min(100, Math.round(ref.length / mn.length * 100)) : 100;
        h += '<div class="pro-cmp"><div><b>You · ' + mn.length + ' changing commands</b><ol>' + (mn.slice(0, 30).map(function (c, i) { return '<li style="--d:' + i * 40 + 'ms"><code>' + esc(c.slice(0, 80)) + '</code></li>'; }).join('') || '<li><i>none</i></li>') + '</ol></div><div><b>Reference · ' + ref.length + '</b><ol>' + ref.map(function (c, i) { return '<li style="--d:' + i * 40 + 'ms"><code>' + esc(c.split('\n')[0].slice(0, 80)) + '</code></li>'; }).join('') + '</ol></div></div>' +
          '<div class="pro-eff"><span>Path efficiency</span><div><i style="width:' + eff + '%"></i></div><b>' + eff + '%</b></div><p class="pro-note">' + (mn.length > ref.length * 2 ? 'Your path used more than twice the commands. Look for a single imperative command (<code>kubectl set</code>, <code>patch</code>, <code>create --dry-run=client -o yaml</code>) that replaces several edits.' : 'Close to the reference path. Efficiency is a speed hint, not a grade: a safe longer path can be the right call in production.') + '</p>';
      }
    }
    d.innerHTML = h;
    $('proTmX').onclick = function () { d.remove(); };
    d.querySelectorAll('.pro-tabs button').forEach(function (b) { b.onclick = function () { drawerTab = b.dataset.tab; drawerPaint(d); }; });
    var rg = $('proTmRange'); if (rg) rg.oninput = function () { drawerSel = +rg.value; drawerPaint(d); var x = $('proTmRange'); if (x) x.focus(); };
    d.querySelectorAll('.pro-steps li').forEach(function (li) { li.onclick = function () { drawerSel = +li.dataset.i; drawerPaint(d); }; li.onkeydown = function (e) { if (e.key === 'Enter') li.click(); }; });
    var go = $('proTmGo'); if (go) go.onclick = function () { rewind(r, drawerSel, 'rewind'); drawerSel = -1; };
    var fw = $('proTmFwd'); if (fw) fw.onclick = function () { forward(r); };
  }
  function openDrawer() { var ex = drawer(); if (ex) { ex.remove(); return; } var d = document.createElement('aside'); d.id = 'proTm'; d.className = 'pro-drawer'; d.setAttribute('aria-label', 'Cluster time machine'); $('labRunner').appendChild(d); drawerSel = -1; drawerPaint(d); d.onkeydown = function (e) { if (e.key === 'Escape') d.remove(); }; }

  // ───────── predict-the-output (state-changing commands) ─────────
  var MUT = /^\s*(k|kubectl)\s+(apply|create|delete|scale|set|rollout\s+(undo|restart)|patch|taint|cordon|uncordon|drain|label|annotate|expose|autoscale|replace|run)\b/;
  function pOn() { return ls('kl.p2') === '1'; }
  function pStats() { try { return JSON.parse(ls('kl.pred2')) || { r: 0, t: 0 }; } catch (e) { return { r: 0, t: 0 }; } }
  function summarise(sim, ns) {
    var pods = sim.list('Pod', ns).filter(function (p) { var st = sim.podStatus(p); return !/Completed|Succeeded/.test(st); }), ready = 0, bad = [];
    pods.forEach(function (p) { var st = sim.podStatus(p); if (sim.podReady(p) && p.status.phase === 'Running' && !p.metadata.deletionTimestamp) ready++; else if (!/Terminating/.test(st)) bad.push(p.metadata.name + ' → ' + st); });
    return { ready: ready, total: pods.length, bad: bad };
  }
  function seeded(str) { var h = 2166136261 >>> 0, i; for (i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return function () { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; }; }
  KL.gate = function (r, text, go) {
    if (!pOn() || inExam(r) || !MUT.test(text) || r.tm && r.tm.asking) return false;
    var ns = r.lab.ns, before, after;
    try { before = summarise(r.sim, ns); var c = new KL.Sim().load(r.sim.dump()); c.exec(text); c.settle(30); after = summarise(c, ns); } catch (e) { return false; }
    if (before.ready === after.ready && before.total === after.total && before.bad.length === after.bad.length) return false;
    var right = after.ready + '/' + after.total + ' Ready', cand = [[after.ready, after.total], [after.total, after.total], [Math.max(0, after.ready - 1), after.total], [after.ready, after.total + 1], [0, after.total], [Math.min(after.total, after.ready + 1), after.total], [after.ready, Math.max(0, after.total - 1)]], seen = {}, opts = [];
    cand.forEach(function (x) { var s = x[0] + '/' + x[1] + ' Ready'; if (x[0] >= 0 && x[0] <= x[1] && !seen[s]) { seen[s] = 1; opts.push(s); } });
    var rnd = seeded(text), rest = opts.filter(function (x) { return x !== right; }).sort(function () { return rnd() - 0.5; }).slice(0, 3); opts = rest.concat([right]).sort(function () { return rnd() - 0.5; });
    r.tm = r.tm || {}; r.tm.asking = true;
    var host = document.querySelector('.lr-term'); if (!host) { r.tm.asking = false; return false; }
    var box = document.createElement('div'); box.className = 'pro-pq'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Predict the output');
    box.innerHTML = '<b>🔮 Predict first</b><code>' + esc(text.split('\n')[0].slice(0, 90)) + '</code><p>About 30 seconds after this runs, how many pods in <code>' + esc(ns) + '</code> will be Ready? <small>(now ' + before.ready + '/' + before.total + ')</small></p><div class="pro-pqo">' + opts.map(function (o, i) { return '<button type="button" data-i="' + i + '">' + esc(o) + '</button>'; }).join('') + '</div><button type="button" class="pro-skip">Just run it</button>';
    host.parentNode.insertBefore(box, host.nextSibling);
    function done(pick) {
      box.remove(); r.tm.asking = false; var inp = $('lrIn'); go();
      if (pick == null) { if (inp) inp.focus(); return; }
      r.sim.settle(27); KL.runner.refresh();
      var ok = pick === right, st = pStats(); st.t++; if (ok) st.r++; ls('kl.pred2', JSON.stringify(st));
      var why = after.bad.length ? ' Not ready: ' + after.bad.slice(0, 2).join('; ') + '.' : ' Everything settled.';
      KL.runner.say('🔮 You predicted ' + pick + ' — after 30s it is ' + right + (ok ? '  ✓' : '  ✗') + '.' + why + '  (overall ' + st.r + '/' + st.t + ')', ok ? 'dim' : 'err');
      var chip = $('proPredBtn'); if (chip) chip.title = 'Predict-the-output: ' + st.r + '/' + st.t + ' correct'; if (inp) inp.focus();
    }
    box.querySelectorAll('.pro-pqo button').forEach(function (b) { b.onclick = function () { done(opts[+b.dataset.i]); }; });
    box.querySelector('.pro-skip').onclick = function () { done(null); };
    var first = box.querySelector('.pro-pqo button'); if (first) first.focus();
    return true;
  };

  // ───────── wire into the runner ─────────
  function install() {
    var r = R(); if (!r) return; var bar = document.querySelector('.lr-bar'); if (!bar || bar.querySelector('.pro-tools')) return;
    var learn = r.mode === 'learn' && !inExam(r), st = pStats(), tools = document.createElement('div'); tools.className = 'pro-tools';
    tools.innerHTML = (learn ? '<button type="button" class="btn-secondary" id="proTmBtn" title="Rewind the cluster to any earlier step">⏪ Time machine <span class="pro-badge" id="proTmCount">0</span></button>' : '') + (learn ? '<button type="button" class="btn-secondary" id="proPredBtn" aria-pressed="' + pOn() + '" title="Predict-the-output: ' + st.r + '/' + st.t + ' correct">🔮 Predict' + (pOn() ? ': on' : '') + '</button>' : '');
    var anchor = $('lrDocsBtn'); bar.insertBefore(tools, anchor || null);
    var tb = $('proTmBtn'); if (tb) { tb.onclick = openDrawer; $('proTmCount').textContent = String(Math.max(0, tmInit(r).snaps.length - 1)); }
    var pb = $('proPredBtn'); if (pb) pb.onclick = function () { ls('kl.p2', pOn() ? '0' : '1'); pb.setAttribute('aria-pressed', pOn()); pb.textContent = '🔮 Predict' + (pOn() ? ': on' : ''); KL.toast(pOn() ? 'Predict-the-output on: you will guess before state-changing commands.' : 'Predict-the-output off.'); };
    var right = document.querySelector('.lr-right'), term = $('lrTerm'); if (right && term && !right.querySelector('.pro-keys')) term.parentNode.insertBefore(keyBar(), term.nextSibling);
    // exam-style shell variables, like the real exam image
    if (!r.sim.env.do) r.sim.env.do = '--dry-run=client -o yaml'; if (!r.sim.env.now) r.sim.env.now = '--force --grace-period 0';
    if (!r.proHint && !r.out.some(function (o) { return /Tab completes/.test(o.t); })) r.proHint = 1;
    if (!r.proSaid) { r.proSaid = 1; KL.runner.say('Tips: Tab completes resource names · Ctrl-R searches history · $do = --dry-run=client -o yaml · $now = --force --grace-period 0' + (learn ? ' · Ctrl-Z undoes your last change' : ''), 'dim'); }
  }
  window.addEventListener('kl:runner', function () { setTimeout(install, 0); });
  window.addEventListener('kl:cmd', function (e) {
    var d = e.detail, r = d.run; if (!r || r.mode !== 'learn' || inExam(r)) return; tmInit(r);
    if (!KL.proIsReadOnly(d.line)) snap(r, d.line);
    if (drawer()) drawerRefresh();
  });
})();
