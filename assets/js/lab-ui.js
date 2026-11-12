/* Labs page (interactive grid) + split lab runner: instructions | terminal + live cluster state. */
(function () {
  'use strict';
  var KL = window.KL, Labs = KL.Labs, store = KL.store, runs = {}, cur = null, ticker = null;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function md(s) { return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>'); }
  function toast(msg, o) { var h = $('toastHost'); if (!h) return; o = o || {}; var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg + ' ';
    if (o.action) { var b = document.createElement('button'); b.className = 'toast-btn'; b.textContent = o.action.label; b.onclick = function () { t.remove(); o.action.fn(); }; t.appendChild(b); }
    if (o.sticky) { var x = document.createElement('button'); x.className = 'toast-x'; x.setAttribute('aria-label', 'Dismiss'); x.textContent = '✕'; x.onclick = function () { t.remove(); }; t.appendChild(x); }
    h.appendChild(t); if (!o.sticky) setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 400); }, 2600); return t; }
  KL.toast = toast;

  // ───────── labs grid ─────────
  var filt = { diff: 'all', track: 'all', mode: 'all', q: '' };
  function labMatch(l, kind) {
    var txt = (l.title + ' ' + (l.domain || '') + ' ' + (l.track || l.tags || '') + ' ' + (l.story || l.objective || '')).toLowerCase();
    if (filt.q && txt.indexOf(filt.q) < 0) return false;
    if (filt.diff !== 'all' && l.diff !== filt.diff && !(filt.diff === 'Advanced' && l.diff === 'Expert')) return false;
    if (filt.track !== 'all') { var tr = kind === 'sim' ? l.track : String(l.tags || '').split(/[,\s·]+/); if (tr.indexOf(filt.track) < 0 && String(l.tags || '').indexOf(filt.track) < 0) return false; }
    if (filt.mode !== 'all' && filt.mode !== kind) return false;
    return true;
  }
  KL.filterLabs = function () { filt.q = ($('labSearch').value || '').toLowerCase(); renderIlabs(); applyWalkFilter(); };
  function diffCls(d) { return d === 'Beginner' ? 'diff-beginner' : d === 'Intermediate' ? 'diff-intermediate' : 'diff-advanced'; }
  function renderIlabs() {
    var list = $('ilabsList'); if (!list) return;
    var shown = Labs.list.filter(function (l) { return labMatch(l, 'sim'); });
    list.innerHTML = shown.map(function (l) {
      var done = store.labDone(l.id), tasks = store.labTasks(l.id), n = Object.keys(tasks).filter(function (k) { return tasks[k]; }).length;
      return '<a class="ilab-card' + (done ? ' done' : '') + '" href="#lab/' + l.id + '" data-id="' + l.id + '"><div class="ilab-top"><span class="ilab-num">' + l.num + '</span><span class="lab-diff ' + diffCls(l.diff) + '">' + l.diff + '</span>' + (done ? '<span class="ilab-done" aria-label="completed">✓</span>' : '') + '</div><div class="ilab-title">' + esc(l.title) + '</div><div class="ilab-meta"><span>⏱ ' + l.time + '</span><span>' + esc(l.domain || '') + '</span></div><div class="ilab-tracks">' + l.track.map(function (t) { return '<span class="tag tag-blue">' + t + '</span>'; }).join('') + (KL.fid ? KL.fid.badge(l) : '') + '</div><div class="ilab-prog"><i style="width:' + (done ? 100 : Math.round(n / l.tasks.length * 100)) + '%"></i></div></a>';
    }).join('');
    $('ilabsHead').style.display = filt.mode === 'walk' ? 'none' : '';
    list.style.display = filt.mode === 'walk' ? 'none' : '';
    var doneN = Labs.list.filter(function (l) { return store.labDone(l.id); }).length;
    $('labsSummary').innerHTML = '<b>' + doneN + '</b> / ' + Labs.list.length + ' interactive labs completed · 🔥 ' + store.streak() + '-day streak · progress is saved in this browser only' + (store.persistent() ? '' : ' (storage blocked — progress will not persist)');
    var any = shown.length || document.querySelectorAll('#labsList .lab-item:not(.hidden)').length;
    $('labsNone').style.display = any ? 'none' : '';
  }
  function applyWalkFilter() {
    var wl = typeof LABS !== 'undefined' ? LABS : [];
    document.querySelectorAll('#labsList .lab-item').forEach(function (el, i) {
      var l = wl[i]; if (!l) return; var show = labMatch(l, 'walk') && labMatch2(l); el.classList.toggle('hidden', !show);
    });
    $('walkHead').style.display = filt.mode === 'sim' ? 'none' : ''; $('labsList').style.display = filt.mode === 'sim' ? 'none' : '';
  }
  function labMatch2(l) { return true && l; }
  function bindFilters() {
    [['labDiffFilter', 'diff'], ['labTrackFilter', 'track'], ['labModeFilter', 'mode']].forEach(function (p) {
      var g = $(p[0]); if (!g) return;
      g.onclick = function (e) { var b = e.target.closest('.filter-btn'); if (!b) return; g.querySelectorAll('.filter-btn').forEach(function (x) { x.classList.remove('active'); }); b.classList.add('active'); filt[p[1]] = b.dataset.v; renderIlabs(); applyWalkFilter(); };
    });
  }
  // walkthrough labs: done toggle + kind-pack hint
  function enhanceWalk() {
    var wl = typeof LABS !== 'undefined' ? LABS : [];
    document.querySelectorAll('#labsList .lab-item').forEach(function (el, i) {
      var l = wl[i]; if (!l || el.querySelector('.walk-done')) return; var id = 'w' + l.num;
      var body = el.querySelector('.lab-body'), b = document.createElement('button');
      b.className = 'btn-secondary walk-done'; b.style.margin = '1rem 0 0';
      function paint() { var d = store.labDone(id); b.textContent = d ? '✓ Completed — click to undo' : 'Mark as done'; el.classList.toggle('done', d); }
      b.onclick = function () { store.markLab(id, !store.labDone(id)); paint(); renderIlabs(); if (store.labDone(id) && KL.fx) KL.fx.confetti(); };
      paint(); if (body) body.appendChild(b);
    });
  }
  KL.route('labs', function () { renderIlabs(); applyWalkFilter(); });

  // ───────── runner ─────────
  function getMode() { try { var m = localStorage.getItem('kl.labmode'); return m === 'exam' || m === 'real' ? m : 'learn'; } catch (e) { return 'learn'; } }
  var CTXS = ['k8s-c1', 'k8s-c2', 'k8s-c3'];
  function labCtx(lab) { var h = 0, i; for (i = 0; i < lab.id.length; i++) h = (h * 31 + lab.id.charCodeAt(i)) >>> 0; return CTXS[h % 3]; }
  function isEx(r) { return r.mode !== 'learn'; }
  function termSim(r) { return r.term || r.sim; }
  // real-exam environment: several "clusters"; only the right context holds the lab objects, the others are empty decoys
  function ensureTerm(r) {
    if (r.mode !== 'real') { r.term = null; return; }
    if (!r.ctxName) r.ctxName = CTXS[0];
    if (r.ctxName === labCtx(r.lab)) { r.term = null; return; }
    r.decoys = r.decoys || {}; r.term = r.decoys[r.ctxName] || (r.decoys[r.ctxName] = new KL.Sim());
  }
  function globalExam(lab) { var a = KL.exam && KL.exam.active; return !!a && a.ids.indexOf(lab.id) >= 0; }
  // predict-then-investigate: fault labs only (build labs have no hidden cause)
  var NOPRED = 's09 s10 s11 s12 s14 s16 s17 s19 s20 s22 s23 s24 s25 s26 s27 s33 s37 s44 s49 s51 s52 s56 s57 s58 s59 s60 s61 s62 s63 s64 s65 s66 s67 s68'.split(' ');
  function predictable(lab) { return !!(KL.debrief && KL.debrief[lab.id]) && NOPRED.indexOf(lab.id.slice(0, 3)) < 0; }
  KL.predictable = predictable;
  function seedRand(str) { var h = 2166136261 >>> 0, i; for (i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return function () { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; }; }
  function predOptions(lab) {
    var rnd = seedRand(lab.id), right = KL.debrief[lab.id][0];
    var others = Labs.list.filter(function (l) { return l.id !== lab.id && KL.debrief[l.id] && KL.debrief[l.id][0] !== right; });
    var same = others.filter(function (l) { return l.domain === lab.domain; }), rest = others.filter(function (l) { return l.domain !== lab.domain; });
    function shuf(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    var pool = shuf(same).concat(shuf(rest)), opts = [right];
    pool.forEach(function (l) { var c = KL.debrief[l.id][0]; if (opts.length < 4 && opts.indexOf(c) < 0) opts.push(c); });
    return shuf(opts);
  }
  function predStats() { try { return JSON.parse(localStorage.getItem('kl.pred')) || { r: 0, t: 0 }; } catch (e) { return { r: 0, t: 0 }; } }
  function predBump(ok) { try { var x = predStats(); x.t++; if (ok) x.r++; localStorage.setItem('kl.pred', JSON.stringify(x)); } catch (e) { /* ignore */ } }
  function setMode(m) { try { localStorage.setItem('kl.labmode', m); } catch (e) {} }
  function limitSecs(lab) { return Math.max(5, parseInt(lab.time, 10) || 10) * 60; }
  function mmss(sec) { sec = Math.max(0, sec); return ('0' + Math.floor(sec / 60)).slice(-2) + ':' + ('0' + sec % 60).slice(-2); }
  function newRun(lab) {
    var sim = new KL.Sim(); Labs.setup(sim, lab);
    return { lab: lab, sim: sim, hist: [], hi: 0, out: [], buf: '', start: Date.now(), tasksOk: store.labTasks(lab.id) || {}, hintIdx: {}, solShown: false, checks: 0, resumed: 0, mode: getMode(), timeUp: false, over: false, pred: null, ctxName: '' };
  }
  function restoreRun(lab, d) {
    var sim = new KL.Sim().load(d.sim);
    return { lab: lab, sim: sim, hist: d.hist || [], hi: (d.hist || []).length, out: d.out || [], buf: '', start: Date.now() - (d.elapsed || 0), tasksOk: d.tasksOk || {}, hintIdx: d.hintIdx || {}, solShown: !!d.solShown, checks: d.checks || 0, resumed: d.savedAt || 1, mode: d.mode || 'learn', timeUp: !!d.timeUp, over: !!d.over, pred: d.pred || null, ctxName: d.ctxName || '' };
  }
  var saveT = {};
  function saveRun(r, now) {
    if (!r || !KL.sessions) return; var id = r.lab.id; clearTimeout(saveT[id]);
    var go = function () { KL.sessions.save('lab:' + id, { sim: r.sim.dump(), hist: r.hist.slice(-200), out: r.out.slice(-300), elapsed: Date.now() - r.start, tasksOk: r.tasksOk, hintIdx: r.hintIdx, solShown: r.solShown, checks: r.checks, mode: r.mode, timeUp: r.timeUp, over: r.over, pred: r.pred, ctxName: r.ctxName, savedAt: Date.now() }); };
    if (now) go(); else saveT[id] = setTimeout(go, 350);
  }
  // async: resume a saved session if one exists, else start fresh
  function getRun(id, fresh) {
    var lab = Labs.byId[id]; if (!lab) return Promise.resolve(null);
    if (fresh) { delete runs[id]; if (KL.sessions) KL.sessions.del('lab:' + id); runs[id] = newRun(lab); return Promise.resolve(runs[id]); }
    if (runs[id]) return Promise.resolve(runs[id]);
    if (!KL.sessions) { runs[id] = newRun(lab); return Promise.resolve(runs[id]); }
    return KL.sessions.load('lab:' + id).then(function (d) { try { runs[id] = d ? restoreRun(lab, d) : newRun(lab); } catch (e) { runs[id] = newRun(lab); } return runs[id]; });
  }
  function openRunner(id) {
    if (!Labs.byId[id]) { location.hash = 'labs'; return; }
    getRun(id).then(function (r) { if (location.hash.indexOf('#lab/' + id) !== 0) return; if (globalExam(r.lab) && KL.exam.active.env && r.mode !== 'real') { r.mode = 'real'; r.ctxName = ''; } ensureTerm(r); cur = r; renderRunner(); startTicker(); });
  }
  KL.openLab = function (id) { location.hash = 'lab/' + id; };
  KL.labRun = getRun;
  KL.route('lab', openRunner);
  window.addEventListener('kl:page', function (e) { if (e.detail.name !== 'lab') stopTicker(); });
  function startTicker() { stopTicker(); ticker = setInterval(function () { if (!cur) return; cur.sim.tick(); refreshState(); }, 2000); }
  function stopTicker() { if (ticker) clearInterval(ticker); ticker = null; }

  function renderRunner() {
    var r = cur, lab = r.lab, root = $('labRunner'), idx = Labs.list.indexOf(lab), nxt = Labs.list[idx + 1];
    root.innerHTML =
      '<div class="lr-bar"><a class="lr-back" href="#labs">← Labs</a><div class="lr-title"><span class="ilab-num">' + lab.num + '</span> ' + esc(lab.title) + (KL.daily && KL.daily.today().id === lab.id ? ' <span class="tag tag-yellow">📅 Daily</span>' : '') + '</div>' +
      '<div class="lr-mode" role="group" aria-label="Lab mode">' + [['learn', '📖 Learn', 'Hints, solution and debrief available'], ['exam', '⏱ Exam', 'No hints or solution, countdown timer, scored'], ['real', '🧪 Real', 'Exam environment: no checker or cluster panel, several contexts, submit to score']].map(function (m) { return '<button id="lrMode_' + m[0] + '" class="' + (r.mode === m[0] ? 'on' : '') + '" aria-pressed="' + (r.mode === m[0]) + '" title="' + m[2] + '">' + m[1] + '</button>'; }).join('') + '</div>' +
      '<span class="lr-timer" id="lrTimer" aria-label="Elapsed time">00:00</span>' +
      '<button class="btn-secondary" id="lrDocsBtn" title="Docs peek: related commands and kubernetes.io pages">📖 Docs</button>' +
      '<button class="btn-secondary" id="lrReset" title="Rebuild the broken environment">↺ Reset lab</button>' +
      '<button class="btn-primary" id="lrCheck">' + (r.mode === 'real' ? '✔ Submit' : '✓ Check my work') + '</button></div>' +
      '<div class="lr-split"><aside class="lr-left" aria-label="Instructions">' +
      '<div class="lr-story">' + md(lab.story) + '</div>' + (r.mode === 'real' ? '<div class="lr-ctx">🔧 Run first: <code>kubectl config use-context ' + labCtx(lab) + '</code> <span>current: <b id="lrCtxNow">' + esc(r.ctxName || CTXS[0]) + '</b></span></div>' : '') + '<div id="lrPredict"></div>' + '<div class="lr-chips"><span class="lab-diff ' + diffCls(lab.diff) + '">' + lab.diff + '</span>' + lab.track.map(function (t) { return '<span class="tag tag-blue">' + t + '</span>'; }).join('') + '<span class="tag tag-green">⏱ ' + lab.time + '</span><span class="tag tag-yellow">ns: ' + lab.ns + '</span></div>' +
      '<ol class="lr-tasks" id="lrTasks"></ol><div class="lr-feedback" id="lrFeedback" aria-live="polite"></div>' +
      (isEx(r) ? '<div class="lr-exam-note">' + (r.mode === 'real' ? '🧪 <b>Real exam environment</b> — no checker, no cluster panel, no hints. Switch context per task, then press Submit. ' : '⏱ <b>Exam mode</b> — no hints, no solution. Failing checks show only your score. ') + Math.round(limitSecs(lab) / 60) + ' min.</div>' : '<details class="lr-sol"><summary id="lrSolSum">💡 Show solution</summary><div id="lrSol"></div></details>') +
      (lab.simOnly ? '<div class="lr-pack">🧪 Simulator-only lab: it models node, ssh, webhook and certificate failures that a kind pack cannot reproduce faithfully.</div>' : '<div class="lr-pack">Prefer a real cluster? <a href="lab-packs/' + lab.id + '/README.md" target="_blank" rel="noopener">kind lab pack →</a> (<code>setup.sh</code> / <code>check.sh</code>)</div>') +
      (nxt ? '<a class="lr-next" id="lrNext" href="#lab/' + nxt.id + '" hidden>Next lab: ' + esc(nxt.title) + ' →</a>' : '') +
      '</aside><section class="lr-right"><div class="lr-term" id="lrTerm" role="log" aria-label="Terminal" tabindex="-1"><div id="lrOut"></div><div class="lr-line"><span class="lr-prompt" id="lrPrompt"></span><input id="lrIn" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Terminal input"></div></div>' +
      '<div class="lr-state"><div class="lr-state-h"><b>Cluster</b><div class="lr-tabs" role="tablist"><button id="lrTabDia" role="tab">🗺 Diagram</button><button id="lrTabTxt" role="tab">⌨ Text</button></div><span class="lr-sim">live · simulated ' + KL.Sim.VERSION + '</span><button class="btn-secondary" id="lrWait" title="Advance simulated time">⏩ wait</button></div><div class="lr-dia" id="lrDia" aria-label="Live cluster diagram"></div><pre id="lrState"></pre></div></section></div>' +
      '<div class="lr-editor" id="lrEditor" hidden><div class="lr-ed-box"><div class="lr-ed-h"><b id="lrEdName"></b><span>Ctrl+S save · Esc cancel</span></div><textarea id="lrEdText" spellcheck="false" aria-label="Editor"></textarea><div class="lr-ed-b"><button class="btn-secondary" id="lrEdCancel">Cancel</button><button class="btn-primary" id="lrEdSave">Save</button></div></div></div>';
    $('lrCheck').onclick = function () { if (r.mode === 'real') { if (confirm('Submit your work and see the score?')) doCheck(true); } else doCheck(); }; $('lrReset').onclick = function () { if (confirm('Reset this lab to its broken starting state? Your changes are lost.')) { getRun(lab.id, true).then(function (nr) { cur = nr; renderRunner(); }); } };
    $('lrWait').onclick = function () { r.sim.settle(10); saveRun(r); refreshState(); say('(simulated 10 more seconds pass)\n', 'dim'); };
    r.diaEls = {}; r.nodeEls = {};
    root.classList.toggle('real-env', r.mode === 'real');
    ['learn', 'exam', 'real'].forEach(function (m) { $('lrMode_' + m).onclick = function () { switchMode(m); }; });
    $('lrDocsBtn').onclick = toggleDocs; bindDia(); renderPredict();
    $('lrTabDia').onclick = function () { setView('dia'); }; $('lrTabTxt').onclick = function () { setView('txt'); }; setView(getView());
    renderTasks(); replay(); bindTerm(); refreshState();
    var sol = $('lrSol'); if (sol) { sol.innerHTML = '<div class="lr-sol-warn">Try first! Peeking is tracked locally.</div><pre>' + esc(lab.solution.join('\n')) + '</pre>';
    $('lrSolSum').onclick = function () { r.solShown = true; saveRun(r); }; }
    if (r.over) showResult();
    var t = setInterval(function () { var el = $('lrTimer'); if (!el || cur !== r) return clearInterval(t); var s = Math.floor((Date.now() - r.start) / 1000); if (globalExam(lab)) return;
      if (isEx(r) && !r.over) { var left = limitSecs(lab) - s; el.textContent = '⏳ ' + mmss(left); el.classList.toggle('warn', left <= 60); if (left <= 0 && !r.timeUp) { r.timeUp = true; doCheck(true); } }
      else { el.classList.remove('warn'); el.textContent = mmss(r.over && r.endAt ? Math.floor((r.endAt - r.start) / 1000) : s); } }, 1000);
    $('lrIn').focus();
    window.dispatchEvent(new CustomEvent('kl:runner', { detail: { lab: lab } }));
  }
  function renderTasks() {
    var r = cur, lab = r.lab;
    $('lrTasks').innerHTML = lab.tasks.map(function (t) {
      var ok = r.tasksOk[t.id], hi = r.hintIdx[t.id] || 0;
      return '<li class="lr-task' + (ok ? ' ok' : '') + '" data-id="' + t.id + '"><div class="lr-task-h"><span class="lr-tick" aria-hidden="true">' + (ok ? '✓' : '○') + '</span><b>' + md(t.title) + '</b></div>' + (t.desc ? '<div class="lr-task-d">' + md(t.desc) + '</div>' : '') +
        (isEx(r) ? '' : '<div class="lr-hints">' + t.hints.slice(0, hi).map(function (h, i) { return '<div class="lr-hint"><i>Hint ' + (i + 1) + '</i> ' + md(h) + '</div>'; }).join('') + (hi < t.hints.length ? '<button class="lr-hint-btn" data-id="' + t.id + '">💡 ' + (hi ? 'Next hint' : 'Need a hint?') + ' (' + (t.hints.length - hi) + ' left)</button>' : '') + '</div>') + '</li>';
    }).join('');
    $('lrTasks').querySelectorAll('.lr-hint-btn').forEach(function (b) { b.onclick = function () { r.hintIdx[b.dataset.id] = (r.hintIdx[b.dataset.id] || 0) + 1; store.useHint(r.lab.id); renderTasks(); saveRun(r); }; });
  }
  function doCheck(auto) {
    var r = cur, res = Labs.check(r.sim, r.lab), fb = [], exam = isEx(r);
    r.checks++; res.tasks.forEach(function (t) { r.tasksOk[t.id] = t.ok; t.results.forEach(function (x) { if (!x.ok) fb.push('<li>' + esc(x.msg) + '</li>'); }); });
    store.setLabTasks(r.lab.id, r.tasksOk); renderTasks(); refreshState(); r.last = res;
    if (res.ok || (exam && auto === true)) { r.over = true; r.endAt = Date.now(); }
    saveRun(r, true);
    if (r.over) { showResult(); }
    else $('lrFeedback').innerHTML = exam ? '<div class="lr-fail"><b>' + res.passed + ' / ' + res.total + ' tasks done.</b> Keep going — details are hidden in exam mode.</div>' : '<div class="lr-fail"><b>' + res.passed + ' / ' + res.total + ' tasks done.</b> Still failing:<ul>' + fb.slice(0, 6).join('') + '</ul></div>';
    if (res.ok && KL.daily) KL.daily.record(r.lab.id, Math.floor((Date.now() - r.start) / 1000));
    if (res.ok) { store.markLab(r.lab.id, true); try { window.dispatchEvent(new CustomEvent('kl:labdone', { detail: { lab: r.lab, mode: r.mode } })); } catch (e) {} if (KL.fx) KL.fx.confetti(); var n = $('lrNext'); if (n) n.hidden = false; toast('Lab ' + r.lab.num + ' complete ✓'); }
    else if (r.over) toast('Time is up — ' + res.passed + ' / ' + res.total + ' tasks');
  }
  // result + debrief card (shown when the lab is finished, or the exam timer ran out)
  function showResult() {
    var r = cur, lab = r.lab, res = r.last || Labs.check(r.sim, lab), exam = isEx(r), fb = $('lrFeedback'); if (!fb) return;
    var secs = Math.floor(((r.endAt || Date.now()) - r.start) / 1000), hints = Object.keys(r.hintIdx).reduce(function (a, k) { return a + (r.hintIdx[k] || 0); }, 0);
    var pct = Math.round(res.passed / res.total * 100), db = (KL.debrief || {})[lab.id];
    var head = res.ok ? '<div class="lr-pass">🎉 All ' + res.total + ' tasks pass. Lab complete' + (r.solShown ? ' (solution was viewed)' : '') + '!</div>' : '<div class="lr-fail"><b>⏱ Time is up.</b> ' + res.passed + ' / ' + res.total + ' tasks done.</div>';
    var stats = '<div class="lr-stats">' + (exam ? '<div><b>' + pct + '%</b><span>score</span></div>' : '') + '<div><b>' + mmss(secs) + '</b><span>' + (exam ? 'of ' + mmss(limitSecs(lab)) : 'time') + '</span></div><div><b>' + r.checks + '</b><span>checks</span></div><div><b>' + r.hist.length + '</b><span>commands</span></div>' + (exam ? '' : '<div><b>' + hints + '</b><span>hints</span></div>') + '</div>';
    var card = db ? '<div class="lr-debrief"><h4>🎓 Debrief</h4><dl><dt>Root cause</dt><dd>' + md(db[0]) + '</dd><dt>The fix</dt><dd>' + md(db[1]) + '</dd><dt>Spot it in production</dt><dd>' + md(db[2]) + '</dd><dt class="pat">Remember</dt><dd class="pat"><code>' + esc(db[3]) + '</code></dd></dl></div>' : '';
    var pl = ''; if (r.pred && !r.pred.skip) { if (!r.pred.counted) { r.pred.counted = true; predBump(r.pred.ok); saveRun(r, true); } var ps = predStats(); pl = '<div class="lr-predres ' + (r.pred.ok ? 'ok' : 'no') + '">🔮 Your prediction: ' + (r.pred.ok ? '<b>correct</b> ✓' : '<b>missed</b> — you guessed “' + esc(r.pred.pick) + '”') + ' <span>(overall ' + ps.r + '/' + ps.t + ')</span></div>'; }
    var again = '<div class="lr-after"><button class="btn-secondary" id="lrAgain">↺ Try again' + (exam ? '' : ' in Exam mode') + '</button></div>';
    fb.innerHTML = head + stats + pl + card + again;
    $('lrAgain').onclick = function () { setMode('exam'); getRun(lab.id, true).then(function (nr) { nr.mode = 'exam'; nr.start = Date.now(); cur = nr; renderRunner(); }); };
  }
  function switchMode(m) {
    var r = cur; if (r.mode === m) return;
    if (m !== 'learn' && !confirm('Switch to ' + (m === 'real' ? 'the real exam environment (no checker, no cluster panel, several contexts)' : 'Exam mode (no hints or solution)') + '? The countdown starts now (' + Math.round(limitSecs(r.lab) / 60) + ' min).')) return;
    r.mode = m; setMode(m); if (m !== 'learn') { r.start = Date.now(); r.timeUp = false; r.over = false; r.endAt = 0; }
    r.ctxName = ''; ensureTerm(r); saveRun(r, true); renderRunner(); startTicker();
  }
  // ── predict-then-investigate ──
  function renderPredict() {
    var r = cur, el = $('lrPredict'); if (!el) return;
    var untouched = r.mode === 'learn' && predictable(r.lab) && !r.hist.length && !Object.keys(r.tasksOk).some(function (k) { return r.tasksOk[k]; });
    if (r.pred && !r.over) { el.innerHTML = r.pred.skip ? '' : '<div class="lr-pred locked">🔮 Prediction locked: <i>“' + esc(r.pred.pick) + '”</i> — now investigate. You will see at the end whether you were right.</div>'; return; }
    if (!untouched || r.pred) { el.innerHTML = ''; return; }
    var opts = predOptions(r.lab);
    el.innerHTML = '<div class="lr-pred"><b>🔮 Predict first</b><p>Read the story, then commit before you touch the terminal: what is the root cause?</p>' + opts.map(function (o, i) { return '<button class="lr-opt" data-i="' + i + '">' + md(o) + '</button>'; }).join('') + '<button class="lr-skip" id="lrPredSkip">Skip — just investigate</button></div>';
    el.querySelectorAll('.lr-opt').forEach(function (b) { b.onclick = function () { var pick = opts[+b.dataset.i]; r.pred = { pick: pick, ok: pick === KL.debrief[r.lab.id][0] }; saveRun(r, true); renderPredict(); var i = $('lrIn'); if (i) i.focus(); }; });
    $('lrPredSkip').onclick = function () { r.pred = { skip: true }; saveRun(r, true); renderPredict(); var i = $('lrIn'); if (i) i.focus(); };
  }
  // ── diagram interactions: click → describe in the terminal; hover a service → highlight its endpoints ──
  function runCmd(line) { var inp = $('lrIn'); if (!cur || !inp) return; submit(line); inp.focus(); }
  function hlSvc(ref) {
    var r = cur, root = $('lrDia'); if (!r || !root) return; r.hlSvc = ref || ''; var set = {};
    if (ref) { var p = ref.split('/'), sv = r.sim.get('Service', p[0], p[1]); if (sv) r.sim.endpointsFor(sv).forEach(function (x) { set[x.metadata.namespace + '/' + x.metadata.name] = 1; }); }
    root.classList.toggle('hl-on', !!ref);
    Object.keys(r.diaEls || {}).forEach(function (k) { r.diaEls[k].classList.toggle('hl', !!set[k]); });
  }
  function bindDia() {
    var root = $('lrDia'); if (!root) return;
    function act(t) {
      var pod = t.closest('.dia-pod'), sv = t.closest('.dia-svc'), nd = t.closest('.dia-nh[data-node]'), k;
      if (pod) { k = pod.dataset.k.split('/'); runCmd('kubectl describe pod ' + k[1] + ' -n ' + k[0]); }
      else if (sv) { k = sv.dataset.svc.split('/'); runCmd('kubectl describe svc ' + k[1] + ' -n ' + k[0]); }
      else if (nd) runCmd('kubectl describe node ' + nd.dataset.node);
    }
    root.onclick = function (e) { act(e.target); };
    root.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(e.target); } };
    root.onmouseover = root.onfocusin = function (e) { var sv = e.target.closest && e.target.closest('.dia-svc'); if (sv) hlSvc(sv.dataset.svc); };
    root.onmouseout = root.onfocusout = function (e) { if (e.target.closest && e.target.closest('.dia-svc')) hlSvc(''); };
  }
  // ── docs peek drawer ──
  function toggleDocs() {
    var ex = $('lrDocs'); if (ex) { ex.remove(); return; }
    var d = document.createElement('aside'); d.id = 'lrDocs'; d.className = 'lr-docs'; d.setAttribute('aria-label', 'Docs peek');
    d.innerHTML = '<div class="lr-docs-h"><b>📖 Docs peek</b><button id="lrDocsX" aria-label="Close docs">✕</button></div>' + (cur.mode === 'real' ? '' : '<input id="lrDocsQ" placeholder="Search commands…" aria-label="Search commands" autocomplete="off">') + '<div id="lrDocsBody"></div>';
    $('labRunner').appendChild(d); $('lrDocsX').onclick = function () { d.remove(); };
    var q = $('lrDocsQ'); if (q) { q.oninput = function () { renderDocs(q.value); }; q.focus(); }
    d.onkeydown = function (e) { if (e.key === 'Escape') { d.remove(); var i = $('lrIn'); if (i) i.focus(); } };
    renderDocs('');
  }
  function renderDocs(q) {
    var r = cur, body = $('lrDocsBody'); if (!body || !KL.docs) return; var real = r.mode === 'real', v = KL.docs.view(r.lab, q, real), h = '';
    if (!real) {
      h += '<h5>' + (q ? 'Matching commands' : 'Related to this lab') + '</h5>' + (v.cmds.length ? v.cmds.map(function (c) { return '<button class="lr-doc-cmd" data-c="' + esc(c.cmd) + '"><code>' + esc(c.cmd) + '</code><span>' + esc(c.exp) + '</span></button>'; }).join('') : '<p class="lr-doc-none">No match.</p>');
    } else h += '<p class="lr-doc-note">The real exam only allows kubernetes.io documentation. Our cheatsheet is hidden in this mode.</p>';
    h += '<h5>kubernetes.io pages</h5>' + v.links.map(function (l) { return '<a class="lr-doc-link" href="' + esc(l.u) + '" target="_blank" rel="noopener">' + esc(l.t) + ' ↗</a>'; }).join('') + '<p class="lr-doc-note">Links open online. Commands work fully offline.</p>';
    body.innerHTML = h;
    body.querySelectorAll('.lr-doc-cmd').forEach(function (b) { b.onclick = function () { var i = $('lrIn'); i.value = b.dataset.c; i.focus(); }; });
  }
  // view toggle: diagram / text
  function getView() { try { return localStorage.getItem('kl.labview') === 'txt' ? 'txt' : 'dia'; } catch (e) { return 'dia'; } }
  function setView(v) {
    try { localStorage.setItem('kl.labview', v); } catch (e) {}
    $('lrDia').hidden = v !== 'dia'; $('lrState').hidden = v !== 'txt';
    $('lrTabDia').classList.toggle('on', v === 'dia'); $('lrTabTxt').classList.toggle('on', v === 'txt');
    $('lrTabDia').setAttribute('aria-selected', v === 'dia'); $('lrTabTxt').setAttribute('aria-selected', v === 'txt');
  }
  // live cluster diagram: nodes → pods (colour = health), services with endpoint counts. Elements are reused so changes animate.
  function podClass(st, ready) {
    if (ready) return 'ok'; if (/Completed|Succeeded/.test(st)) return 'done'; if (/Terminating/.test(st)) return 'term';
    if (/^(Pending|ContainerCreating|PodInitializing|Init:\d)/.test(st)) return 'wait'; return 'bad';
  }
  function refreshDiagram() {
    var r = cur, root = $('lrDia'); if (!root || !r) return; var s = r.sim;
    var pods = s.list('Pod').filter(function (p) { return !/^kube-/.test(p.metadata.namespace); });
    var nodes = s.list('Node', ''), svcs = s.list('Service').filter(function (x) { return !/^kube-/.test(x.metadata.namespace) && !(x.metadata.namespace === 'default' && x.metadata.name === 'kubernetes'); });
    var key = nodes.map(function (n) { return n.metadata.name; }).join(',');
    if (r.diaKey !== key || !root.firstChild) {
      root.innerHTML = '<div class="dia-svcs" id="diaSvcs"></div><div class="dia-nodes" id="diaNodes"></div><div class="dia-legend"><i class="ok"></i>✓ Ready <i class="wait"></i>◔ Pending <i class="bad"></i>✕ Failing <i class="term"></i>⏻ Terminating <i class="done"></i>● Completed <span class="dia-lg-s">🛡 NetworkPolicy</span> <span class="dia-lg-s">▌ colour = workload</span></div>';
      var nr = $('diaNodes'); r.nodeEls = {}; r.diaEls = {}; r.diaKey = key;
      nodes.concat([{ metadata: { name: '' } }]).forEach(function (n) { var nm = n.metadata.name, d = document.createElement('div'); d.className = 'dia-node' + (nm ? '' : ' unsched'); d.innerHTML = '<div class="dia-nh"' + (nm ? ' data-node="' + esc(nm) + '" tabindex="0" role="button" title="Describe node"' : '') + '><b>' + (nm ? esc(nm) : 'Unscheduled') + '</b><em></em></div><div class="dia-pods"></div>'; r.nodeEls[nm] = d; nr.appendChild(d); });
    }
    var cp = {}; nodes.forEach(function (n) { cp[n.metadata.name] = (n.spec.taints || []).some(function (t) { return t.key === 'node-role.kubernetes.io/control-plane'; }); });
    nodes.forEach(function (n) { var b = [], nm = n.metadata.name; if (cp[nm]) b.push('control-plane'); if (KL.Sim.nodeReady && !KL.Sim.nodeReady(n)) b.push('NotReady'); if (n.spec.unschedulable) b.push('cordoned'); else if ((n.spec.taints || []).some(function (t) { return t.key !== 'node-role.kubernetes.io/control-plane'; })) b.push('tainted'); var e = r.nodeEls[nm].querySelector('em'); e.textContent = b.join(' · '); r.nodeEls[nm].classList.toggle('cordon', !!n.spec.unschedulable); r.nodeEls[nm].classList.toggle('notready', !!(KL.Sim.nodeReady && !KL.Sim.nodeReady(n))); });
    var nps = []; try { nps = s.list('NetworkPolicy'); } catch (e) { /* none */ }
    function shielded(p) { return nps.some(function (np) { if (np.metadata.namespace !== p.metadata.namespace) return false; var ml = (np.spec.podSelector || {}).matchLabels || {}; return Object.keys(ml).every(function (k) { return (p.metadata.labels || {})[k] === ml[k]; }); }); }
    function hue(t) { var h = 0, i; for (i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) % 360; return h; }
    var seen = {}, per = {};
    pods.forEach(function (p) {
      var k = p.metadata.namespace + '/' + p.metadata.name, st = s.podStatus(p), cls = podClass(st, s.podReady(p) && p.status.phase === 'Running' && !p.metadata.deletionTimestamp);
      var nm = p.spec.nodeName || ''; if (!r.nodeEls[nm]) nm = ''; seen[k] = 1; (per[nm] = per[nm] || []).push([k, p, st, cls]);
    });
    Object.keys(r.nodeEls).forEach(function (nm) {
      var box = r.nodeEls[nm].querySelector('.dia-pods'), list = per[nm] || []; if (!nm) r.nodeEls[nm].hidden = !list.length;
      list.sort(function (a, b) { return a[0] < b[0] ? -1 : 1; }).forEach(function (x) {
        var k = x[0], p = x[1], el = r.diaEls[k], parts = p.metadata.name.split('-'), short = parts.length > 2 ? parts[parts.length - 1] : parts.slice(-1)[0], app = parts.length > 2 ? parts.slice(0, -2).join('-') : parts[0];
        if (!el) { el = r.diaEls[k] = document.createElement('div'); el.className = 'dia-pod pop'; el.innerHTML = '<b></b><i></i>'; el.tabIndex = 0; el.setAttribute('role', 'button'); el.dataset.k = k; setTimeout(function () { el.classList.remove('pop'); }, 500); }
        if (el.dataset.st !== x[2] && el.dataset.st) { el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 900); }
        el.dataset.st = x[2]; el.style.setProperty('--app', 'hsl(' + hue(app) + ',70%,60%)'); el.classList.toggle('shield', shielded(p)); el.className = el.className.replace(/\bst-\w+/g, '').trim() + ' st-' + x[3]; el.title = p.metadata.namespace + '/' + p.metadata.name + ' — ' + x[2] + (p.spec.nodeName ? ' on ' + p.spec.nodeName : '');
        el.firstChild.textContent = app.length > 9 ? app.slice(0, 8) + '…' : app; el.lastChild.textContent = x[2].length > 12 ? x[2].slice(0, 11) + '…' : x[2]; el.setAttribute('aria-label', el.title);
        if (el.parentNode !== box) box.appendChild(el); else if (el !== box.children[list.indexOf(x)]) box.insertBefore(el, box.children[list.indexOf(x)] || null);
      });
    });
    Object.keys(r.diaEls).forEach(function (k) { if (!seen[k]) { var el = r.diaEls[k]; delete r.diaEls[k]; el.classList.add('gone'); setTimeout(function () { el.remove(); }, 300); } });
    $('diaSvcs').innerHTML = svcs.map(function (x) { var n = 0; try { n = s.endpointsFor(x).length; } catch (e) {} var ext = x.spec.type === 'ExternalName', bad = !ext && x.spec.clusterIP !== 'None' && !n || (!ext && x.spec.selector && !n); return '<button type="button" class="dia-svc' + (bad ? ' bad' : '') + '" data-svc="' + esc(x.metadata.namespace + '/' + x.metadata.name) + '" title="Click: describe · hover: show endpoints">⇄ ' + esc(x.metadata.name) + ' <em>' + (ext ? 'external' : n + ' ep') + '</em></button>'; }).join('') || '<span class="dia-none">no services</span>';
    hlSvc(r.hlSvc || '');
  }
  // terminal
  function say(text, cls) { var r = cur; r.out.push({ t: text, c: cls || '' }); if (r.out.length > 600) r.out.shift(); appendLine(text, cls); }
  function appendLine(text, cls) { var o = $('lrOut'); if (!o) return; var d = document.createElement('div'); d.className = 'lr-o ' + (cls || ''); d.textContent = text.replace(/\n$/, ''); o.appendChild(d); var t = $('lrTerm'); t.scrollTop = t.scrollHeight; }
  function replay() { var r = cur; if (r.resumed) { appendLine('↻ Session restored (' + new Date(r.resumed).toLocaleString() + '). Everything you did is still here — use “Reset lab” to start over.', 'dim'); r.resumed = 0; } if (!r.out.length) { r.out.push({ t: 'KubeDrill simulator · type `help` · Tab completes · ↑↓ history · `vi file` opens an editor', c: 'dim' }); } r.out.forEach(function (l) { appendLine(l.t, l.c); }); }
  function prompt() { var r = cur, t = termSim(r); if (r.mode === 'real') return 'candidate@' + (r.ctxName || CTXS[0]) + ':' + t.cwd.replace(/^\/home\/student/, '~') + '$ '; return 'student@kubedrill:' + t.cwd.replace(/^\/home\/student/, '~') + ' (' + t.ctxNs + ')$ '; }
  function bindTerm() {
    var inp = $('lrIn'), r = cur; $('lrPrompt').textContent = r.buf ? '> ' : prompt();
    $('lrTerm').onclick = function (e) { if (!window.getSelection().toString()) inp.focus(); };
    inp.onkeydown = function (e) {
      if (e.key === 'Enter') { e.preventDefault(); var line = inp.value; inp.value = ''; submit(line); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (r.hi > 0) { r.hi--; inp.value = r.hist[r.hi]; } }
      else if (e.key === 'ArrowDown') { e.preventDefault(); if (r.hi < r.hist.length) { r.hi++; inp.value = r.hist[r.hi] || ''; } }
      else if (e.key === 'Tab') { e.preventDefault(); complete(inp); }
      else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); r.out = []; $('lrOut').innerHTML = ''; }
      else if (e.key === 'c' && e.ctrlKey) { e.preventDefault(); say(prompt() + inp.value + '^C', 'cmd'); inp.value = ''; r.buf = ''; $('lrPrompt').textContent = prompt(); }
    };
  }
  var VERBS = 'get describe create apply delete run expose scale set rollout logs exec label annotate taint cordon uncordon drain top auth api-resources explain wait patch edit config kustomize events autoscale'.split(' ');
  var KINDS = 'pods deployments services nodes namespaces configmaps secrets pvc pv sc ingress networkpolicies roles rolebindings serviceaccounts statefulsets daemonsets jobs cronjobs hpa pdb events endpoints replicasets resourcequotas limitranges crd gateways httproutes'.split(' ');
  function complete(inp) {
    var v = inp.value, parts = v.split(/\s+/), last = parts[parts.length - 1], pool;
    if (parts.length === 1) pool = ['kubectl', 'k', 'ls', 'cat', 'cd', 'mkdir', 'echo', 'vi', 'nano', 'grep', 'help', 'clear', 'trivy', 'etcdctl', 'kubeadm', 'curl', 'wget'];
    else if (/^(kubectl|k)$/.test(parts[0]) && parts.length === 2) pool = VERBS;
    else if (/^(kubectl|k)$/.test(parts[0]) && /^(get|describe|delete|edit|label|annotate|scale|patch)$/.test(parts[1]) && parts.length === 3) pool = KINDS;
    else { var r = cur; try { pool = Object.keys(r.sim.fs).filter(function (p) { return p.indexOf('/home/student/') === 0; }).map(function (p) { return p.replace('/home/student/', ''); }); } catch (e) { pool = []; } }
    var m = pool.filter(function (x) { return x.indexOf(last) === 0; }); if (m.length === 1) { parts[parts.length - 1] = m[0]; inp.value = parts.join(' ') + ' '; } else if (m.length > 1) say(m.join('  '), 'dim');
  }
  function submit(line) {
    var r = cur, sim = termSim(r); say(((r.buf ? '> ' : prompt())) + line, 'cmd');
    var text = r.buf ? r.buf + '\n' + line : line;
    if (sim.needsMore && sim.needsMore(text)) { r.buf = text; $('lrPrompt').textContent = '> '; return; }
    r.buf = ''; $('lrPrompt').textContent = prompt(); if (text.trim()) { r.hist.push(text.split('\n')[0]); r.hi = r.hist.length; }
    var t = text.trim(); if (t === 'clear') { r.out = []; $('lrOut').innerHTML = ''; return; }
    if (r.mode === 'real' && /^(k|kubectl)\s+config\s+(use-context|current-context|get-contexts)\b/.test(t)) { ctxCmd(t); return; }
    var go = function () {
      var res; try { res = sim.exec(text); } catch (e) { res = { stdout: '', stderr: 'simulator error: ' + e.message + '\n', code: 1 }; }
      if (res.stdout) say(res.stdout, ''); if (res.stderr) say(res.stderr, 'err');
      if (res.edit) openEditor(res.edit, res.applyOnSave);
      sim.settle(3); $('lrPrompt').textContent = prompt(); refreshState(); saveRun(r);
      try { window.dispatchEvent(new CustomEvent('kl:cmd', { detail: { run: r, line: text, res: res } })); } catch (e) { /* ignore */ }
    };
    // optional gate (predict-the-output asks a question first, then calls go)
    if (KL.gate && r.mode === 'learn' && KL.gate(r, text, go)) return;
    go();
  }
  function ctxCmd(t) {
    var r = cur, a = t.split(/\s+/), sub = a[2];
    if (sub === 'current-context') say(r.ctxName + '\n');
    else if (sub === 'get-contexts') say('CURRENT   NAME     CLUSTER   AUTHINFO\n' + CTXS.map(function (c) { return (c === r.ctxName ? '*' : ' ') + '         ' + c + '   ' + c + '   admin\n'; }).join(''));
    else if (CTXS.indexOf(a[3]) < 0) say('error: no context exists with the name: "' + (a[3] || '') + '"\n', 'err');
    else { r.ctxName = a[3]; ensureTerm(r); say('Switched to context "' + a[3] + '".\n'); var n = $('lrCtxNow'); if (n) n.textContent = a[3]; }
    $('lrPrompt').textContent = prompt(); saveRun(r);
  }
  function openEditor(path, apply) {
    var r = cur, ed = $('lrEditor'), ta = $('lrEdText'), c = termSim(r).readFile(path); $('lrEdName').textContent = path.replace('/home/student/', ''); ta.value = c === null ? '' : c; ed.hidden = false; ta.focus();
    function close() { ed.hidden = true; $('lrIn').focus(); }
    function save() { termSim(r).writeFile(path, ta.value); close(); say('saved ' + path.replace('/home/student/', ''), 'dim'); if (apply) { var x = termSim(r).exec('kubectl apply -f ' + path); if (x.stdout) say(x.stdout); if (x.stderr) say(x.stderr, 'err'); termSim(r).settle(3); refreshState(); } saveRun(r); }
    $('lrEdSave').onclick = save; $('lrEdCancel').onclick = close;
    ta.onkeydown = function (e) { if (e.key === 'Escape') close(); else if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); } else if (e.key === 'Tab') { e.preventDefault(); var s = ta.selectionStart; ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s + 2; } };
  }
  function refreshState() {
    var r = cur, el = $('lrState'); if (!el || !r) return; var s = r.sim, ns = r.lab.ns, sv = s.ctxNs, txt = '';
    s.ctxNs = ns;
    try {
      ['pods -o wide', 'deploy,sts,ds,job', 'svc,ing', 'pvc,hpa'].forEach(function (q) { var x = s.exec('kubectl get ' + q + ' 2>&1'); var t = (x.stdout + x.stderr).trim(); if (t && !/^No resources/.test(t)) txt += '$ kubectl get ' + q.split(' ')[0] + ' -n ' + ns + '\n' + t + '\n\n'; });
      var nd = s.exec('kubectl get nodes'); txt += '$ kubectl get nodes\n' + nd.stdout;
    } catch (e) { txt += 'state error: ' + e.message; }
    s.ctxNs = sv; el.textContent = txt;
    try { refreshDiagram(); } catch (e) { var d = $('lrDia'); if (d) d.textContent = 'diagram error: ' + e.message; }
  }
  KL.runner = { cur: function () { return cur; }, say: say, run: runCmd, refresh: refreshState, save: saveRun, tasks: renderTasks, prompt: prompt };
  window.addEventListener('pagehide', function () { if (cur) saveRun(cur, true); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && cur) saveRun(cur, true); });
  function boot() { renderIlabs(); bindFilters(); enhanceWalk(); }
  if (document.readyState !== 'loading') boot(); else document.addEventListener('DOMContentLoaded', boot);
  window.addEventListener('kl:store', function () { if ($('page-labs').classList.contains('active')) renderIlabs(); });
})();
