/* Lessons: one lesson shape for every module (why, mental model, anatomy, do it, break it, check, remember, in production),
   plus teaching widgets (steps, rollout calculator, QoS, matrix, decision tree, runbook, what-breaks), glossary tooltips and local progress. Offline. */
(function () {
  'use strict';
  var KL = window.KL = window.KL || {}; KL.lessons = KL.lessons || [];
  KL.lessons = KL.lessons.map(function (l, i) { return [l, i]; }).sort(function (a, b) { return a[0].mod < b[0].mod ? -1 : a[0].mod > b[0].mod ? 1 : a[1] - b[1]; }).map(function (x) { return x[0]; });
  function $(i) { return document.getElementById(i); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* blocked */ } return null; }
  function motionOn() { return document.documentElement.getAttribute('data-motion') !== 'off'; }
  function mods() { return typeof MODULES !== 'undefined' ? MODULES : []; }
  function modOf(n) { return mods().filter(function (m) { return m.num === n; })[0] || { num: n, title: 'Module ' + n, icon: '' }; }
  function byId(id) { return KL.lessons.filter(function (l) { return l.id === id; })[0]; }
  function done() { try { return JSON.parse(ls('kl.lessons') || '{}') || {}; } catch (e) { return {}; } }
  function markDone(id) { var d = done(); d[id] = Date.now(); ls('kl.lessons', JSON.stringify(d)); try { KL.store.touchDay(); } catch (e) { /* ignore */ } }

  // ───────── glossary (hover tooltips) ─────────
  KL.glossary = {
    'control plane': 'The components that decide what should run: API server, etcd, scheduler and controller manager.',
    'API server': 'The front door of the cluster. Every kubectl command and every component talks to it.',
    'etcd': 'The key-value database that stores all cluster state. Lose it without a backup and you lose the cluster.',
    'scheduler': 'Picks a node for each new pod based on resources, taints and affinity.',
    'kubelet': 'The agent on each node that starts the containers a pod asks for and reports their health.',
    'kube-proxy': 'Programs each node so traffic sent to a Service reaches one of its pods.',
    'controller': 'A loop that compares desired state with actual state and acts to close the gap.',
    'reconcile': 'To compare what you asked for with what exists, then change reality to match.',
    'pod': 'The smallest thing Kubernetes runs: one or more containers sharing a network and storage.',
    'ReplicaSet': 'Keeps a set number of identical pods running. Deployments create and manage them.',
    'Deployment': 'Manages ReplicaSets so you can roll out and roll back versions of a stateless app.',
    'StatefulSet': 'Like a Deployment but pods keep a stable name, order and their own storage.',
    'DaemonSet': 'Runs one copy of a pod on every (or selected) node, such as a log shipper.',
    'maxSurge': 'How many extra pods a rollout may create above the desired count.',
    'maxUnavailable': 'How many pods may be missing during a rollout.',
    'readiness probe': 'A check that decides whether a pod may receive traffic.',
    'liveness probe': 'A check that restarts a container when it stops responding.',
    'Service': 'A stable name and virtual IP that sends traffic to a changing set of pods.',
    'endpoints': 'The list of ready pod IPs behind a Service. No endpoints means no traffic.',
    'ClusterIP': 'A Service type reachable only inside the cluster.',
    'NetworkPolicy': 'Firewall rules for pods. Without any, all pods can talk to all pods.',
    'CoreDNS': 'The cluster DNS server that turns service names into IPs.',
    'PersistentVolume': 'A piece of storage in the cluster, provisioned by an admin or dynamically.',
    'PersistentVolumeClaim': 'A pod-side request for storage that binds to a matching PersistentVolume.',
    'StorageClass': 'A recipe that tells the cluster how to create storage on demand.',
    'ConfigMap': 'Non-secret configuration stored as keys and values.',
    'Secret': 'Sensitive data stored as base64. Encoded, not encrypted, unless you enable encryption at rest.',
    'requests': 'What a container is guaranteed. The scheduler uses it to place the pod.',
    'limits': 'The most a container may use. CPU is throttled; memory over the limit gets the container killed.',
    'QoS class': 'Guaranteed, Burstable or BestEffort. It decides who is evicted first when a node runs out of memory.',
    'taint': 'A mark on a node that repels pods unless they tolerate it.',
    'toleration': 'A pod setting that lets it be placed on a node with a matching taint.',
    'affinity': 'Rules that attract a pod to certain nodes or to sit near (or away from) other pods.',
    'RBAC': 'Role-based access control: who may do which verb on which resource.',
    'Role': 'A set of permissions inside one namespace.',
    'ClusterRole': 'A set of permissions cluster-wide, or reusable across namespaces.',
    'ServiceAccount': 'An identity for a pod when it talks to the API server.',
    'namespace': 'A named slice of the cluster for grouping and limiting resources.',
    'CRD': 'CustomResourceDefinition: teaches the API server a new resource type.',
    'operator': 'A controller that manages a complex app using its own custom resources.',
    'Helm chart': 'A package of templated Kubernetes manifests with configurable values.',
    'Kustomize': 'Customizes plain YAML with overlays and patches, no templates.',
    'GitOps': 'Git is the source of truth; a controller makes the cluster match it.',
    'admission controller': 'Code that can validate or change a request after authentication and before it is stored.'
  };
  KL.glossaryTerms = Object.keys(KL.glossary).sort(function (a, b) { return b.length - a.length; });
  function rich(s) {
    s = esc(s); var tok = [];
    s = s.replace(/`([^`]+)`/g, function (_, c) { tok.push('<code>' + c + '</code>'); return '\u0001' + (tok.length - 1) + '\u0001'; });
    var used = {};
    KL.glossaryTerms.forEach(function (t) {
      var re = new RegExp('(^|[^\\w-])(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![\\w-])', 'i');
      s = s.replace(re, function (m, pre, w) { if (used[t]) return m; used[t] = 1; tok.push('<abbr class="gl" tabindex="0" data-d="' + esc(KL.glossary[t]) + '">' + w + '</abbr>'); return pre + '\u0001' + (tok.length - 1) + '\u0001'; });
    });
    return s.replace(/\u0001(\d+)\u0001/g, function (_, i) { return tok[+i]; });
  }
  KL.rich = rich;

  // ───────── widgets ─────────
  var W = {};
  W.steps = function (w, host) {
    host.innerHTML = '<div class="wg wg-steps"><b>' + esc(w.title || 'Step through it') + '</b><div class="rail" role="tablist"></div><div class="card" aria-live="polite"></div><button type="button" class="btn-secondary" style="margin-top:8px">▶ Play</button></div>';
    var rail = host.querySelector('.rail'), card = host.querySelector('.card'), play = host.querySelector('button.btn-secondary'), cur = 0, timer = 0;
    w.steps.forEach(function (s, i) { var b = document.createElement('button'); b.type = 'button'; b.textContent = i + 1; b.setAttribute('aria-label', 'Step ' + (i + 1) + ': ' + s.t); b.onclick = function () { stop(); show(i); }; rail.appendChild(b); });
    function show(i) { cur = i; [].forEach.call(rail.children, function (b, j) { b.className = j === i ? 'on' : j < i ? 'past' : ''; }); card.className = 'card re'; card.innerHTML = '<b>' + (i + 1) + '. ' + rich(w.steps[i].t) + '</b><span>' + rich(w.steps[i].d) + '</span>'; void card.offsetWidth; }
    function stop() { clearInterval(timer); timer = 0; play.textContent = '▶ Play'; }
    play.onclick = function () { if (timer) return stop(); play.textContent = '❚❚ Pause'; if (cur >= w.steps.length - 1) show(0); timer = setInterval(function () { if (cur >= w.steps.length - 1) return stop(); show(cur + 1); }, motionOn() ? 2200 : 900); };
    show(0);
  };
  W.rollout = function (w, host) {
    host.innerHTML = '<div class="wg"><b>Rollout calculator</b><div class="wg-calc"><label>Replicas<input id="roR" type="number" min="1" max="30" value="6"></label><label>maxSurge<input id="roS" value="25%"></label><label>maxUnavailable<input id="roU" value="25%"></label></div><div class="ls-pred" id="roP"></div><div id="roOut"></div></div>';
    var presets = [['6 pods, 25% / 25%', 6, '25%', '25%'], ['4 pods, 1 / 0 (never below 4)', 4, '1', '0'], ['10 pods, 0 / 1 (no extra capacity)', 10, '0', '1'], ['3 pods, 0 / 0 (stalls)', 3, '0', '0']];
    $('roP').innerHTML = presets.map(function (p, i) { return '<button type="button" data-i="' + i + '">' + esc(p[0]) + '</button>'; }).join('');
    function num(v, R, up) { v = String(v).trim(); if (/%$/.test(v)) { var x = parseFloat(v) / 100 * R; return up ? Math.ceil(x) : Math.floor(x); } return Math.max(0, parseInt(v, 10) || 0); }
    function calc() {
      var R = Math.max(1, Math.min(30, parseInt($('roR').value, 10) || 1)), S = num($('roS').value, R, true), U = num($('roU').value, R, false), out = $('roOut');
      if (S === 0 && U === 0) { out.innerHTML = '<p class="ls-note"><b>Stall:</b> with maxSurge 0 and maxUnavailable 0 the controller may neither add a pod nor remove one, so the rollout can never start. Kubernetes rejects this combination.</p>'; return; }
      var minAvail = R - U, maxTotal = R + S, old = R, nw = 0, ready = 0, rows = [], g = 0;
      while ((nw < R || old > 0) && g++ < 60) {
        ready = nw; var d = Math.min(old, Math.max(0, old + ready - minAvail)); old -= d; var c = Math.min(R - nw, Math.max(0, maxTotal - (old + nw))); nw += c; rows.push({ old: old, nw: nw, ready: ready, d: d, c: c }); if (!d && !c && old > 0 && nw < R) break;
      }
      out.innerHTML = '<p class="ls-note">At least <b>' + minAvail + '</b> pods must stay available and at most <b>' + maxTotal + '</b> may exist. Each row is one round (new pods take a moment to become ready).</p>' + rows.map(function (r, i) { return '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="ls-note" style="width:60px">Round ' + (i + 1) + '</span><div class="wg-pods">' + new Array(r.old + 1).join('<i class="old" title="old"></i>') + new Array(r.nw + 1).join('<i class="new" title="new"></i>') + '</div><span class="ls-note">−' + r.d + ' old, +' + r.c + ' new</span></div>'; }).join('');
    }
    host.querySelectorAll('input').forEach(function (i) { i.oninput = calc; });
    $('roP').onclick = function (e) { var b = e.target.closest('button'); if (!b) return; var p = presets[+b.dataset.i]; $('roR').value = p[1]; $('roS').value = p[2]; $('roU').value = p[3]; calc(); };
    calc();
  };
  W.qos = function (w, host) {
    host.innerHTML = '<div class="wg"><b>QoS class checker</b><p class="ls-note">One-container pod. Leave a box empty for "not set".</p><div class="wg-calc"><label>CPU request<input id="qCR" placeholder="e.g. 250m"></label><label>CPU limit<input id="qCL" placeholder="e.g. 250m"></label><label>Memory request<input id="qMR" placeholder="e.g. 256Mi"></label><label>Memory limit<input id="qML" placeholder="e.g. 256Mi"></label></div><div id="qOut" class="ls-note"></div></div>';
    function go() { var v = ['qCR', 'qCL', 'qMR', 'qML'].map(function (i) { return $(i).value.trim(); }), any = v.some(Boolean), cls, why;
      if (!any) { cls = 'BestEffort'; why = 'Nothing is set. First to be evicted when the node runs short of memory.'; }
      else if (v[0] && v[1] && v[2] && v[3] && v[0] === v[1] && v[2] === v[3]) { cls = 'Guaranteed'; why = 'CPU and memory requests equal limits. Last to be evicted.'; }
      else if (v[1] && v[3] && !v[0] && !v[2]) { cls = 'Guaranteed'; why = 'Only limits set: Kubernetes copies them into requests, so they are equal. Last to be evicted.'; }
      else { cls = 'Burstable'; why = 'Some requests or limits are set, but they are not equal for both CPU and memory. Evicted after BestEffort, before Guaranteed.'; }
      $('qOut').innerHTML = '<b style="font-size:16px;color:' + (cls === 'Guaranteed' ? 'var(--green)' : cls === 'Burstable' ? 'var(--warn)' : '#f87171') + '">' + cls + '</b> — ' + esc(why); }
    host.querySelectorAll('input').forEach(function (i) { i.oninput = go; }); go();
  };
  W.matrix = function (w, host) {
    host.innerHTML = '<div class="wg"><b>' + esc(w.title || '') + '</b><div style="overflow:auto"><table class="wg-t"><thead><tr>' + w.head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + w.rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return i === 0 ? '<td><b>' + esc(c) + '</b></td>' : '<td class="' + (c === 1 ? 'y' : c === 0 ? 'n' : '') + '">' + (c === 1 ? '✓' : c === 0 ? '–' : esc(c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' + (w.note ? '<p class="ls-note">' + rich(w.note) + '</p>' : '') + '</div>';
    host.querySelectorAll('tbody tr').forEach(function (tr) { tr.onmouseenter = function () { tr.classList.add('hl'); }; tr.onmouseleave = function () { tr.classList.remove('hl'); }; });
  };
  W.tree = function (w, host) {
    var hist = [];
    function show(k) { var n = w.nodes[k]; if (!n) return; var h = '<div class="wg wg-tree"><b>' + esc(w.title || 'Which one should I use?') + '</b>';
      if (n.leaf) h += '<div class="leaf">' + rich(n.leaf) + '</div>'; else h += '<div class="q">' + rich(n.q) + '</div><div class="o">' + n.o.map(function (o) { return '<button type="button" data-k="' + o[1] + '">' + esc(o[0]) + '</button>'; }).join('') + '</div>';
      if (hist.length) h += '<button type="button" class="back">← Back</button>'; host.innerHTML = h + '</div>';
      host.querySelectorAll('.o button').forEach(function (b) { b.onclick = function () { hist.push(k); show(b.dataset.k); }; }); var bk = host.querySelector('.back'); if (bk) bk.onclick = function () { show(hist.pop()); }; }
    show(w.start || Object.keys(w.nodes)[0]);
  };
  W.runbook = function (w, host, lesson) {
    var key = 'kl.rb.' + lesson.id, st; try { st = JSON.parse(ls(key) || '[]'); } catch (e) { st = []; }
    function paint() { var n = st.filter(Boolean).length; host.innerHTML = '<div class="wg wg-run"><b>' + esc(w.title || 'Runbook') + '</b><div class="bar"><i style="width:' + Math.round(100 * n / w.steps.length) + '%"></i></div>' + w.steps.map(function (s, i) { return '<label class="' + (st[i] ? 'done' : '') + '"><input type="checkbox" data-i="' + i + '"' + (st[i] ? ' checked' : '') + '><span>' + rich(s) + '</span></label>'; }).join('') + '<p class="ls-note">' + n + ' of ' + w.steps.length + ' done. Practice only: on a real cluster, never skip the backup step.</p></div>';
      host.querySelectorAll('input').forEach(function (c) { c.onchange = function () { st[+c.dataset.i] = c.checked; ls(key, JSON.stringify(st)); paint(); }; }); }
    paint();
  };
  W.select = function (w, host) {
    host.innerHTML = '<div class="wg wg-sel"><b>' + esc(w.title || 'What happens if...') + '</b><p><select aria-label="Choose">' + w.options.map(function (o, i) { return '<option value="' + i + '">' + esc(o.k) + '</option>'; }).join('') + '</select></p><div class="res"></div></div>';
    var s = host.querySelector('select'), r = host.querySelector('.res'); function go() { r.innerHTML = rich(w.options[+s.value].r); } s.onchange = go; go();
  };

  // ───────── lesson page ─────────
  var sim = null, cur = null;
  function labById(id) { return KL.Labs && KL.Labs.list.filter(function (l) { return l.id === id; })[0]; }
  function newSandbox(l) { var s = new KL.Sim(); if (l.setup && /^lab:/.test(l.setup)) { var lab = labById(l.setup.slice(4)); if (lab) KL.Labs.setup(s, lab); } return s; }
  function sec(title, inner, cls) { return '<section class="ls-sec ' + (cls || '') + '"><h3>' + esc(title) + '</h3>' + inner + '</section>'; }
  function yamlBlock(a) {
    var fields = a.fields || {}, keys = Object.keys(fields);
    var lines = a.yaml.split('\n').map(function (ln, i) { var hit = keys.filter(function (k) { return ln.indexOf(k.split('.').pop() + ':') >= 0 && (fields[k] && true); })[0]; return '<span class="ln' + (hit ? ' f' : '') + '"' + (hit ? ' tabindex="0" data-k="' + esc(hit) + '"' : '') + '>' + (esc(ln) || ' ') + '</span>'; }).join('');
    return '<pre class="ls-yaml" id="lsYaml">' + lines + '</pre><div class="ls-tip" id="lsTip">Hover or focus a highlighted line to see what the field does.</div>';
  }
  function render(rest) {
    var root = $('learnRoot'); if (!root) return; var id = String(rest || '').split('/')[0], l = id ? byId(id) : null; cur = l; sim = null;
    var d = done(), all = KL.lessons, nDone = all.filter(function (x) { return d[x.id]; }).length;
    var head = '<div class="section-header"><div class="section-tag">Lessons</div><h2 class="section-title">' + (l ? esc(l.title) : 'Learn it properly') + '</h2><p class="section-desc">' + (l ? '' : all.length + ' short lessons across ' + groups().length + ' modules. Each one: why it exists, a mental model, the YAML, commands you can run, a lab to break it, and a quick check. ' + nDone + ' of ' + all.length + ' done.') + '</p></div>';
    if (!l) { root.innerHTML = head + '<div class="ls-idx">' + groups().map(function (g) { return '<div class="u3-card"><h4>' + esc(g.m.icon || '') + ' ' + esc(g.m.num + ' · ' + g.m.title) + '</h4>' + g.ls.map(function (x) { return '<a class="row' + (d[x.id] ? ' done' : '') + '" href="#learn/' + x.id + '"><span>' + esc(x.title) + '</span><span>' + x.mins + ' min</span></a>'; }).join('') + '</div>'; }).join('') + '</div>'; return; }
    var idx = all.indexOf(l), prev = all[idx - 1], next = all[idx + 1], m = modOf(l.mod);
    var side = '<div class="ls-side" role="navigation" aria-label="Lessons">' + groups().map(function (g) { return '<h5>' + esc(g.m.num + ' ' + g.m.title) + '</h5>' + g.ls.map(function (x) { return '<a href="#learn/' + x.id + '" class="' + (x.id === l.id ? 'on ' : '') + (d[x.id] ? 'done' : '') + '"><i class="d"></i>' + esc(x.title) + '</a>'; }).join(''); }).join('') + '</div>';
    var chips = '<div class="ls-chips"><span class="ls-chip">' + esc(m.icon || '') + ' ' + esc(m.title) + '</span><span class="ls-chip">' + l.mins + ' min</span><span class="ls-chip">' + esc(l.level || m.level || '') + '</span>' + (l.prereq || []).map(function (p) { var q = byId(p); return q ? '<a class="ls-chip pre" href="#learn/' + p + '">Read first: ' + esc(q.title) + '</a>' : ''; }).join('') + (l.exam || []).map(function (x) { return '<span class="ls-chip ex">' + esc(x) + '</span>'; }).join('') + '</div>';
    var h = chips;
    h += sec('Why it exists', '<p>' + rich(l.why) + '</p>');
    var mm = '<p>' + rich(l.model.analogy) + '</p>'; h += sec('Mental model', mm + '<div id="lsW1"></div>');
    if (l.anatomy) h += sec('Anatomy', '<p class="ls-note">' + rich(l.anatomy.intro || '') + '</p>' + yamlBlock(l.anatomy));
    if (l.widget && l.widget.type !== 'steps') h += sec('Try it', '<div id="lsW2"></div>');
    if (l.doit) h += sec('Do it', '<p class="ls-note">Real simulator commands. ' + (l.setup && /^lab:/.test(l.setup) ? 'This sandbox starts from a broken lab.' : 'Run them in order; each one builds on the last.') + '</p><div id="lsDo">' + l.doit.map(function (s, i) { return '<div class="ls-step" data-i="' + i + '"><code>$ ' + esc(s.cmd) + '</code><button type="button" class="btn-secondary" data-i="' + i + '">Run</button></div>' + (s.predict ? '<div class="ls-pred" data-i="' + i + '">' + s.predict.map(function (o, j) { return '<button type="button" data-j="' + j + '">' + esc(o) + '</button>'; }).join('') + '</div>' : '') + '<div class="ls-out" id="lsO' + i + '" hidden></div><p class="ls-note" id="lsN' + i + '" hidden>' + rich(s.note || '') + '</p>'; }).join('') + '</div><button type="button" class="btn-secondary" id="lsAll" style="margin-top:8px">Run all</button>');
    if (l.misc) h += sec('Common myths', l.misc.map(function (x) { return '<div class="ls-myth"><div class="m">' + rich(x[0]) + '</div><div class="t">' + rich(x[1]) + '</div></div>'; }).join(''));
    if (l.bug) h += sec('Spot the bug', '<p class="ls-note">' + rich(l.bug.intro || 'One line here is wrong. Click it.') + '</p><pre class="ls-yaml" id="lsBug">' + l.bug.yaml.split('\n').map(function (ln, i) { return '<span class="ln f" tabindex="0" data-n="' + (i + 1) + '">' + (esc(ln) || ' ') + '</span>'; }).join('') + '</pre><div class="ls-tip" id="lsBugTip">Click the line you think is wrong.</div>');
    if (l.whyNot) h += sec('Why not ' + l.whyNot.alt + '?', '<p>' + rich(l.whyNot.body) + '</p>');
    if (l.explain) h += sec('kubectl explain drill', '<p>' + rich(l.explain.task) + '</p><p><button type="button" class="btn-secondary" id="lsExp">Show the command and run it</button></p><div class="ls-out" id="lsExpO" hidden></div>');
    if (l.breakit && l.breakit.length) h += sec('Break it', '<p>Now see it fail on purpose, then fix it yourself.</p>' + l.breakit.map(function (b) { var lab = labById(b); return lab ? '<p><a class="btn-secondary" href="#lab/' + lab.id + '">Open lab ' + esc(lab.num + ': ' + lab.title) + '</a></p>' : ''; }).join(''));
    if (l.check) h += sec('Check yourself', l.check.map(function (q, i) { return '<div class="ls-q" data-i="' + i + '"><b>' + rich(q.q) + '</b><div class="o">' + q.o.map(function (o, j) { return '<button type="button" data-j="' + j + '">' + rich(o) + '</button>'; }).join('') + '</div><div class="w" hidden></div></div>'; }).join(''));
    if (l.teach) h += sec('Teach it back', '<p>' + rich(l.teach.prompt) + '</p><div class="ls-teach"><textarea id="lsTeach" aria-label="Your explanation" placeholder="Write it in your own words. Saved on this device only."></textarea></div><p><button type="button" class="btn-secondary" id="lsModel">Show a model answer</button></p><div class="ls-model" id="lsModelT" hidden>' + rich(l.teach.model) + '</div>');
    h += '<section class="ls-sec"><div class="ls-keep"><div class="k"><b>Remember</b>' + rich(l.remember) + '</div><div class="t"><b>Exam trap</b>' + rich(l.trap) + '</div></div></section>';
    h += sec('In production', '<div class="ls-prod">' + rich(l.prod) + '</div>');
    h += '<div class="ls-nav"><div>' + (prev ? '<a class="btn-secondary" href="#learn/' + prev.id + '">← ' + esc(prev.title) + '</a>' : '') + '</div><div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" class="btn-primary" id="lsDone">' + (d[l.id] ? '✓ Done' : 'Mark as done') + '</button>' + (next ? '<a class="btn-secondary" href="#learn/' + next.id + '">' + esc(next.title) + ' →</a>' : '') + '</div></div>';
    h += '<div class="ls-foot"><span>Written for Kubernetes v' + esc(l.ver || '1.34') + '</span>' + (l.docs || []).map(function (x) { return '<a href="' + esc(x[1]) + '" target="_blank" rel="noopener">' + esc(x[0]) + '</a>'; }).join('') + '</div>';
    root.innerHTML = head + '<div class="ls-wrap">' + side + '<div class="ls-main">' + h + '</div></div>';
    wire(l);
  }
  function groups() { var g = {}, out = []; KL.lessons.forEach(function (x) { if (!g[x.mod]) { g[x.mod] = { m: modOf(x.mod), ls: [] }; out.push(g[x.mod]); } g[x.mod].ls.push(x); }); return out.sort(function (a, b) { return a.m.num < b.m.num ? -1 : 1; }); }
  function wire(l) {
    var w = l.model.widget || l.widget; if (w && W[w.type]) W[w.type](w, $(w.type === 'steps' || l.model.widget ? 'lsW1' : 'lsW2') || $('lsW1'), l);
    if (l.widget && l.widget.type === 'steps' && !l.model.widget) { /* rendered in mental model */ }
    var yl = $('lsYaml'); if (yl) { var tip = $('lsTip'), f = l.anatomy.fields; yl.querySelectorAll('.ln.f').forEach(function (s) { function on() { tip.innerHTML = '<b>' + esc(s.dataset.k) + '</b>: ' + rich(f[s.dataset.k]); } s.onmouseenter = on; s.onfocus = on; }); }
    var bug = $('lsBug'); if (bug) bug.onclick = function (e) { var s = e.target.closest('.ln'); if (!s) return; var ok = +s.dataset.n === l.bug.line; $('lsBugTip').innerHTML = (ok ? '<b style="color:var(--green)">Found it.</b> ' : '<b style="color:#f87171">Not that line.</b> ') + (ok ? rich(l.bug.why) : 'Read each field again and ask what it does.'); if (ok) s.style.background = 'rgba(34,197,94,.18)'; };
    function sb() { if (!sim) sim = newSandbox(l); return sim; }
    function runStep(i) { var s = l.doit[i], o = $('lsO' + i), n = $('lsN' + i), r; try { r = sb().exec(s.cmd); sb().settle(3); } catch (e) { r = { stdout: '', stderr: e.message }; } o.hidden = false; o.textContent = ((r.stdout || '') + (r.stderr || '')).replace(/\n+$/, '') || '(no output)'; if (n && s.note) n.hidden = false; var p = document.querySelector('.ls-pred[data-i="' + i + '"]'); if (p && p.dataset.pick !== undefined) { var ok = +p.dataset.pick === s.answer; p.insertAdjacentHTML('afterend', '<p class="ls-note">' + (ok ? 'Your prediction was right.' : 'Not quite. The output above is what happened.') + '</p>'); p.remove(); } }
    if ($('lsDo')) { $('lsDo').onclick = function (e) { var b = e.target.closest('button'); if (!b) return; if (b.closest('.ls-pred')) { var p = b.closest('.ls-pred'); p.dataset.pick = b.dataset.j; p.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); return; } if (b.dataset.i !== undefined && b.classList.contains('btn-secondary')) runStep(+b.dataset.i); }; $('lsAll').onclick = function () { l.doit.forEach(function (s, i) { runStep(i); }); }; }
    if ($('lsExp')) $('lsExp').onclick = function () { var o = $('lsExpO'), r; try { r = sb().exec(l.explain.cmd); } catch (e) { r = { stdout: e.message }; } o.hidden = false; o.textContent = '$ ' + l.explain.cmd + '\n' + ((r.stdout || '') + (r.stderr || '')).replace(/\n+$/, ''); };
    var correct = {}; document.querySelectorAll('.ls-q').forEach(function (qe) { qe.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; var q = l.check[+qe.dataset.i], j = +b.dataset.j, ok = j === q.a; qe.querySelectorAll('button').forEach(function (x) { x.classList.remove('ok', 'no'); }); b.classList.add(ok ? 'ok' : 'no'); var wv = qe.querySelector('.w'); wv.hidden = false; wv.innerHTML = (ok ? '<b style="color:var(--green)">Right.</b> ' : '<b style="color:#f87171">Not quite.</b> ') + rich(q.w); if (ok) { correct[qe.dataset.i] = 1; if (Object.keys(correct).length === l.check.length) { markDone(l.id); var db = $('lsDone'); if (db) db.textContent = '✓ Done'; } } }; });
    var t = $('lsTeach'); if (t) { t.value = ls('kl.teach.' + l.id) || ''; t.oninput = function () { ls('kl.teach.' + l.id, t.value); }; $('lsModel').onclick = function () { $('lsModelT').hidden = false; }; }
    $('lsDone').onclick = function () { markDone(l.id); this.textContent = '✓ Done'; document.querySelectorAll('.ls-side a.on').forEach(function (a) { a.classList.add('done'); }); };
  }
  KL.route('learn', render);

  // ───────── module modal: list the lessons ─────────
  function patchModal() {
    if (typeof window.openModule !== 'function' || window.openModule._ls) return; var o = window.openModule;
    window.openModule = function (i) {
      o.apply(this, arguments); var m = mods()[i], body = document.querySelector('#modalContent .modal-body'); if (!m || !body) return; var ls2 = KL.lessons.filter(function (x) { return x.mod === m.num; }); if (!ls2.length) return; var d = done();
      body.insertAdjacentHTML('afterbegin', '<div class="modal-section mod-lessons"><h3>Lessons (' + ls2.filter(function (x) { return d[x.id]; }).length + '/' + ls2.length + ' done)</h3>' + ls2.map(function (x) { return '<a href="#learn/' + x.id + '" onclick="closeModal()"><span>' + (d[x.id] ? '✓ ' : '') + esc(x.title) + '</span><span>' + x.mins + ' min</span></a>'; }).join('') + '</div>');
    }; window.openModule._ls = 1;
  }
  patchModal(); document.addEventListener('DOMContentLoaded', patchModal);
  if (KL.palExtra) { KL.palExtra.push({ k: 'PAGE', t: 'Lessons', go: function () { location.hash = '#learn'; } }); }
  KL.lessons.forEach(function (x) { if (KL.palExtra) KL.palExtra.push({ k: 'LESSON', t: x.title, s: x.mod + ' ' + modOf(x.mod).title, go: function () { location.hash = '#learn/' + x.id; } }); });
})();
