/* Animated cluster diagram, ghost typing, typing token highlight, motion toggle, guided tour. CSS/SVG only, offline. */
(function () {
  'use strict';
  var KL = window.KL;
  function $(i) { return document.getElementById(i); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} }
  var mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function reduced() { var m = ls('kl.motion'); return m === 'off' || (m !== 'on' && mq.matches); }
  function applyMotion() { document.documentElement.setAttribute('data-motion', reduced() ? 'off' : 'on'); var b = $('lrMotion'); if (b) { b.setAttribute('aria-pressed', String(!reduced())); b.textContent = reduced() ? '🎞 Motion: off' : '🎞 Motion: on'; } }
  KL.motionOff = reduced; applyMotion();
  function sim() { return KL._m ? KL._m.simNow() : Promise.resolve(null); }

  // ── per-service endpoint dots + controller chain strip ──
  var CHAIN = ['kubectl', 'API server', 'Controllers', 'Scheduler', 'kubelet'];
  function ensureChain(root) {
    if (root.querySelector('.dia-chain')) return;
    var d = document.createElement('div'); d.className = 'dia-chain'; d.setAttribute('aria-hidden', 'true');
    d.innerHTML = CHAIN.map(function (c) { return '<span>' + c + '</span>'; }).join('<i>→</i>'); root.insertBefore(d, root.firstChild);
  }
  function pulse() {
    var root = $('lrDia'); if (!root || reduced()) return; ensureChain(root);
    root.querySelectorAll('.dia-chain span').forEach(function (s, i) { setTimeout(function () { s.classList.add('on'); setTimeout(function () { s.classList.remove('on'); }, 420); }, i * 220); });
  }
  var MUT = /^\s*(kubectl|k)\s+(apply|create|scale|delete|rollout|set|patch|run|expose|drain|cordon|uncordon|label|annotate|edit|replace|taint|autoscale)\b/;
  document.addEventListener('keydown', function (e) { if (e.target && e.target.id === 'lrIn' && e.key === 'Enter' && MUT.test(e.target.value)) pulse(); }, true);
  function epBars(root) {
    sim().then(function (s) {
      if (!s) return;
      root.querySelectorAll('.dia-svc').forEach(function (b) {
        var k = (b.dataset.svc || '').split('/'), n = 0, sv; try { sv = s.get('Service', k[0], k[1]); n = s.endpointsFor(sv).length; } catch (e) { return; }
        var bar = b.querySelector('.dia-epbar'); if (bar && bar.dataset.n === String(n)) return;
        if (!bar) { bar = document.createElement('span'); bar.className = 'dia-epbar'; bar.setAttribute('aria-hidden', 'true'); b.appendChild(bar); }
        bar.dataset.n = String(n); bar.innerHTML = n ? new Array(Math.min(n, 8) + 1).join('<u></u>') : '<em>0</em>';
      });
    });
  }

  // ── FLIP slide, birth ring, scheduler arc, "no fit" shake ──
  var prev = {}, busy = false;
  function nodeOf(el) { var n = el.closest('.dia-node'); return n ? (n.classList.contains('unsched') ? '' : (n.querySelector('.dia-nh') || {}).dataset ? n.querySelector('.dia-nh').dataset.node : '') : null; }
  function arc(root, a, b) {
    var rb = root.getBoundingClientRect(), ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'dia-arc'); svg.setAttribute('width', root.scrollWidth); svg.setAttribute('height', root.scrollHeight); svg.setAttribute('aria-hidden', 'true');
    var x1 = a.left - rb.left + a.width / 2 + root.scrollLeft, y1 = a.top - rb.top + a.height / 2 + root.scrollTop, x2 = b.left - rb.left + b.width / 2 + root.scrollLeft, y2 = b.top - rb.top + b.height / 2 + root.scrollTop;
    var d = 'M' + x1 + ',' + y1 + ' Q' + ((x1 + x2) / 2) + ',' + (Math.min(y1, y2) - 50) + ' ' + x2 + ',' + y2;
    svg.innerHTML = '<path d="' + d + '"/><circle r="5"><animateMotion dur="0.7s" fill="freeze" path="' + d + '"/></circle>';
    root.appendChild(svg); setTimeout(function () { svg.remove(); }, 1000);
  }
  function tick() {
    busy = false; var root = $('lrDia'); if (!root) return; ensureChain(root); epBars(root); var skip = reduced();
    var next = {}; root.querySelectorAll('.dia-pod').forEach(function (el) {
      var k = el.dataset.k, r = el.getBoundingClientRect(), nd = nodeOf(el), p = prev[k]; next[k] = { l: r.left, t: r.top, w: r.width, h: r.height, n: nd };
      if (skip) return;
      if (!p) { if (nd === '') { el.classList.add('nofit'); setTimeout(function () { el.classList.remove('nofit'); }, 700); } return; }
      var dx = p.l - r.left, dy = p.t - r.top;
      if ((Math.abs(dx) > 2 || Math.abs(dy) > 2) && p.n !== nd) {
        el.style.transition = 'none'; el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; void el.offsetWidth;
        el.style.transition = 'transform .6s cubic-bezier(.2,.8,.2,1)'; el.style.transform = '';
        setTimeout(function () { el.style.transition = ''; }, 700);
        if (p.n === '' && nd) arc(root, { left: p.l, top: p.t, width: p.w, height: p.h }, r);
      }
    });
    prev = next;
  }
  function schedule() { if (busy) return; busy = true; requestAnimationFrame(tick); }
  var obs = null;
  function watch() { var root = $('lrDia'); if (!root) { prev = {}; return; } if (root._anim) return; root._anim = 1; prev = {}; if (obs) obs.disconnect(); obs = new MutationObserver(schedule); obs.observe(root, { childList: true, subtree: true }); schedule(); }

  // ── service hover: traffic dots + blocked ──
  function clearTrace() { document.querySelectorAll('.dia-lines,.dia-trace').forEach(function (n) { n.remove(); }); }
  function draw(svcEl) {
    clearTrace(); var root = $('lrDia'); if (!root || !svcEl) return; var key = (svcEl.dataset.svc || '').split('/');
    sim().then(function (s) {
      if (!s || !root.contains(svcEl)) return; clearTrace();
      var sv = s.get('Service', key[0], key[1]); if (!sv) return;
      var eps = {}; s.endpointsFor(sv).forEach(function (x) { eps[x.metadata.namespace + '/' + x.metadata.name] = 1; });
      var sel = sv.spec.selector || {}, matched = (Object.keys(sel).length ? s.list('Pod', key[0]) : []).filter(function (p) { var l = p.metadata.labels || {}; return Object.keys(sel).every(function (q) { return l[q] === sel[q]; }); });
      var ings = s.list('Ingress', key[0]).filter(function (g) { return JSON.stringify(g.spec || {}).indexOf('"name":"' + key[1] + '"') >= 0; }), n = Object.keys(eps).length;
      var tr = document.createElement('div'); tr.className = 'dia-trace';
      tr.innerHTML = (ings.length ? '🌐 Ingress <b>' + esc(ings[0].metadata.name) + '</b> → ' : '') + 'Service <b>' + esc(key[1]) + '</b> → <b>' + n + '</b> ready pod' + (n === 1 ? '' : 's') + (n ? '' : ' <em>(no traffic can flow)</em>') + (matched.length > n ? ' · <span class="bad">' + (matched.length - n) + ' matching but not Ready</span>' : '');
      root.insertBefore(tr, root.firstChild);
      var rb = root.getBoundingClientRect(), sb = svcEl.getBoundingClientRect(), ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'), inner = '';
      svg.setAttribute('class', 'dia-lines'); svg.setAttribute('width', root.scrollWidth); svg.setAttribute('height', root.scrollHeight); svg.setAttribute('aria-hidden', 'true');
      var x1 = sb.left - rb.left + sb.width / 2 + root.scrollLeft, y1 = sb.top - rb.top + sb.height + root.scrollTop;
      matched.forEach(function (p) {
        var k = p.metadata.namespace + '/' + p.metadata.name, el = root.querySelector('.dia-pod[data-k="' + k + '"]'); if (!el) return;
        var pb = el.getBoundingClientRect(), x2 = pb.left - rb.left + pb.width / 2 + root.scrollLeft, y2 = pb.top - rb.top + root.scrollTop, ok = !!eps[k];
        var d = 'M' + x1 + ',' + y1 + ' C' + x1 + ',' + (y1 + 40) + ' ' + x2 + ',' + (y2 - 40) + ' ' + x2 + ',' + y2;
        inner += '<path class="' + (ok ? '' : 'blk') + '" d="' + d + '"/>' + (ok ? (reduced() ? '' : '<circle r="3.5"><animateMotion dur="1.1s" repeatCount="indefinite" path="' + d + '"/></circle><circle r="3.5"><animateMotion dur="1.1s" begin="0.55s" repeatCount="indefinite" path="' + d + '"/></circle>') : '<text x="' + x2 + '" y="' + (y2 - 4) + '" text-anchor="middle">✕</text>');
      });
      svg.innerHTML = inner; root.appendChild(svg);
    });
  }
  document.addEventListener('mouseover', function (e) { var sv = e.target.closest && e.target.closest('#lrDia .dia-svc'); if (sv) draw(sv); });
  document.addEventListener('focusin', function (e) { var sv = e.target.closest && e.target.closest('#lrDia .dia-svc'); if (sv) draw(sv); });
  document.addEventListener('mouseout', function (e) { if (e.target.closest && e.target.closest('#lrDia .dia-svc')) clearTrace(); });
  document.addEventListener('focusout', function (e) { if (e.target.closest && e.target.closest('#lrDia .dia-svc')) clearTrace(); });

  // ── ghost typing: click any command in the lab text ──
  var CMD = /^(kubectl|k|ssh|helm|systemctl|journalctl|etcdctl|crictl|kubeadm|echo|cat|curl)\s/;
  var ghostT = 0;
  function ghost(cmd) {
    var i = $('lrIn'); if (!i) return; clearInterval(ghostT); i.focus(); i.value = ''; var n = 0, fast = reduced();
    function put() { i.dispatchEvent(new Event('input', { bubbles: true })); }
    if (fast) { i.value = cmd; put(); return; }
    ghostT = setInterval(function () { n++; i.value = cmd.slice(0, n); put(); if (n >= cmd.length) { clearInterval(ghostT); ghostT = 0; i.classList.add('ghost-done'); setTimeout(function () { i.classList.remove('ghost-done'); }, 900); } }, 24);
  }
  KL.ghostType = ghost;
  document.addEventListener('keydown', function (e) { if (ghostT && e.target && e.target.id === 'lrIn' && e.key !== 'Enter') { clearInterval(ghostT); ghostT = 0; } }, true);
  document.addEventListener('click', function (e) {
    var c = e.target.closest && e.target.closest('#labRunner .lr-hint code, #labRunner .lr-story code, #labRunner .lr-task code, #labRunner .lr-tasks code'); if (!c || c.closest('pre')) return;
    var t = c.textContent.trim(); if (CMD.test(t + ' ')) ghost(t);
  });

  // ── typing token highlight under the terminal ──
  document.addEventListener('input', function (e) {
    if (!e.target || e.target.id !== 'lrIn') return; var box = $('lrTeach'); if (!box) return; var v = e.target.value; if (!v.trim()) return;
    var toks = v.split(/(\s+)/), last = -1; toks.forEach(function (t, i) { if (t.trim()) last = i; });
    var row = '<div class="lr-tok" aria-hidden="true">' + toks.map(function (t, i) { return t.trim() ? '<span class="' + (i === last ? 'cur' : '') + '">' + esc(t) + '</span>' : ' '; }).join('') + '</div>';
    box.hidden = false; box.innerHTML = row + box.innerHTML;
  });

  // ── motion toggle + tour button in runner bar ──
  function bar() {
    var b = document.querySelector('.lr-bar'); if (!b || $('lrMotion')) { applyMotion(); return; }
    var m = document.createElement('button'); m.type = 'button'; m.id = 'lrMotion'; m.className = 'btn-secondary'; m.title = 'Turn animations on or off'; m.onclick = function () { ls('kl.motion', reduced() ? 'on' : 'off'); applyMotion(); };
    var t = document.createElement('button'); t.type = 'button'; t.id = 'lrTourBtn'; t.className = 'btn-secondary'; t.textContent = '🧭 Tour'; t.title = 'Guided tour of this screen'; t.onclick = function () { tour('lab'); };
    var ref = $('lrTimer'); b.insertBefore(t, ref || null); b.insertBefore(m, ref || null); applyMotion();
  }

  // ── guided tour ──
  var TOURS = {
    lab: [
      ['.lr-story', 'The scenario', 'Read the story first. It tells you what is broken and what “done” looks like.'],
      ['#lrTasks', 'Tasks', 'Each task is checked automatically. Hints appear one at a time (Learn mode). Click any command in a hint and it types itself into the terminal.'],
      ['#lrTerm', 'Your terminal', 'A real-feeling kubectl terminal. It runs entirely in your browser, offline. Press Tab for completion; commands are explained as you type.'],
      ['#lrDia', 'Live cluster diagram', 'Pods appear, move and fail here as you change the cluster. Hover a Service to see traffic flow to its Ready pods; click a Pending pod to see why.'],
      ['.lr-mode', 'Learn, Exam or Real', 'Learn gives hints. Exam hides them and adds a timer. Real mimics the exam environment with no checker.'],
      ['#lrCheck', 'Check my work', 'Runs the checks against the cluster. A failing check tells you what is still wrong, not how to fix it.'],
      ['#lrDocsBtn', 'Docs peek', 'Related commands and kubernetes.io pages without leaving the lab.'],
      ['#lrReset', 'Reset lab', 'Rebuilds the broken environment if you get stuck or break it further.'],
      ['#lrSkinBox', 'Terminal skins', 'Pick a colour theme and text size. Saved in this browser.'],
      ['.lr-caution', 'Cautions', 'Every lab notes what is risky on a real cluster. Read it before copying commands into production.']
    ],
    home: [
      ['a[data-page="labs"]', 'Labs', 'Broken-cluster scenarios from beginner to expert, auto-checked, in your browser.'],
      ['a[data-page="exam"]', 'Exam', 'Timed mock exam bundles with domain-level scoring.'],
      ['a[data-page="quiz"]', 'Quiz', 'Short questions for concepts and commands.'],
      ['a[data-page="field"]', 'Field Guide', 'Stories, real outage write-ups, troubleshooting flowcharts and animated concepts.'],
      ['a[data-page="progress"]', 'Progress', 'Your streaks and completed labs. Stored only in this browser.']
    ]
  };
  var T = null;
  function endTour(done) { if (!T) return; T.nodes.forEach(function (n) { n.remove(); }); document.removeEventListener('keydown', T.key, true); window.removeEventListener('resize', T.rs); if (done) ls('kl.tour.' + T.name, '1'); T = null; }
  function tour(name) {
    endTour(); var steps = TOURS[name].filter(function (s) { return document.querySelector(s[0]); }); if (!steps.length) return;
    var hole = document.createElement('div'); hole.className = 'tour-hole'; var card = document.createElement('div'); card.className = 'tour-card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-live', 'polite');
    document.body.appendChild(hole); document.body.appendChild(card); T = { name: name, i: 0, nodes: [hole, card] };
    function show() {
      var s = steps[T.i], el = document.querySelector(s[0]); if (!el) { next(); return; } el.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
      setTimeout(function () {
        if (!T) return; var r = el.getBoundingClientRect(), pad = 6;
        hole.style.cssText = 'left:' + (r.left - pad) + 'px;top:' + (r.top - pad) + 'px;width:' + (r.width + pad * 2) + 'px;height:' + (r.height + pad * 2) + 'px';
        card.innerHTML = '<div class="tour-n">' + (T.i + 1) + ' / ' + steps.length + '</div><h4>' + esc(s[1]) + '</h4><p>' + esc(s[2]) + '</p><div class="tour-btns"><button type="button" class="btn-secondary" id="tourSkip">Skip</button><span></span>' + (T.i ? '<button type="button" class="btn-secondary" id="tourBack">← Back</button>' : '') + '<button type="button" class="btn-primary" id="tourNext">' + (T.i === steps.length - 1 ? 'Done' : 'Next →') + '</button></div>';
        var ch = card.offsetHeight, below = r.bottom + ch + 20 < window.innerHeight, top = below ? r.bottom + 14 : Math.max(10, r.top - ch - 14), left = Math.min(Math.max(10, r.left), window.innerWidth - card.offsetWidth - 10);
        card.style.top = top + 'px'; card.style.left = left + 'px';
        $('tourNext').onclick = next; $('tourSkip').onclick = function () { endTour(true); }; var bk = $('tourBack'); if (bk) bk.onclick = function () { T.i--; show(); }; $('tourNext').focus();
      }, reduced() ? 0 : 280);
    }
    function next() { if (T.i >= steps.length - 1) { endTour(true); return; } T.i++; show(); }
    T.key = function (e) { if (e.key === 'Escape') { endTour(true); e.stopPropagation(); } else if (e.key === 'ArrowRight') { next(); } else if (e.key === 'ArrowLeft' && T.i) { T.i--; show(); } };
    T.rs = function () { if (T) show(); }; document.addEventListener('keydown', T.key, true); window.addEventListener('resize', T.rs); show();
  }
  KL.tour = tour;
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-tour]'); if (b) tour(b.dataset.tour); });

  function decorate() {
    var lab = /^#lab\//.test(location.hash); if (!lab) { endTour(); return; } bar(); watch();
    if (!$('lrGhostTip') && $('lrTasks')) { var t = document.createElement('div'); t.id = 'lrGhostTip'; t.className = 'lr-ghosttip'; t.textContent = '💡 Click any command in a hint or the story and it types itself into the terminal. Press Enter to run it.'; $('lrTasks').parentNode.insertBefore(t, $('lrTasks')); }
    if (!ls('kl.tour.lab') && !navigator.webdriver && !T) setTimeout(function () { if (/^#lab\//.test(location.hash) && !ls('kl.tour.lab') && !T) tour('lab'); }, 1200);
  }
  KL.route('lab', function () { var r = $('lrDia'); if (r) r._anim = 0; setTimeout(decorate, 80); setTimeout(decorate, 400); });
  window.addEventListener('kl:page', function (e) { if (e.detail && e.detail.name !== 'lab') { endTour(); if (obs) { obs.disconnect(); obs = null; } prev = {}; } });
  // Field Guide button
  setInterval(function () { var h = $('fgTour'); if (h && !$('fgUiTour')) { var b = document.createElement('button'); b.className = 'btn-secondary'; b.id = 'fgUiTour'; b.dataset.tour = 'home'; b.textContent = '🧭 Guided UI tour'; h.parentNode.insertBefore(b, h.nextSibling); } }, 700);
  mq.addEventListener && mq.addEventListener('change', applyMotion);
})();
