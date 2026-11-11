/* Visualize page: step-through animations + shared effects (confetti, pop, scroll reveal). Respects prefers-reduced-motion. */
(function () {
  'use strict';
  var KL = window.KL = window.KL || {}, $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ───────── effects ─────────
  KL.fx = {
    confetti: function () {
      if (reduce) return; var c = $('confetti'); if (!c) return; var ctx = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight; c.style.display = 'block';
      var cols = ['#3b82f6', '#22d3a5', '#f59e0b', '#f87171', '#a78bfa'], ps = [], i;
      for (i = 0; i < 140; i++) ps.push({ x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 3, s: 4 + Math.random() * 5, c: cols[i % 5], r: Math.random() * 6, vr: (Math.random() - .5) * .4 });
      var n = 0; (function f() { ctx.clearRect(0, 0, c.width, c.height); ps.forEach(function (p) { p.vy += .35; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); ctx.restore(); }); if (++n < 110) requestAnimationFrame(f); else { ctx.clearRect(0, 0, c.width, c.height); c.style.display = 'none'; } })();
    },
    pop: function (el) { if (reduce || !el) return; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  };

  // ───────── generic player ─────────
  function Player(host, opts) {
    var self = this; this.i = 0; this.steps = []; this.timer = null; this.speed = 1;
    host.innerHTML = '<div class="an-stage" id="anStage"></div><div class="an-cap" id="anCap" aria-live="polite"></div>' +
      '<div class="an-ctl"><button class="btn-secondary" id="anPrev" aria-label="Previous step">◀</button><button class="btn-primary" id="anPlay">▶ Play</button><button class="btn-secondary" id="anNext" aria-label="Next step">▶|</button><button class="btn-secondary" id="anRst">↺</button><label class="an-speed">speed <select id="anSpd"><option value="1.6">0.6×</option><option value="1" selected>1×</option><option value="0.5">2×</option></select></label><span class="an-step" id="anStep"></span></div><div class="an-opts" id="anOpts"></div>';
    this.stage = $('anStage'); this.cap = $('anCap'); this.optsEl = $('anOpts');
    $('anPrev').onclick = function () { self.go(self.i - 1); }; $('anNext').onclick = function () { self.pause(); self.go(self.i + 1); }; $('anRst').onclick = function () { self.pause(); self.go(0); };
    $('anPlay').onclick = function () { if (self.timer) self.pause(); else self.play(); }; $('anSpd').onchange = function () { self.speed = +this.value; };
    this.opts = opts;
  }
  Player.prototype.load = function (steps, render) { this.pause(); this.steps = steps; this.render = render; this.i = 0; this.go(0); };
  Player.prototype.go = function (i) { if (i < 0) i = 0; if (i >= this.steps.length) { this.pause(); i = this.steps.length - 1; } this.i = i; var s = this.steps[i]; this.render(this.stage, s, i); this.cap.innerHTML = '<b>' + (i + 1) + '.</b> ' + s.cap; $('anStep').textContent = (i + 1) + ' / ' + this.steps.length; };
  Player.prototype.play = function () { var self = this; if (this.i >= this.steps.length - 1) this.go(0); $('anPlay').textContent = '⏸ Pause'; this.timer = setInterval(function () { self.go(self.i + 1); }, 1700 * this.speed); };
  Player.prototype.pause = function () { if (this.timer) clearInterval(this.timer); this.timer = null; var b = $('anPlay'); if (b) b.textContent = '▶ Play'; };

  // ───────── 1. control plane flow ─────────
  var CP = { actors: { kubectl: [8, 50, 'kubectl'], api: [32, 50, 'API Server'], etcd: [32, 14, 'etcd'], cm: [58, 14, 'Controller Mgr'], sch: [58, 86, 'Scheduler'], kub: [86, 50, 'kubelet + runtime'] },
    steps: [
      { a: ['kubectl'], cap: 'You run <code>kubectl apply -f deploy.yaml</code>. kubectl reads your kubeconfig and sends the manifest to the API server over TLS.' },
      { a: ['kubectl', 'api'], pkt: ['kubectl', 'api'], cap: 'The API server authenticates you, checks RBAC authorisation, runs admission controllers (defaults, quota, Pod Security) and validates the schema.' },
      { a: ['api', 'etcd'], pkt: ['api', 'etcd'], cap: 'The valid Deployment is persisted in etcd — the only place cluster state lives.' },
      { a: ['api', 'cm'], pkt: ['api', 'cm'], cap: 'The Deployment controller (in kube-controller-manager) watches the API, sees a new Deployment and creates a ReplicaSet; the ReplicaSet controller creates Pod objects.' },
      { a: ['cm', 'api'], pkt: ['cm', 'api'], cap: 'These new Pods have no <code>nodeName</code> yet — they are Pending.' },
      { a: ['api', 'sch'], pkt: ['api', 'sch'], cap: 'The scheduler watches for unscheduled pods, filters nodes (resources, taints, affinity) and scores the rest.' },
      { a: ['sch', 'api'], pkt: ['sch', 'api'], cap: 'It writes a <b>binding</b>: pod → node. Still nothing is running.' },
      { a: ['api', 'kub'], pkt: ['api', 'kub'], cap: 'The kubelet on that node watches for pods bound to it, pulls images via the CRI (containerd) and starts the containers.' },
      { a: ['kub', 'api'], pkt: ['kub', 'api'], cap: 'The kubelet reports status back: Running, then Ready once the readiness probe passes. <code>kubectl get pods</code> now shows it.' }
    ] };
  function renderCP(st, s) {
    var h = '<svg class="an-svg" viewBox="0 0 100 100" preserveAspectRatio="none">';
    [['kubectl', 'api'], ['api', 'etcd'], ['api', 'cm'], ['api', 'sch'], ['api', 'kub']].forEach(function (l) { var a = CP.actors[l[0]], b = CP.actors[l[1]], on = s.a.indexOf(l[0]) >= 0 && s.a.indexOf(l[1]) >= 0; h += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" class="' + (on ? 'on' : '') + '"/>'; });
    h += '</svg>';
    Object.keys(CP.actors).forEach(function (k) { var a = CP.actors[k]; h += '<div class="an-actor' + (s.a.indexOf(k) >= 0 ? ' on' : '') + '" style="left:' + a[0] + '%;top:' + a[1] + '%">' + a[2] + '</div>'; });
    if (s.pkt) { var f = CP.actors[s.pkt[0]], t = CP.actors[s.pkt[1]]; h += '<div class="an-pkt" id="anPkt" style="left:' + f[0] + '%;top:' + f[1] + '%"></div>'; st.innerHTML = h; var p = $('anPkt'); requestAnimationFrame(function () { requestAnimationFrame(function () { p.style.left = t[0] + '%'; p.style.top = t[1] + '%'; }); }); return; }
    st.innerHTML = h;
  }

  // ───────── 2. pod lifecycle ─────────
  var LIFE = { ok: ['Pending', 'ContainerCreating', 'Running', 'Ready', 'Terminating'], caps: {
    ok: ['Pod object created and stored; scheduler picks a node. Phase: <b>Pending</b>.', 'Kubelet pulls the image and sets up networking/volumes: <b>ContainerCreating</b>.', 'Container started — phase <b>Running</b> but not yet receiving traffic.', 'Readiness probe passes → added to Service endpoints: <b>Ready 1/1</b>.', 'Deleted: SIGTERM, grace period (30s), then SIGKILL → <b>Terminating</b>.'],
    img: ['Pod scheduled.', 'Kubelet tries to pull <code>nginx:1.255</code>…', 'Pull fails → <b>ErrImagePull</b>, then <b>ImagePullBackOff</b> with growing delay. Fix the tag/credentials.'],
    crash: ['Pod scheduled and started.', 'Container exits with an error (code 1).', 'Kubelet restarts it with exponential back-off → <b>CrashLoopBackOff</b>. Use <code>kubectl logs --previous</code>.'],
    oom: ['Pod scheduled and started.', 'Process allocates more than its memory limit.', 'Kernel kills it (exit 137) → <b>OOMKilled</b>, then CrashLoopBackOff. Raise the limit or fix the leak.'] },
    nodes: { ok: ['Pending', 'ContainerCreating', 'Running', 'Ready', 'Terminating'], img: ['Pending', 'ContainerCreating', 'ImagePullBackOff'], crash: ['Pending', 'Running', 'CrashLoopBackOff'], oom: ['Pending', 'Running', 'OOMKilled'] } };
  function lifeSteps(k) { return LIFE.nodes[k].map(function (n, i) { return { n: n, k: k, i: i, cap: LIFE.caps[k][i] }; }); }
  function renderLife(st, s) {
    var all = LIFE.nodes[s.k]; st.innerHTML = '<div class="an-flow">' + all.map(function (n, i) { return '<div class="an-node' + (i < s.i ? ' past' : '') + (i === s.i ? ' on' : '') + (/Back|OOM|Err/.test(n) ? ' bad' : '') + '">' + n + '</div>' + (i < all.length - 1 ? '<span class="an-arrow' + (i < s.i ? ' past' : '') + '">→</span>' : ''); }).join('') + '</div><div class="an-pod ' + (/Back|OOM/.test(all[s.i]) ? 'bad' : s.i >= 3 && s.k === 'ok' ? 'good' : '') + '">⬢ pod/web</div>';
  }

  // ───────── 3. rolling update ─────────
  var RU = { n: 4, surge: 1, unav: 1 };
  function ruSteps() {
    var n = RU.n, ms = RU.surge, mu = RU.unav, old = n, nw = 0, ready = n, steps = [{ o: old, w: 0, wr: 0, cap: 'Deployment <b>v1</b> runs ' + n + ' ready pods. You change the image to <b>v2</b>: a new ReplicaSet is created.' }], guard = 0;
    var newReady = 0, newTotal = 0;
    while ((old > 0 || newReady < n) && guard++ < 30) {
      var canAdd = Math.min(n - newTotal, n + ms - (old + newTotal)); if (canAdd > 0) { newTotal += canAdd; steps.push({ o: old, w: newTotal, wr: newReady, cap: 'maxSurge=' + ms + ' lets the controller start <b>' + canAdd + '</b> new pod' + (canAdd > 1 ? 's' : '') + ' (total allowed ' + (n + ms) + ').' }); }
      newReady = newTotal; steps.push({ o: old, w: newTotal, wr: newReady, cap: 'New pods pass their readiness probe and join the Service.' });
      var minAvail = n - mu, canKill = Math.min(old, Math.max(0, old + newReady - minAvail)); if (canKill > 0) { old -= canKill; steps.push({ o: old, w: newTotal, wr: newReady, cap: 'maxUnavailable=' + mu + ' lets it terminate <b>' + canKill + '</b> old pod' + (canKill > 1 ? 's' : '') + '.' }); }
      if (canAdd <= 0 && canKill <= 0) break;
    }
    steps.push({ o: 0, w: n, wr: n, cap: 'Done: ' + n + ' v2 pods ready. The old ReplicaSet is scaled to 0 but kept — <code>kubectl rollout undo</code> can bring it back.' }); return steps;
  }
  function renderRU(st, s) {
    function pods(c, ready, cls) { var h = ''; for (var i = 0; i < c; i++) h += '<span class="an-p ' + cls + (i < ready ? ' rdy' : '') + '"></span>'; return h; }
    st.innerHTML = '<div class="an-rs"><div class="an-rs-l">ReplicaSet v1 (old)</div><div class="an-rs-p">' + pods(s.o, s.o, 'old') + '</div></div><div class="an-rs"><div class="an-rs-l">ReplicaSet v2 (new)</div><div class="an-rs-p">' + pods(s.w, s.wr, 'new') + '</div></div><div class="an-svc">Service → ' + (s.o + s.wr) + ' ready endpoints</div>';
  }

  // ───────── 4. NetworkPolicy ─────────
  var NP = { on: false, from: 'frontend' };
  var NPA = { frontend: [14, 22, 'frontend\nrole=frontend'], intruder: [14, 78, 'intruder\nrole=other'], db: [78, 50, 'db :5432\napp=db'] };
  function npSteps() { var ok = !NP.on || NP.from === 'frontend'; return [{ cap: 'Pods in a namespace are <b>non-isolated</b> by default — any pod can reach any other.', st: 0 }, { cap: NP.on ? 'A NetworkPolicy selects <code>app=db</code> and allows ingress only from <code>role=frontend</code>. The CNI plugin enforces it.' : 'No NetworkPolicy exists. Toggle “Apply policy” below.', st: 1 }, { cap: '<b>' + NP.from + '</b> sends a request to <b>db</b>…', st: 2, send: true }, { cap: ok ? '✓ Allowed — the packet reaches db.' : '✗ Dropped — source does not match the policy. The client sees a timeout, not a refusal.', st: 3, send: true, res: ok }]; }
  function renderNP(st, s) {
    var h = '<svg class="an-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="14" y1="22" x2="78" y2="50"/><line x1="14" y1="78" x2="78" y2="50"/></svg>';
    Object.keys(NPA).forEach(function (k) { var a = NPA[k]; h += '<div class="an-actor' + (k === 'db' && NP.on ? ' shield' : '') + (s.send && k === NP.from ? ' on' : '') + '" style="left:' + a[0] + '%;top:' + a[1] + '%">' + esc(a[2]).replace('\n', '<br><small>') + '</small></div>'; });
    if (s.send) { var f = NPA[NP.from]; h += '<div class="an-pkt ' + (s.st === 3 ? (s.res ? 'ok' : 'bad') : '') + '" id="anPkt" style="left:' + f[0] + '%;top:' + f[1] + '%">' + (s.st === 3 && !s.res ? '✗' : '') + '</div>'; st.innerHTML = h; var p = $('anPkt'), to = s.st === 3 && !s.res ? [58, f[1] + (50 - f[1]) * .6] : [78, 50]; requestAnimationFrame(function () { requestAnimationFrame(function () { p.style.left = (s.st === 3 && !s.res ? 12 + (78 - 14) * .62 + 0 : to[0]) + '%'; p.style.top = (s.st === 3 && !s.res ? f[1] + (50 - f[1]) * .62 : to[1]) + '%'; }); }); return; }
    st.innerHTML = h;
  }

  // ───────── page ─────────
  var TABS = [['cp', '🧭 Control-plane flow'], ['life', '♻️ Pod lifecycle'], ['ru', '🔄 Rolling update'], ['np', '🛡️ NetworkPolicy']], player, tab = 'cp';
  function opts(html) { $('anOpts').innerHTML = html; }
  function show(t) {
    tab = t; document.querySelectorAll('.an-tab').forEach(function (b) { b.classList.toggle('active', b.dataset.t === t); b.setAttribute('aria-selected', b.dataset.t === t); });
    if (t === 'cp') { player.load(CP.steps, renderCP); opts(''); }
    else if (t === 'life') { opts('<label>Scenario <select id="lifeSel"><option value="ok">Healthy start</option><option value="img">Bad image tag</option><option value="crash">App crashes</option><option value="oom">Out of memory</option></select></label>'); $('lifeSel').onchange = function () { player.load(lifeSteps(this.value), renderLife); }; player.load(lifeSteps('ok'), renderLife); }
    else if (t === 'ru') { opts('<label>Replicas <input type="range" id="ruN" min="2" max="8" value="' + RU.n + '"> <b id="ruNv">' + RU.n + '</b></label><label>maxSurge <input type="range" id="ruS" min="0" max="3" value="' + RU.surge + '"> <b id="ruSv">' + RU.surge + '</b></label><label>maxUnavailable <input type="range" id="ruU" min="0" max="3" value="' + RU.unav + '"> <b id="ruUv">' + RU.unav + '</b></label><span class="an-warn" id="ruWarn"></span>'); var upd = function () { RU.n = +$('ruN').value; RU.surge = +$('ruS').value; RU.unav = +$('ruU').value; $('ruNv').textContent = RU.n; $('ruSv').textContent = RU.surge; $('ruUv').textContent = RU.unav; $('ruWarn').textContent = RU.surge === 0 && RU.unav === 0 ? '⚠ both 0 is invalid — the rollout could never progress' : ''; if (RU.surge || RU.unav) player.load(ruSteps(), renderRU); }; ['ruN', 'ruS', 'ruU'].forEach(function (id) { $(id).oninput = upd; }); player.load(ruSteps(), renderRU); }
    else { opts('<label><input type="checkbox" id="npOn"> Apply policy</label><label>Source <select id="npFrom"><option value="frontend">frontend (allowed)</option><option value="intruder">intruder</option></select></label>'); var u = function () { NP.on = $('npOn').checked; NP.from = $('npFrom').value; player.load(npSteps(), renderNP); }; $('npOn').onchange = u; $('npFrom').onchange = u; NP.on = false; NP.from = 'frontend'; player.load(npSteps(), renderNP); }
  }
  function renderPage() {
    var root = $('vizRoot'); if (!root || root.dataset.ready) return; root.dataset.ready = 1;
    root.innerHTML = '<div class="section-header"><div class="section-tag">Visual Learning</div><h2 class="section-title">See how Kubernetes works</h2><p class="section-desc">Step through the four flows every exam asks about. Play, pause, or go step by step.</p></div><div class="an-tabs" role="tablist">' + TABS.map(function (t) { return '<button class="an-tab" role="tab" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div><div id="anHost" class="an-host"></div>';
    player = new Player($('anHost')); root.querySelectorAll('.an-tab').forEach(function (b) { b.onclick = function () { show(b.dataset.t); }; }); show('cp');
  }
  KL.route('visualize', renderPage);
  window.addEventListener('kl:page', function (e) { if (e.detail.name !== 'visualize' && player) player.pause(); });
  // scroll reveal
  function reveal() {
    if (reduce || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: .12 });
    document.querySelectorAll('.stat, .tool-card, .module-card, .feature-card, .home-card').forEach(function (el) { el.classList.add('rv'); io.observe(el); });
  }
  if (document.readyState !== 'loading') reveal(); else document.addEventListener('DOMContentLoaded', reveal);
})();
