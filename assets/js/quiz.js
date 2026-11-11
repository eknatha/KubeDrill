/* Quiz engine: mcq / cmd (type the command) / order (arrange steps). Filters, Leitner spaced repetition via KL.store. */
(function () {
  'use strict';
  var KL = window.KL = window.KL || {};
  var TRACK_OF = { Architecture: ['CKA'], Scheduling: ['CKA', 'CKAD'], Workloads: ['CKAD', 'CKA'], Networking: ['CKA'], Storage: ['CKA'], Troubleshooting: ['CKA'], Security: ['CKS', 'CKA'], CKS: ['CKS'], Helm: ['CKAD', 'CKA'], Observability: ['CKAD', 'CKA'] };
  var ALL = [], cur = null, session = null;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function md(s) { return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>'); }
  function hash(s) { var h = 5381, i; for (i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function build() {
    var base = (typeof QUIZ_BANK !== 'undefined' ? QUIZ_BANK : []).map(function (q) { return Object.assign({ type: 'mcq' }, q); });
    var extra = (KL.quizExtra || []).map(function (a) { // compact tuple form
      if (!Array.isArray(a)) return Object.assign({ type: 'mcq' }, a);
      return { type: 'mcq', q: a[0], cat: a[1], diff: a[2], opts: a[3], ans: a[4], exp: a[5], tr: a[6] ? a[6].split(',') : null };
    }).concat((KL.quizCmd || []).map(function (a) { return { type: 'cmd', q: a[0], cat: a[1], diff: a[2], accept: a[3], show: a[4], exp: a[5], tr: a[6] ? a[6].split(',') : null }; }),
      (KL.quizOrder || []).map(function (a) { return { type: 'order', q: a[0], cat: a[1], diff: a[2], items: a[3], exp: a[4], tr: a[5] ? a[5].split(',') : null }; }));
    ALL = base.concat(extra); var seen = {};
    ALL.forEach(function (q) { q.id = hash(q.type + q.q); if (seen[q.id]) q.id += 'x'; seen[q.id] = 1; q.tr = q.tr || TRACK_OF[q.cat] || ['CKA']; });
    KL.quizAll = ALL;
  }
  function $(id) { return document.getElementById(id); }
  function fillCats() {
    var s = $('quizCatFilter'); if (!s || s.options.length > 1) return;
    var cats = {}; ALL.forEach(function (q) { cats[q.cat] = 1; });
    Object.keys(cats).sort().forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = c; s.appendChild(o); });
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  window.startQuiz = function (opts) {
    if (!ALL.length) build(); fillCats();
    opts = opts || {};
    var tr = opts.track || $('quizTrackFilter').value, cat = opts.cat || $('quizCatFilter').value, df = opts.diff || $('quizDiffFilter').value, mode = opts.mode || $('quizModeFilter').value;
    if (opts.track) $('quizTrackFilter').value = tr; if (opts.cat) $('quizCatFilter').value = cat; if (opts.mode) $('quizModeFilter').value = mode;
    var pool = ALL.filter(function (q) {
      if (tr !== 'all' && q.tr.indexOf(tr) < 0) return false; if (cat !== 'all' && q.cat !== cat) return false; if (df !== 'all' && q.diff !== df) return false;
      var st = KL.store.qState(q.id);
      if (mode === 'due') return !!st && KL.store.qDue(q.id); if (mode === 'missed') return !!st && st.wrong > 0; if (mode === 'new') return !st; return true;
    });
    pool = shuffle(pool); var n = opts.n || 20; if (mode === 'all' && !opts.n) n = Math.min(20, pool.length);
    session = { qs: pool.slice(0, n), i: 0, score: 0, wrongIds: [] };
    $('quizResults').classList.remove('show'); $('quizResults').style.display = 'none'; $('quizCard').style.display = '';
    $('scoreDisplay').textContent = '0'; $('totalDisplay').textContent = String(session.qs.length);
    if (!session.qs.length) { $('quizCard').innerHTML = '<div class="quiz-q">No questions match this filter' + (mode === 'due' ? ' — nothing is due for review right now. 🎉' : '.') + '</div>'; $('quizProgress').style.width = '0%'; return; }
    showQ();
  };
  function showQ() {
    var q = cur = session.qs[session.i]; delete q._done; var card = $('quizCard'), html, optsHtml = '';
    $('quizProgress').style.width = (session.i / session.qs.length * 100) + '%';
    var st = KL.store.qState(q.id), meta = '<div class="quiz-meta"><span class="quiz-num">Q' + (session.i + 1) + ' / ' + session.qs.length + '</span><span class="quiz-cat">' + esc(q.cat) + '</span><span class="quiz-cat">' + q.tr.join('/') + '</span><span class="quiz-diff-' + q.diff.toLowerCase() + '">' + q.diff + '</span>' + (q.type !== 'mcq' ? '<span class="quiz-cat">' + (q.type === 'cmd' ? '⌨ type it' : '⇅ order') + '</span>' : '') + (st && st.wrong ? '<span class="quiz-cat">↺ review</span>' : '') + '</div>';
    html = meta + '<div class="quiz-q">' + md(q.q) + '</div>';
    if (q.type === 'mcq') {
      optsHtml = '<div class="quiz-options" role="radiogroup">' + q.opts.map(function (o, i) { return '<button class="quiz-opt" data-i="' + i + '" role="radio" aria-checked="false"><b>' + 'ABCD'[i] + '</b> ' + md(o) + '</button>'; }).join('') + '</div>';
    } else if (q.type === 'cmd') {
      optsHtml = '<div class="quiz-cmd"><span class="prompt">$</span><input id="qcmd" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Your command" placeholder="type the command…"><button class="btn-primary" id="qcmdgo">Check</button></div>';
    } else {
      q._cur = shuffle(q.items.map(function (t, i) { return i; })); q._pick = [];
      optsHtml = '<div class="quiz-order"><div class="qo-label">Click the steps in the correct order</div><div class="qo-pool" id="qoPool"></div><div class="qo-label">Your order</div><ol class="qo-ans" id="qoAns"></ol><div class="quiz-btns"><button class="btn-secondary" id="qoReset">Reset</button><button class="btn-primary" id="qoGo">Check</button></div></div>';
    }
    html += optsHtml + '<div class="quiz-explain" id="quizExplain" aria-live="polite"></div><div class="quiz-btns"><button class="btn-primary" id="quizNext" style="display:none">' + (session.i + 1 === session.qs.length ? 'See results →' : 'Next →') + '</button></div>';
    card.innerHTML = html;
    if (q.type === 'mcq') card.querySelectorAll('.quiz-opt').forEach(function (b) { b.onclick = function () { answer(+b.dataset.i === q.ans, +b.dataset.i); }; });
    else if (q.type === 'cmd') { var inp = $('qcmd'); inp.focus(); inp.onkeydown = function (e) { if (e.key === 'Enter') checkCmd(); }; $('qcmdgo').onclick = checkCmd; }
    else { renderOrder(); $('qoReset').onclick = function () { q._pick = []; renderOrder(); }; $('qoGo').onclick = checkOrder; }
    $('quizNext').onclick = next;
  }
  function norm(s) { return s.trim().replace(/\s+/g, ' ').replace(/^kubectl /, 'k ').replace(/ (--namespace|-n)[= ]/g, ' -n '); }
  function checkCmd() { var q = cur, v = norm($('qcmd').value); if (!v) return; var ok = q.accept.some(function (a) { return new RegExp('^' + a + '$', 'i').test(v) || new RegExp('^' + a.replace(/^kubectl /, 'k ') + '$', 'i').test(v); }); $('qcmd').disabled = true; $('qcmdgo').disabled = true; answer(ok, null, '<div class="qa-show">Example: <code>' + esc(q.show) + '</code></div>'); }
  function renderOrder() {
    var q = cur; $('qoPool').innerHTML = q._cur.filter(function (i) { return q._pick.indexOf(i) < 0; }).map(function (i) { return '<button class="qo-item" data-i="' + i + '">' + md(q.items[i]) + '</button>'; }).join('');
    $('qoAns').innerHTML = q._pick.map(function (i) { return '<li>' + md(q.items[i]) + '</li>'; }).join('');
    $('qoPool').querySelectorAll('.qo-item').forEach(function (b) { b.onclick = function () { q._pick.push(+b.dataset.i); renderOrder(); }; });
  }
  function checkOrder() { var q = cur; if (q._pick.length < q.items.length) return; var ok = q._pick.every(function (v, i) { return v === i; }); $('qoGo').disabled = true; $('qoReset').disabled = true; answer(ok, null, '<ol class="qo-ans">' + q.items.map(function (t) { return '<li>' + md(t) + '</li>'; }).join('') + '</ol>'); }
  function answer(ok, chosen, extra) {
    var q = cur; if (q._done) return; q._done = true;
    if (q.type === 'mcq') document.querySelectorAll('.quiz-opt').forEach(function (b, i) { b.disabled = true; b.setAttribute('disabled', ''); if (i === q.ans) b.classList.add('correct'); else if (i === chosen) b.classList.add('wrong'); });
    if (ok) { session.score++; $('scoreDisplay').textContent = String(session.score); } else session.wrongIds.push(q.id);
    KL.store.qRecord(q.id, ok);
    var ex = $('quizExplain'); ex.innerHTML = '<b>' + (ok ? '✓ Correct.' : '✗ Not quite.') + '</b> ' + md(q.exp || '') + (extra || ''); ex.style.display = 'block';
    $('quizNext').style.display = ''; if (q.type === 'mcq') $('quizNext').focus();
    if (ok && window.KL.fx) KL.fx.pop($('scoreDisplay'));
  }
  function next() {
    delete cur._done; session.i++;
    if (session.i >= session.qs.length) return finish(); showQ();
  }
  function finish() {
    $('quizProgress').style.width = '100%'; $('quizCard').style.display = 'none';
    var r = $('quizResults'); r.style.display = 'block'; r.classList.add('show');
    var pct = Math.round(session.score / session.qs.length * 100);
    $('resultScore').textContent = session.score; $('resultTotal').textContent = session.qs.length;
    $('resultGrade').textContent = pct >= 85 ? '🏆 Exam ready' : pct >= 66 ? '👍 Passing — review the misses' : '📚 Keep practising';
    var p = r.querySelector('p'); p.innerHTML = session.wrongIds.length ? 'Missed questions come back through <b>Due for review</b> (spaced repetition). <button class="btn-secondary" onclick="startQuiz({mode:\'missed\'})">Practise misses</button>' : 'Perfect round!';
    if (pct >= 85 && KL.fx) KL.fx.confetti();
  }
  KL.quizCur = function () { return cur; };
  KL.quizInit = function () { if (!ALL.length) build(); fillCats(); KL.counts = KL.counts || {}; KL.counts.quiz = ALL.length; };
  KL.quizDueCount = function () { if (!ALL.length) build(); return ALL.filter(function (q) { return KL.store.qDue(q.id); }).length; };
  window.addEventListener('kl:page', function (e) { if (e.detail.name === 'quiz' && !session) startQuiz(); });
  document.addEventListener('DOMContentLoaded', function () { KL.quizInit(); });
  if (document.readyState !== 'loading') KL.quizInit();
})();
