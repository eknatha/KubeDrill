/* Timed exam mode: a set of interactive labs, no hints/checker, countdown, scored at the end (pass ≥ 66%). */
(function () {
  'use strict';
  var KL = window.KL, Labs = KL.Labs, store = KL.store, $ = function (id) { return document.getElementById(id); };
  var S = KL.exam = { active: null };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(sec) { sec = Math.max(0, Math.floor(sec)); var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return (h ? h + ':' : '') + ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2); }
  var timer = null;
  var PRESETS = { mini: { label: 'Mini · 30 min · 4 tasks', n: 4, mins: 30 }, std: { label: 'Standard · 60 min · 8 tasks', n: 8, mins: 60 }, full: { label: 'Full · 120 min · 14 tasks', n: 14, mins: 120 } };

  function pick(track, n) {
    var pool = Labs.list.filter(function (l) { return track === 'ALL' || l.track.indexOf(track) >= 0; });
    for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    return pool.slice(0, n).map(function (l) { return l.id; });
  }
  // ── curated mock-exam bundles (deterministic, weighted, domain report) ──
  var WT = { Beginner: 4, Intermediate: 6, Advanced: 9 };
  function weightsFor(ids) { var tot = 0, w = {}; ids.forEach(function (id) { tot += WT[Labs.byId[id].diff] || 6; }); ids.forEach(function (id) { w[id] = Math.round((WT[Labs.byId[id].diff] || 6) / tot * 1000) / 10; }); return w; }
  S.bundles = function () {
    var out = [];
    ['CKA', 'CKAD', 'CKS'].forEach(function (tr) {
      var pool = Labs.list.filter(function (l) { return l.track.indexOf(tr) >= 0; }), g = tr === 'CKS' ? 2 : 3;
      for (var b = 0; b < g; b++) {
        var ids = pool.filter(function (l, i) { return i % g === b; }).map(function (l) { return l.id; }).slice(0, 12); if (ids.length < 4) continue;
        var sum = ids.reduce(function (a, id) { return a + (parseInt(Labs.byId[id].time, 10) || 10); }, 0);
        out.push({ id: tr.toLowerCase() + '-mock-' + (b + 1), name: tr + ' Mock ' + (b + 1), track: tr, ids: ids, mins: Math.max(45, Math.min(120, Math.round(sum * 0.8 / 5) * 5)) });
      }
    });
    return out;
  };
  S.startBundle = function (bid, env) {
    var b = S.bundles().filter(function (x) { return x.id === bid; })[0]; if (!b) return;
    Promise.all(b.ids.map(function (id) { return KL.labRun(id, true); })).then(function () {
      S.result = null; S.active = { track: b.track, ids: b.ids, start: Date.now(), end: Date.now() + b.mins * 60000, mins: b.mins, flags: {}, w: weightsFor(b.ids), env: !!env, name: b.name }; saveActive();
      if (location.hash === '#exam') render(); else location.hash = 'exam';
    });
  };
  S.start = function (track, preset, env) {
    var p = PRESETS[preset]; var ids = pick(track, p.n);
    Promise.all(ids.map(function (id) { return KL.labRun(id, true); })).then(function () {
      S.active = { track: track, ids: ids, start: Date.now(), end: Date.now() + p.mins * 60000, mins: p.mins, flags: {}, w: weightsFor(ids), env: !!env }; saveActive();
      if (location.hash === '#exam') render(); else location.hash = 'exam';
    });
  };
  var AK = 'kubelab:exam-active';
  function saveActive() { try { if (S.active) localStorage.setItem(AK, JSON.stringify(S.active)); else localStorage.removeItem(AK); } catch (e) { /* ignore */ } }
  S.save = saveActive;
  function restoreActive() { if (S.active) return false; try { var a = JSON.parse(localStorage.getItem(AK)); if (a && a.ids && a.ids.every(function (id) { return Labs.byId[id]; })) { S.active = a; return true; } } catch (e) { /* ignore */ } return false; }
  S.finish = function () {
    var a = S.active; if (!a) return; clearInterval(timer); S.active = null; saveActive();
    Promise.all(a.ids.map(function (id) { return KL.labRun(id); })).then(function (runs) { finishWith(a, runs); });
  };
  function finishWith(a, runs) {
    var w = a.w || weightsFor(a.ids), dom = {};
    var rows = a.ids.map(function (id, i) { var lab = Labs.byId[id], res = Labs.check(runs[i].sim, lab); return { lab: lab, res: res, w: w[id] || 0 }; });
    var got = 0, tot = 0, score = 0, wt = 0; rows.forEach(function (r) { got += r.res.passed; tot += r.res.total; var f = r.res.total ? r.res.passed / r.res.total : 0; score += r.w * f; wt += r.w; var d = dom[r.lab.domain] = dom[r.lab.domain] || { got: 0, w: 0 }; d.got += r.w * f; d.w += r.w; });
    var pct = wt ? Math.round(score / wt * 100) : 0, secs = Math.min(Math.round((Date.now() - a.start) / 1000), a.mins * 60);
    store.addExam({ date: Date.now(), track: a.name || a.track, pct: pct, got: got, tot: tot, secs: secs, n: a.ids.length });
    var domains = Object.keys(dom).map(function (k) { return { name: k, pct: Math.round(dom[k].got / dom[k].w * 100), w: Math.round(dom[k].w) }; }).sort(function (x, y) { return x.pct - y.pct; });
    S.result = { rows: rows, pct: pct, got: got, tot: tot, secs: secs, track: a.name || a.track, domains: domains, weighted: true };
    render(); if (pct >= 66 && KL.fx) KL.fx.confetti();
  }
  function render() {
    var root = $('examRoot'); if (!root) return; clearInterval(timer); if (!S.active && !S.result) restoreActive();
    var a = S.active, h = '<div class="section-header"><div class="section-tag">Exam Simulator</div><h2 class="section-title">Timed Exam Mode</h2><p class="section-desc">Real exams are performance-based: no hints, no checker, a countdown. Pick a track and go. Each task is a broken cluster in the built-in simulator; you are scored on the end state (pass mark 66%).</p></div>';
    if (a) {
      h += '<div class="ex-bar"><div class="ex-time" id="exTime">--:--</div><div class="ex-sub">time remaining · ' + a.ids.length + ' tasks · ' + a.track + '</div><button class="btn-primary" id="exFinish">Finish &amp; score</button></div><div class="ex-list">' +
        a.ids.map(function (id, i) { var l = Labs.byId[id]; return '<a class="ex-q' + (a.flags[id] ? ' flag' : '') + '" href="#lab/' + id + '"><span class="ex-n">' + (i + 1) + '</span><span class="ex-t">' + esc(l.title) + '</span><span class="ex-w">' + (a.w && a.w[id] ? a.w[id] + '% · ' : '') + l.tasks.length + ' tasks · ' + l.time + '</span><span class="lab-diff diff-' + (l.diff === 'Beginner' ? 'beginner' : l.diff === 'Intermediate' ? 'intermediate' : 'advanced') + '">' + l.diff + '</span></a>'; }).join('') + '</div><p class="ex-note">Tip: do easy tasks first; use ⚑ Flag to mark tasks for review.' + (a.env ? ' <b>Real environment:</b> each task starts in the wrong context — run the <code>use-context</code> command it shows.' : ' The context is already set to each task\'s namespace.') + ' Leaving this page does not pause the clock.</p>';
      root.innerHTML = h; $('exFinish').onclick = function () { if (confirm('Finish the exam and see your score?')) S.finish(); };
      var tick = function () { var rem = (a.end - Date.now()) / 1000, el = $('exTime'); if (el) { el.textContent = fmt(rem); el.classList.toggle('low', rem < 300); } if (rem <= 0) { clearInterval(timer); S.finish(); } };
      tick(); timer = setInterval(tick, 1000); return;
    }
    if (S.result) {
      var r = S.result, pass = r.pct >= 66;
      h += '<div class="ex-result ' + (pass ? 'pass' : 'fail') + '"><div class="ex-score">' + r.pct + '%</div><div class="ex-verdict">' + (pass ? '🏆 PASS — you cleared 66%' : '📚 Not yet — you need 66%') + '</div><div class="ex-sub">' + r.got + ' / ' + r.tot + ' checks · ' + fmt(r.secs) + ' used · ' + r.track + (r.weighted ? ' · weighted' : '') + '</div></div>' + (r.domains ? '<div class="ex-dom"><h3>Score by domain</h3>' + r.domains.map(function (d) { return '<div class="ex-dr"><span>' + esc(d.name) + '</span><div class="ex-db"><div class="' + (d.pct >= 66 ? 'ok' : 'no') + '" style="width:' + d.pct + '%"></div></div><b>' + d.pct + '%</b></div>'; }).join('') + '<p class="ex-note">Weakest area: <b>' + esc(r.domains[0].name) + '</b> — retry its tasks below in practice mode.</p></div>' : '') +
        '<div class="ex-list">' + r.rows.map(function (x) { return '<div class="ex-q ' + (x.res.ok ? 'okq' : 'badq') + '"><span class="ex-n">' + (x.res.ok ? '✓' : '✗') + '</span><span class="ex-t">' + esc(x.lab.title) + '</span><span class="ex-w">' + (x.w ? x.w + '% · ' : '') + x.res.passed + '/' + x.res.total + '</span><a href="#lab/' + x.lab.id + '" onclick="KL.labRun(\'' + x.lab.id + '\',true)">retry in practice mode</a></div>'; }).join('') + '</div><button class="btn-primary" id="exAgain" style="margin-top:1.5rem">New exam</button>';
      root.innerHTML = h; $('exAgain').onclick = function () { S.result = null; render(); }; return;
    }
    var hist = store.data().exams.slice(-8).reverse();
    h += '<div class="ex-setup"><label>Track<select id="exTrack"><option value="CKA">CKA — Administrator</option><option value="CKAD">CKAD — Developer</option><option value="CKS">CKS — Security</option><option value="ALL">Mixed</option></select></label><label>Length<select id="exLen">' + Object.keys(PRESETS).map(function (k) { return '<option value="' + k + '">' + PRESETS[k].label + '</option>'; }).join('') + '</select></label><button class="btn-primary" id="exGo">▶ Start exam</button></div>' +
      '<div class="ex-bundles"><h3>Mock exam bundles</h3><p class="ex-note">Fixed sets with weighted tasks and a domain report. Pass mark 66%.</p><div class="ex-bgrid">' + S.bundles().map(function (b) { return '<button class="ex-b" data-b="' + b.id + '"><b>' + b.name + '</b><span>' + b.ids.length + ' tasks · ' + b.mins + ' min</span></button>'; }).join('') + '</div><label class="ex-env"><input type="checkbox" id="exEnv" checked> Real exam environment <small>(no checker or cluster panel, several contexts — switch with <code>kubectl config use-context</code>)</small></label></div>' +
      '<div class="ex-hist"><h3>Your attempts</h3>' + (hist.length ? '<table><tr><th>Date</th><th>Track</th><th>Score</th><th>Time</th></tr>' + hist.map(function (e) { return '<tr><td>' + new Date(e.date).toLocaleDateString() + '</td><td>' + e.track + '</td><td class="' + (e.pct >= 66 ? 'p' : 'f') + '">' + e.pct + '%</td><td>' + fmt(e.secs) + '</td></tr>'; }).join('') + '</table>' : '<p class="ex-note">No attempts yet.</p>') + '</div>' +
      '<p class="ex-note">Disclaimer: the simulator is a teaching model of Kubernetes behaviour, not the real exam environment. Practise on a real cluster with the kind lab packs as well.</p>';
    root.innerHTML = h; $('exGo').onclick = function () { S.start($('exTrack').value, $('exLen').value, $('exEnv').checked); };
    root.querySelectorAll('.ex-b').forEach(function (b) { b.onclick = function () { S.startBundle(b.dataset.b, $('exEnv').checked); }; });
  }
  restoreActive(); if (S.active && S.active.end < Date.now()) S.finish();
  KL.route('exam', render);
  // adapt the lab runner while an exam is running
  window.addEventListener('kl:runner', function (e) {
    var a = S.active; if (!a || a.ids.indexOf(e.detail.lab.id) < 0) return;
    var bar = document.querySelector('.lr-bar'); if (!bar) return;
    var chk = $('lrCheck'); if (chk) { chk.textContent = '⚑ Flag'; chk.onclick = function () { a.flags[e.detail.lab.id] = !a.flags[e.detail.lab.id]; saveActive(); chk.classList.toggle('flagged', !!a.flags[e.detail.lab.id]); }; }
    var rs = $('lrReset'); if (rs) rs.remove();
    ['.lr-hints', '.lr-sol', '.lr-pack', '.lr-feedback', '.lr-mode', '#lrPredict', '.lr-exam-note'].forEach(function (q) { document.querySelectorAll(q).forEach(function (n) { n.remove(); }); });
    var back = bar.querySelector('.lr-back'); back.textContent = '← Exam overview'; back.href = '#exam';
    var t = $('lrTimer'), iv = setInterval(function () { if (!document.body.contains(t) || !S.active) return clearInterval(iv); t.textContent = '⏳ ' + fmt((a.end - Date.now()) / 1000); }, 1000);
  });
})();
