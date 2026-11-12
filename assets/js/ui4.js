/* UI4: live hero demo, nav More menu, reveals, cursor spotlight, stats count-up, blast-radius preview, shadow expert, auto post-mortem. Offline, no deps. */
(function () {
  'use strict';
  var KL = window.KL;
  function $(i) { return document.getElementById(i); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* blocked */ } return null; }
  function motionOn() { return document.documentElement.getAttribute('data-motion') !== 'off'; }
  function pageOn(n) { var p = $('page-' + n); return !!(p && p.classList.contains('active')); }
  function mmss(s) { s = Math.max(0, Math.round(s)); return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2); }
  function toast(m) { if (KL.toast) KL.toast(m); }
  function labIdNow() { var m = /^#\/?lab\/([^/?]+)/.exec(location.hash); return m ? m[1] : ''; }

  // ───────── nav: More menu ─────────
  function navMore() {
    var m = document.querySelector('.nav-more'), b = $('navMore'); if (!m || !b || m.dataset.u4) return; m.dataset.u4 = '1';
    function close() { m.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); }
    b.onclick = function (e) { e.stopPropagation(); var o = m.classList.toggle('open'); b.setAttribute('aria-expanded', String(o)); };
    document.addEventListener('click', function (e) { if (!m.contains(e.target)) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && m.classList.contains('open')) { close(); b.focus(); } });
    m.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', close); });
    function mark(n) { m.classList.toggle('has-active', !!m.querySelector('a[data-page="' + n + '"]')); }
    window.addEventListener('kl:page', function (e) { mark(e.detail.name); }); mark((location.hash.replace(/^#\/?/, '').split('/')[0]) || 'home');
  }

  // ───────── hero: live terminal demo ─────────
  function heroDemo() {
    var term = document.querySelector('#page-home .hero-terminal'); if (!term || term.dataset.live || !KL.Sim || !KL.Labs) return;
    var body = term.querySelector('.terminal-body'), lab = KL.Labs.byId && KL.Labs.byId['s03-oomkilled']; if (!body || !lab) return; term.dataset.live = '1';
    var sim, token = 0, user = false, ns = lab.ns;
    body.innerHTML = '<div id="hdOut" aria-live="polite"></div><div class="hd-in"><span class="t-prompt">student@kubedrill</span><span class="hd-dim">$</span><input id="hdIn" aria-label="Try a kubectl command in the simulator" placeholder="try it: kubectl get pods -A" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="200"><span class="hd-bar"><button id="hdReplay" type="button">Replay</button></span></div>';
    var out = $('hdOut'), inp = $('hdIn');
    function fresh() { sim = new KL.Sim(); KL.Labs.setup(sim, lab); }
    function color(t) { return esc(t).replace(/(CrashLoopBackOff|OOMKilled|ImagePullBackOff|Error|Pending)/g, '<span class="hd-bad">$1</span>').replace(/\b(Running|Completed)\b/g, '<span class="hd-ok">$1</span>'); }
    function add(html, cls) { var d = document.createElement('div'); d.className = 'hd-line ' + (cls || ''); d.innerHTML = html; out.appendChild(d); while (out.children.length > 14) out.removeChild(out.firstChild); return d; }
    function run(cmd, cls) {
      var r; try { r = sim.exec(cmd); } catch (e) { r = { stdout: '', stderr: 'error: ' + e.message + '\n' }; } try { sim.settle(3); } catch (e) { /* ignore */ }
      var lines = ((r.stdout || '') + (r.stderr || '')).replace(/\n+$/, '').split('\n'); if (lines.length > 8) lines = lines.slice(0, 8).concat(['…']);
      if (lines.join('').trim()) add(color(lines.join('\n')), cls);
    }
    function typed(cmd, tok) {
      return new Promise(function (res) {
        var d = add('<span class="t-prompt">student@kubedrill</span> <span class="t-cmd">$ <span class="ty"></span></span><span class="hd-cur"></span>'), t = d.querySelector('.ty'), i = 0;
        (function step() { if (tok !== token) return res(false); if (!motionOn()) { t.textContent = cmd; var c0 = d.querySelector('.hd-cur'); if (c0) c0.remove(); return res(true); } t.textContent = cmd.slice(0, ++i); if (i < cmd.length) setTimeout(step, 26 + Math.random() * 30); else setTimeout(function () { var c = d.querySelector('.hd-cur'); if (c) c.remove(); res(true); }, 320); })();
      });
    }
    function wait(ms, tok) { return new Promise(function (r) { setTimeout(function () { r(tok === token); }, motionOn() ? ms : 0); }); }
    function alive() { return pageOn('home') && !document.hidden; }
    function play() {
      var tok = ++token; user = false; out.innerHTML = ''; fresh();
      var fix = lab.solution[0], steps = [
        function () { return typed('kubectl get pods -n ' + ns, tok).then(function (ok) { if (ok) run('kubectl get pods -n ' + ns); return ok; }); },
        function () { add('# CrashLoopBackOff: the container hit its memory limit and was killed', 'hd-dim'); return wait(1500, tok); },
        function () { return typed(fix, tok).then(function (ok) { if (ok) { run(fix, 'hd-fix'); } return ok; }); },
        function () { return wait(900, tok); },
        function () { return typed('kubectl get pods -n ' + ns, tok).then(function (ok) { if (ok) { try { sim.settle(6); } catch (e) { /* ignore */ } run('kubectl get pods -n ' + ns, 'hd-fix'); } return ok; }); },
        function () { add('# Fixed. Now you try: type a command below.', 'hd-dim'); return Promise.resolve(true); }
      ];
      (function next(i) { if (i >= steps.length) { if (motionOn() && !user) setTimeout(function () { if (tok === token && alive()) play(); else if (tok === token) { var iv = setInterval(function () { if (tok !== token) clearInterval(iv); else if (alive()) { clearInterval(iv); play(); } }, 1000); } }, 9000); return; } if (!alive() && motionOn()) { setTimeout(function () { if (tok === token) next(i); }, 800); return; } steps[i]().then(function (ok) { if (ok && tok === token) next(i + 1); }); })(0);
    }
    inp.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') { if (!user && e.key.length === 1) { user = true; token++; } return; }
      var c = inp.value.trim(); if (!c) return; user = true; token++; inp.value = ''; if (!sim) fresh();
      add('<span class="t-prompt">student@kubedrill</span> <span class="t-cmd">$ ' + esc(c) + '</span>'); if (c === 'clear') { out.innerHTML = ''; return; } run(c);
    });
    $('hdReplay').onclick = function () { play(); };
    play();
  }

  // ───────── reveals, spotlight, count-up ─────────
  function reveals() {
    if (!motionOn() || !window.IntersectionObserver) return;
    var els = [].filter.call(document.querySelectorAll('#page-home .stat, #page-home .tool-card, #page-home .pc, #page-home .how-steps li, #page-home .feat, #page-home .band-head, #homeFree .u3-card'), function (e) { return !e.dataset.rv; }); if (!els.length) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) { if (!x.isIntersecting) return; var e = x.target; io.unobserve(e); e.classList.add('in'); setTimeout(function () { e.classList.remove('rv', 'in'); e.style.removeProperty('--d'); }, 1100); });
    }, { threshold: .12 });
    els.forEach(function (e) { e.dataset.rv = '1'; var sib = [].indexOf.call(e.parentNode.children, e); e.style.setProperty('--d', Math.min(sib, 6) * 60 + 'ms'); e.classList.add('rv'); io.observe(e); });
  }
  function countUp() {
    var st = document.querySelector('#page-home .stats'); if (!st || st.dataset.cu || !window.IntersectionObserver || !motionOn()) return; st.dataset.cu = '1';
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return; io.disconnect();
      st.querySelectorAll('.stat-num').forEach(function (n) {
        var m = /^(\d+)(.*)$/.exec(n.textContent.trim()); if (!m) return; var to = +m[1], suf = m[2], t0 = performance.now();
        (function f(t) { var p = Math.min(1, (t - t0) / 1000), v = Math.round(to * (1 - Math.pow(1 - p, 3))); n.textContent = v + suf; if (p < 1) requestAnimationFrame(f); })(t0);
      });
    }, { threshold: .5 }); io.observe(st);
  }
  // ───────── landing: path cards + live counts ─────────
  function pathCards(force) {
    var root = $('pathCards'); if (!root || !KL.PATHS || !KL.Labs || (!force && root.children.length)) return; var st = KL.store, P = KL.PATHS, L = KL.lessons || [];
    var nm = { CKA: 'Certified Kubernetes Administrator', CKAD: 'Certified Kubernetes Application Developer', CKS: 'Certified Kubernetes Security Specialist' };
    root.innerHTML = Object.keys(P).map(function (t) {
      var p = P[t], labs = p.labs.filter(function (id) { return KL.Labs.byId[id]; }), nl = L.filter(function (x) { return p.mods.indexOf(parseInt(x.mod, 10)) >= 0; }).length;
      var done = 0; try { done = labs.filter(function (id) { return st.labDone(id); }).length; } catch (e) { /* ignore */ }
      var pct = labs.length ? Math.round(100 * done / labs.length) : 0;
      return '<div class="pc" data-t="' + t + '"><div class="pc-top"><div><h3>' + t + '</h3><div class="pc-name">' + nm[t] + '</div></div><div class="ring" style="--p:' + pct + '" role="img" aria-label="' + pct + ' percent of labs done"><span>' + pct + '%</span></div></div>' +
        '<ul><li><b>' + labs.length + '</b> auto-checked labs</li><li><b>' + p.mods.length + '</b> modules' + (nl ? ' · <b>' + nl + '</b> lessons' : '') + '</li><li>Quiz round and timed exam</li></ul>' +
        '<button type="button" class="btn-primary pc-go" data-t="' + t + '">' + (done ? 'Continue ' : 'Start ') + t + ' path</button></div>';
    }).join('');
    root.querySelectorAll('.pc-go').forEach(function (b) { b.onclick = function () { if (KL.setPathTrack) KL.setPathTrack(b.dataset.t); location.hash = '#path'; }; });
  }
  function fills() {
    document.querySelectorAll('[data-fill=labs]').forEach(function (n) { if (KL.Labs && KL.Labs.list.length) n.textContent = KL.Labs.list.length; });
    document.querySelectorAll('[data-fill=lessons],[data-count=lessons]').forEach(function (n) { if (KL.lessons && KL.lessons.length) n.textContent = KL.lessons.length; });
  }
  window.addEventListener('kl:store', function () { if (pageOn('home')) pathCards(true); });
  var SPOT = '.tool-card,.stat,.u3-card,.ilab-card,.pledge-grid>div,.pc,.feat,.how-steps li'; var sp = 0;
  document.addEventListener('pointermove', function (e) {
    if (sp || !motionOn() || e.pointerType === 'touch') return; var t = e.target.closest && e.target.closest(SPOT); if (!t) return;
    sp = requestAnimationFrame(function () { sp = 0; var r = t.getBoundingClientRect(); t.classList.add('spot'); t.style.setProperty('--mx', (e.clientX - r.left) + 'px'); t.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
  }, { passive: true });

  // ───────── blast-radius preview ─────────
  var MUT = /^(k|kubectl)\s+(delete|drain|cordon|uncordon|scale|rollout\s+(undo|restart)|set|patch|replace|apply|taint|autoscale)\b/, pop = null;
  function snap(s) {
    var o = { pods: {}, svcs: {}, nodes: {}, deps: {} };
    s.list('Pod').forEach(function (p) { if (/^kube-/.test(p.metadata.namespace)) return; o.pods[p.metadata.namespace + '/' + p.metadata.name] = s.podStatus(p); });
    s.list('Service').forEach(function (x) { if (!x.spec.selector || /^kube-/.test(x.metadata.namespace)) return; var n = 0; try { n = s.endpointsFor(x).length; } catch (e) { /* none */ } o.svcs[x.metadata.namespace + '/' + x.metadata.name] = n; });
    s.list('Node', '').forEach(function (n) { o.nodes[n.metadata.name] = (n.spec.unschedulable ? 'cordoned ' : '') + (KL.Sim.nodeReady && !KL.Sim.nodeReady(n) ? 'NotReady' : 'Ready'); });
    s.list('Deployment').forEach(function (d) { if (!/^kube-/.test(d.metadata.namespace)) o.deps[d.metadata.namespace + '/' + d.metadata.name] = d.spec.replicas; });
    return o;
  }
  function names(a, n) { n = n || 3; return a.slice(0, n).join(', ') + (a.length > n ? ' +' + (a.length - n) + ' more' : ''); }
  function diff(a, b) {
    var L = [], gone = [], born = [], chg = [], hits = [], doomed = [], k;
    for (k in a.pods) { if (!(k in b.pods)) { gone.push(k); doomed.push(k); } else if (a.pods[k] !== b.pods[k]) chg.push(k.split('/')[1] + ' ' + a.pods[k] + ' → ' + b.pods[k]); }
    for (k in b.pods) if (!(k in a.pods)) born.push(k.split('/')[1]);
    if (gone.length) L.push(['del', '− ' + gone.length + ' pod' + (gone.length > 1 ? 's' : '') + ' removed: ' + names(gone.map(function (x) { return x.split('/')[1]; }))]);
    if (born.length) L.push(['add', '+ ' + born.length + ' pod' + (born.length > 1 ? 's' : '') + ' created: ' + names(born)]);
    if (chg.length) L.push(['chg', '~ ' + chg.length + ' pod status change' + (chg.length > 1 ? 's' : '') + ': ' + names(chg, 2)]);
    for (k in a.deps) if (k in b.deps && a.deps[k] !== b.deps[k]) L.push(['chg', '~ deployment ' + k.split('/')[1] + ' replicas ' + a.deps[k] + ' → ' + b.deps[k]]);
    for (k in a.deps) if (!(k in b.deps)) L.push(['del', '− deployment ' + k.split('/')[1] + ' deleted']);
    for (k in a.nodes) if (a.nodes[k] !== b.nodes[k]) L.push(['chg', '~ node ' + k + ': ' + a.nodes[k] + ' → ' + b.nodes[k]]);
    for (k in a.svcs) if (k in b.svcs && b.svcs[k] < a.svcs[k]) { L.push([b.svcs[k] === 0 ? 'hit' : 'chg', (b.svcs[k] === 0 ? '⚠ ' : '~ ') + 'service ' + k.split('/')[1] + ' endpoints ' + a.svcs[k] + ' → ' + b.svcs[k] + (b.svcs[k] === 0 ? ' (no traffic can reach it)' : '')]); hits.push(k); }
    for (k in a.svcs) if (!(k in b.svcs)) { L.push(['hit', '⚠ service ' + k.split('/')[1] + ' would be deleted']); hits.push(k); }
    return { lines: L, doomed: doomed, hits: hits };
  }
  function clearMarks() { document.querySelectorAll('.br-doomed').forEach(function (e) { e.classList.remove('br-doomed'); }); document.querySelectorAll('.br-hit').forEach(function (e) { e.classList.remove('br-hit'); }); }
  function closePop() { if (pop) { pop.el.remove(); document.removeEventListener('keydown', pop.key, true); pop = null; } clearMarks(); }
  function showPop(cmd, d, err, inp) {
    closePop(); var host = document.querySelector('#labRunner .lr-right'); if (!host) return;
    var el = document.createElement('div'); el.className = 'br-pop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Blast radius preview');
    var li = d.lines.length ? d.lines.map(function (x) { return '<li class="' + x[0] + '">' + esc(x[1]) + '</li>'; }).join('') : '<li>' + (err ? 'This command would fail in the cluster as it is now.' : 'No visible change to pods, services or nodes.') + '</li>';
    if (err) li += '<li class="del">' + esc(err.split('\n')[0].slice(0, 140)) + '</li>';
    el.innerHTML = '<h4>Preview <code>' + esc(cmd.length > 70 ? cmd.slice(0, 69) + '…' : cmd) + '</code></h4><ul>' + li + '</ul><div class="acts"><button type="button" class="go" id="brGo">Run it (Enter)</button><button type="button" id="brNo">Cancel (Esc)</button><span>Nothing has changed yet. Turn this off in Settings.</span></div>';
    host.appendChild(el);
    var key = function (e) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); go(); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePop(); } else if (e.key.length === 1 || e.key === 'Backspace') closePop(); };
    function go() { closePop(); inp.dataset.brOk = '1'; inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); }
    pop = { el: el, key: key }; document.addEventListener('keydown', key, true); $('brGo').onclick = go; $('brNo').onclick = function () { closePop(); inp.focus(); };
    d.doomed.forEach(function (k) { var p = document.querySelector('.dia-pod[data-k="' + k + '"]'); if (p) p.classList.add('br-doomed'); });
    d.hits.forEach(function (k) { var s = document.querySelector('.dia-svc[data-svc="' + k + '"]'); if (s) s.classList.add('br-hit'); });
  }
  function onKey(e) {
    if (e.key !== 'Enter' || e.isComposing) return; var inp = e.target; if (!inp || inp.id !== 'lrIn') return;
    if (inp.dataset.brOk) { delete inp.dataset.brOk; return; }
    if (ls('kl.blast') === 'off' || (ls('kl.labmode') || 'learn') !== 'learn') return;
    var cmd = inp.value.trim(), pr = $('lrPrompt'); if (!MUT.test(cmd) || /--dry-run|\s-h\b|--help/.test(cmd) || (pr && pr.textContent === '> ')) return;
    var id = labIdNow(); if (!id || !KL.labRun) return; e.preventDefault(); e.stopImmediatePropagation();
    KL.labRun(id).then(function (r) {
      var s = r && r.sim; if (!s) { inp.dataset.brOk = '1'; inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); return; }
      var before = snap(s), c, res, err = '';
      try { c = new KL.Sim().load(s.dump()); res = c.exec(cmd); c.settle(3); err = res && res.stderr && !/created|configured|deleted|scaled|patched|cordoned|drained|updated|tainted|restarted|rolled back/.test(res.stdout || '') ? res.stderr : ''; } catch (x) { err = x.message; }
      showPop(cmd, c ? diff(before, snap(c)) : { lines: [], doomed: [], hits: [] }, err, inp);
    });
  }
  function blastBtn() {
    var bar = document.querySelector('#labRunner .lr-bar'); if (!bar || $('lrBlast')) return;
    var b = document.createElement('button'); b.id = 'lrBlast'; b.type = 'button'; b.className = 'btn-secondary br-tog'; b.title = 'Preview what a risky command would change before it runs (Learn mode)';
    function paint() { b.textContent = 'Preview: ' + (ls('kl.blast') === 'off' ? 'off' : 'on'); b.setAttribute('aria-pressed', String(ls('kl.blast') !== 'off')); }
    b.onclick = function () { ls('kl.blast', ls('kl.blast') === 'off' ? 'on' : 'off'); paint(); closePop(); }; paint();
    var t = $('lrTimer'); bar.insertBefore(b, t || null);
  }

  // ───────── command log (for shadow expert + post-mortem) ─────────
  var plog = { id: '', t0: 0, items: [], obs: null };
  function watchLog() {
    var o = $('lrOut'), id = labIdNow(); if (!o || !id) return; if (o.dataset.u4w) return; o.dataset.u4w = '1';
    if (plog.id !== id) plog = { id: id, t0: Date.now(), items: [], obs: null };
    new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1 && n.classList.contains('cmd')) plog.items.push({ t: Date.now(), c: cmdText(n) }); }); }); }).observe(o, { childList: true });
  }
  function cmdText(n) { return n.textContent.replace(/^[^$]*\$ ?/, '').trim(); }
  function cmds() { return [].map.call(document.querySelectorAll('#lrOut .lr-o.cmd'), cmdText).filter(function (c) { return c && c !== 'clear' && c !== 'help'; }); }
  var READ = /^(k|kubectl)\s+(get|describe|logs|top|events|explain|auth|api-resources|config\s+(get|current))\b|^(ls|cat|grep|echo|pwd)\b/;
  function key(c) { var t = c.replace(/^(k|kubectl)\s+/, '').split(/\s+/).filter(function (x) { return x && x[0] !== '-'; }); return t.slice(0, 3).join(' ').split('/').join(' '); }

  // ───────── shadow expert ─────────
  function shadow(lab) {
    var fb = $('lrFeedback'); if (!fb || fb.querySelector('.shadow')) return; var mine = cmds(), ref = lab.solution || [], keys = mine.map(key), firstMut = -1, i;
    for (i = 0; i < mine.length; i++) if (!READ.test(mine[i])) { firstMut = i; break; }
    var reads = firstMut < 0 ? mine.length : firstMut, ran = ref.map(function (r) { return keys.indexOf(key(r)) >= 0; }), nRan = ran.filter(Boolean).length;
    var advice = firstMut === 0 ? 'You changed something before looking at anything. In a real incident, read events and logs first, so you fix the cause and not a guess.' : reads >= 2 ? 'Good habit: ' + reads + ' read-only commands before your first change.' : 'You looked once before changing. One more read (events or logs) is cheap insurance.';
    var d = document.createElement('section'); d.className = 'shadow'; d.setAttribute('aria-label', 'Shadow expert');
    d.innerHTML = '<h4>Shadow expert</h4><div class="sh-stats"><div><b>' + mine.length + '</b><span>your commands</span></div><div><b>' + ref.length + '</b><span>reference path</span></div><div><b>' + reads + '</b><span>reads before first change</span></div></div><p>' + esc(advice) + '</p>' +
      '<ul class="sh-steps">' + ref.map(function (r, j) { return '<li class="' + (ran[j] ? 'ran' : 'miss') + '"><i>' + (ran[j] ? '✓' : '○') + '</i><span>' + esc(r) + '</span></li>'; }).join('') + '</ul>' +
      '<p style="font-size:12.5px">' + (nRan === ref.length ? 'You ran every step of the reference path.' : (ref.length - nRan) + ' reference step' + (ref.length - nRan > 1 ? 's' : '') + ' reached the same result a different way, or you used another route. That is fine if the checks pass.') + '</p>' +
      '<div class="sh-act"><button type="button" class="btn-secondary" id="shPlay">Watch the reference path</button>' + (lab.incident ? '<button type="button" class="btn-secondary" id="shPm">Draft post-mortem</button>' : '') + '</div><div id="shGhost" class="sh-ghost" hidden></div>';
    fb.appendChild(d);
    $('shPlay').onclick = function () {
      var g = $('shGhost'), s = new KL.Sim(); KL.Labs.setup(s, lab); g.hidden = false; g.textContent = ''; var q = ref.slice(), t0 = 0;
      (function next() { if (!q.length) return; var c = q.shift(), r; g.textContent += '$ ' + c + '\n'; try { r = s.exec(c); s.settle(3); } catch (e) { r = { stdout: '', stderr: e.message }; } var o = ((r.stdout || '') + (r.stderr || '')).replace(/\n+$/, ''); g.textContent += (o ? o.split('\n').slice(0, 6).join('\n') + '\n' : '') + '\n'; g.scrollTop = g.scrollHeight; setTimeout(next, motionOn() ? 700 : 0); })(t0);
    };
    if ($('shPm')) $('shPm').onclick = function () { postmortem(lab); };
  }
  window.addEventListener('kl:labdone', function (e) { if (e.detail && e.detail.lab) setTimeout(function () { shadow(e.detail.lab); }, 450); });
  KL.shadowFor = shadow;

  // ───────── auto post-mortem ─────────
  function strip(s) { return String(s || '').replace(/\*\*/g, '').replace(/`/g, ''); }
  function buildPM(lab) {
    var mine = cmds(), deb = (KL.debrief || {})[lab.id] || ['', '', '', ''], items = plog.id === lab.id && plog.items.length === mine.length ? plog.items : null, t0 = items ? plog.t0 : 0, w = document.querySelector('#labRunner .war'), start = w ? +w.dataset.t0 : t0, dur = items ? (items[items.length - 1].t - start) / 1000 : 0, sev = lab.diff === 'Expert' ? 1 : 2;
    var story = strip(lab.story).split(/(?<=[.!?])\s+/).slice(0, 3).join(' '), tl = [];
    mine.forEach(function (c, i) { var mut = !READ.test(c); if (mut || i === 0 || i === mine.length - 1) tl.push('- ' + (items ? mmss((items[i].t - start) / 1000) : 'step ' + (i + 1)) + '  ' + (mut ? 'Change: ' : 'Looked: ') + '`' + c + '`'); });
    var firstMut = -1; mine.some(function (c, i) { if (!READ.test(c)) { firstMut = i; return true; } return false; });
    var went = [], improve = []; if (firstMut > 0) went.push('Investigated (' + firstMut + ' read-only command' + (firstMut > 1 ? 's' : '') + ') before changing anything.'); else improve.push('Read events and logs before the first change.');
    if (mine.some(function (c) { return /rollout\s+undo/.test(c); })) went.push('Used a rollback, the safest fast option during an incident.');
    if (mine.some(function (c) { return /--dry-run/.test(c); })) went.push('Used --dry-run before applying.'); else improve.push('Try --dry-run=server before applying a change.');
    if (mine.length > (lab.solution || []).length * 2) improve.push('The reference path needs ' + (lab.solution || []).length + ' commands; look for a shorter route next time.');
    return ['# Post-mortem: ' + strip(lab.title.replace(/^Incident:\s*/i, '')), '', '_Practice incident, drafted from my own session in KubeDrill. Blameless format._', '', '- Severity: SEV' + sev, '- Duration: ' + (dur > 0 ? mmss(dur) : 'not recorded'), '- Environment: practice simulator, namespace `' + (lab.ns || 'default') + '`', '', '## Summary', story, '', '## Timeline', tl.join('\n') || '- (no commands recorded)', '', '## Root cause', strip(deb[0]), '', '## What fixed it', strip(deb[1]), '', '## How we would detect it sooner', strip(deb[2]), '', '## What went well', went.length ? went.map(function (x) { return '- ' + x; }).join('\n') : '- Service was restored.', '', '## What to improve', improve.length ? improve.map(function (x) { return '- ' + x; }).join('\n') : '- Nothing stands out; keep the habits above.', '', '## Action items', '- [ ] ' + strip(deb[3] || 'Add an alert for this failure mode'), '- [ ] Write a runbook entry for this symptom', '- [ ] Add a check to the deploy pipeline that would have caught it', ''].join('\n');
  }
  function postmortem(lab) {
    var bg = document.createElement('div'); bg.className = 'pm-bg'; var text = buildPM(lab);
    bg.innerHTML = '<div class="pm" role="dialog" aria-label="Post-mortem draft"><h4 style="margin:0 0 8px">Post-mortem draft</h4><p style="margin:0 0 8px;font-size:13px;color:var(--text2)">Edit it, copy it, or download it. It never leaves your browser.</p><textarea id="pmText" spellcheck="false"></textarea><div class="acts"><button class="btn-primary" id="pmCopy" type="button">Copy</button><button class="btn-secondary" id="pmDl" type="button">Download .md</button><button class="btn-secondary" id="pmX" type="button">Close</button></div></div>';
    document.body.appendChild(bg); $('pmText').value = text;
    $('pmX').onclick = function () { bg.remove(); document.removeEventListener('keydown', esc2, true); };
    function esc2(e) { if (e.key === 'Escape') { bg.remove(); document.removeEventListener('keydown', esc2, true); } } document.addEventListener('keydown', esc2, true);
    $('pmCopy').onclick = function () { var v = $('pmText').value; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(function () { toast('Copied'); }, function () { $('pmText').select(); toast('Press Ctrl+C to copy'); }); else { $('pmText').select(); toast('Press Ctrl+C to copy'); } };
    $('pmDl').onclick = function () { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([$('pmText').value], { type: 'text/markdown' })); a.download = 'postmortem-' + lab.id + '.md'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); };
  }
  KL.buildPostmortem = buildPM;

  // ───────── wiring ─────────
  function decorate() { watchLog(); blastBtn(); var t = $('lrTerm'); if (t && !t.dataset.u4k) { t.dataset.u4k = '1'; t.addEventListener('keydown', onKey, true); } }
  KL.route('lab', function () { closePop(); setTimeout(decorate, 150); setTimeout(decorate, 600); });
  window.addEventListener('kl:runner', function () { closePop(); setTimeout(decorate, 80); });
  window.addEventListener('kl:page', function (e) { if (e.detail.name !== 'lab') closePop(); });
  function tick() { navMore(); fills(); pathCards(); heroDemo(); reveals(); countUp(); }
  document.addEventListener('DOMContentLoaded', tick); tick();
  setInterval(function () { if (pageOn('home')) { fills(); pathCards(); heroDemo(); reveals(); countUp(); } }, 1500);
})();
