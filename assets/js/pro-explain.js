/* Explainers: "why is this pod Pending?" (scheduler filter/score trace) and "why can't A reach B?" (connection path tracer),
   plus the alert-first pager card for incident and fault labs. Read-only: nothing here changes the cluster. */
(function () {
  'use strict';
  var KL = window.KL, Labs = KL.Labs, store = KL.store, U = KL.Sim.util, matchSel = U.matchSel, parseCpu = U.parseCpu, parseMem = U.parseMem;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function R() { return KL.runner && KL.runner.cur(); }
  function inExam(r) { var a = KL.exam && KL.exam.active; return !!(a && r && a.ids.indexOf(r.lab.id) >= 0); }
  function learn(r) { return !!r && r.mode === 'learn' && !inExam(r); }
  function userPods(sim) { return sim.list('Pod').filter(function (p) { return !/^kube-/.test(p.metadata.namespace); }); }
  function insertCmd(c) { var i = $('lrIn'); if (!i) return; i.value = c; i.focus(); }
  function fmtC(m) { return m % 1000 === 0 ? (m / 1000) + '' : Math.round(m) + 'm'; }

  // ───────── scheduler explainer ─────────
  function tolerates(taint, tols) { return (tols || []).some(function (tl) { return (!tl.effect || tl.effect === taint.effect) && (tl.operator === 'Exists' ? (!tl.key || tl.key === taint.key) : (tl.key === taint.key && (tl.value || '') === (taint.value || ''))); }); }
  function affinityOk(nd, na) {
    if (!na) return true; var L = nd.metadata.labels || {};
    return (na.nodeSelectorTerms || []).some(function (t) { return (t.matchExpressions || []).every(function (e) { var v = L[e.key]; return e.operator === 'In' ? (e.values || []).indexOf(v) >= 0 : e.operator === 'NotIn' ? (e.values || []).indexOf(v) < 0 : e.operator === 'Exists' ? v !== undefined : e.operator === 'DoesNotExist' ? v === undefined : true; }); });
  }
  var FILTERS = [['name', 'NodeName'], ['sched', 'Schedulable'], ['sel', 'Selector / affinity'], ['taint', 'Taints'], ['cpu', 'CPU'], ['mem', 'Memory'], ['anti', 'Anti-affinity']];
  function explainSched(sim, pod) {
    var s = pod.spec, nodes = sim.list('Node'), req = { cpu: 0, mem: 0 }, rows = [];
    s.containers.forEach(function (c) { var r = c.resources && c.resources.requests; if (r) { req.cpu += parseCpu(r.cpu); req.mem += parseMem(r.memory); } });
    var na = s.affinity && s.affinity.nodeAffinity && s.affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution;
    var paa = s.affinity && s.affinity.podAntiAffinity && s.affinity.podAntiAffinity.requiredDuringSchedulingIgnoredDuringExecution;
    nodes.forEach(function (nd) {
      var nm = nd.metadata.name, L = nd.metadata.labels || {}, used = sim.nodeUsed(nm), al = nd.status.allocatable || {}, self = s.nodeName === nm, c = {};
      if (self) { used.cpu -= req.cpu; used.mem -= req.mem; }
      c.name = (s.nodeName && s.nodeName !== nm) ? { ok: false, msg: 'pod is pinned to ' + s.nodeName, fix: 'Remove spec.nodeName (use a nodeSelector instead).' } : { ok: true };
      c.sched = nd.spec.unschedulable ? { ok: false, msg: 'node is cordoned', fix: 'kubectl uncordon ' + nm, cmd: 'kubectl uncordon ' + nm } : { ok: true };
      var miss = null; if (s.nodeSelector) for (var k in s.nodeSelector) if (L[k] !== s.nodeSelector[k]) { miss = k + '=' + s.nodeSelector[k]; break; }
      if (miss) c.sel = { ok: false, msg: 'node lacks label ' + miss, fix: 'kubectl label node ' + nm + ' ' + miss, cmd: 'kubectl label node ' + nm + ' ' + miss };
      else if (!affinityOk(nd, na)) c.sel = { ok: false, msg: 'nodeAffinity not satisfied', fix: 'Label the node to match, or relax the affinity terms.' };
      else c.sel = { ok: true };
      var bad = (nd.spec.taints || []).filter(function (t) { return (t.effect === 'NoSchedule' || t.effect === 'NoExecute') && !tolerates(t, s.tolerations); })[0];
      c.taint = bad ? { ok: false, msg: 'untolerated taint ' + bad.key + (bad.value ? '=' + bad.value : '') + ':' + bad.effect, fix: 'Add a toleration to the pod, or remove the taint: kubectl taint nodes ' + nm + ' ' + bad.key + '-', cmd: 'kubectl taint nodes ' + nm + ' ' + bad.key + '-' } : { ok: true };
      var freeC = parseCpu(al.cpu) - used.cpu, freeM = parseMem(al.memory) - used.mem;
      c.cpu = req.cpu > freeC ? { ok: false, msg: 'needs ' + fmtC(req.cpu) + ', only ' + fmtC(Math.max(0, freeC)) + ' of ' + fmtC(parseCpu(al.cpu)) + ' free', fix: 'Lower the CPU request, scale something down, or add capacity.' } : { ok: true, msg: fmtC(Math.max(0, freeC)) + ' free' };
      c.mem = req.mem > freeM ? { ok: false, msg: 'needs ' + Math.round(req.mem) + 'Mi, only ' + Math.round(Math.max(0, freeM)) + 'Mi free', fix: 'Lower the memory request or free memory on the node.' } : { ok: true, msg: Math.round(Math.max(0, freeM)) + 'Mi free' };
      var clash = paa && paa.some(function (term) { return sim.list('Pod', pod.metadata.namespace).some(function (o) { return o !== pod && o.spec.nodeName === nm && matchSel(term.labelSelector, o.metadata.labels); }); });
      c.anti = clash ? { ok: false, msg: 'another matching pod is already here', fix: 'Add nodes, or relax podAntiAffinity to “preferred”.' } : { ok: true };
      var firstFail = FILTERS.filter(function (f) { return !c[f[0]].ok; })[0];
      rows.push({ name: nm, c: c, pass: !firstFail, first: firstFail ? c[firstFail[0]] : null, firstKey: firstFail ? firstFail[0] : '', free: (freeC) + (freeM) });
    });
    var pass = rows.filter(function (r) { return r.pass; }).sort(function (a, b) { return b.free - a.free || (a.name < b.name ? -1 : 1); });
    var reasons = {}; rows.forEach(function (r) { if (!r.pass) { var t = r.first.msg.replace(/^needs.*$/, r.firstKey === 'cpu' ? 'Insufficient cpu' : 'Insufficient memory').replace(/^untolerated taint (.*)$/, 'had untolerated taint {$1}').replace(/^node is cordoned$/, 'were unschedulable').replace(/^node lacks label.*$|^nodeAffinity not satisfied$/, "didn't match Pod's node affinity/selector").replace(/^another matching pod.*$/, "didn't match pod anti-affinity rules").replace(/^pod is pinned.*$/, "didn't match the requested node name"); reasons[t] = (reasons[t] || 0) + 1; } });
    var msg = pass.length ? '' : '0/' + rows.length + ' nodes are available: ' + Object.keys(reasons).map(function (k) { return reasons[k] + ' node(s) ' + (/^(Insufficient)/.test(k) ? k : k); }).join(', ') + '.';
    return { rows: rows, winner: pass[0] && pass[0].name, pass: pass, msg: msg, req: req };
  }
  function renderSched(host, r, pod) {
    var sim = r.sim, ex = explainSched(sim, pod), st = sim.podStatus(pod), n = ex.rows.length, d = 0;
    var left = n, funnel = [['All nodes', n]];
    FILTERS.forEach(function (f) { left = ex.rows.filter(function (x) { var ok = true; for (var i = 0; i < FILTERS.length; i++) { if (!x.c[FILTERS[i][0]].ok) { ok = false; } if (FILTERS[i][0] === f[0]) break; } return ok; }).length; funnel.push([f[1], left]); });
    var h = '<div class="pro-sched"><div class="pro-sh"><b>' + esc(pod.metadata.namespace + '/' + pod.metadata.name) + '</b><span class="pro-pill ' + (/Pending/.test(st) ? 'y' : /Running/.test(st) ? 'g' : 'r') + '">' + esc(st) + '</span>' + (pod.spec.nodeName ? '<span class="pro-dim">on ' + esc(pod.spec.nodeName) + '</span>' : '') + '<span class="pro-dim">requests ' + fmtC(ex.req.cpu) + ' CPU · ' + Math.round(ex.req.mem) + 'Mi</span></div>';
    h += '<div class="pro-funnel" aria-label="Filter funnel">' + funnel.map(function (f, i) { return '<div style="--d:' + i * 90 + 'ms"><b>' + f[1] + '</b><span>' + esc(f[0]) + '</span></div>'; }).join('<i>›</i>') + '</div>';
    h += '<div class="pro-tw"><table class="pro-tab"><thead><tr><th>Node</th>' + FILTERS.map(function (f) { return '<th>' + f[1] + '</th>'; }).join('') + '<th>Result</th></tr></thead><tbody>' + ex.rows.map(function (x) {
      var cell = function (k) { var c = x.c[k]; return '<td class="' + (c.ok ? 'ok' : 'no') + '" title="' + esc(c.msg || (c.ok ? 'passes' : '')) + '">' + (c.ok ? '✓' : '✗') + '</td>'; };
      return '<tr class="' + (x.name === ex.winner ? 'win' : x.pass ? 'pass' : 'out') + '" style="--d:' + (d++ * 120) + 'ms"><th>' + esc(x.name) + '</th>' + FILTERS.map(function (f) { return cell(f[0]); }).join('') + '<td>' + (x.name === ex.winner ? '🏆 chosen' : x.pass ? 'eligible' : '✗ ' + esc(x.first.msg)) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
    if (ex.winner) h += '<p class="pro-v ok">Scoring picks <b>' + esc(ex.winner) + '</b>: the least-loaded eligible node (' + ex.pass.length + ' of ' + n + ' passed every filter).</p>';
    else h += '<p class="pro-v bad">No node passes every filter, so the pod stays <b>Pending</b>. The scheduler reports:<code>' + esc(ex.msg) + '</code></p>';
    var seen = {}, fixes = []; ex.rows.forEach(function (x) { if (!x.pass && !seen[x.first.fix]) { seen[x.first.fix] = 1; fixes.push(x.first); } });
    if (fixes.length) h += '<div class="pro-fixes"><b>Ways to fix it</b>' + fixes.map(function (f) { return '<div><span>' + esc(f.fix) + '</span>' + (f.cmd ? '<button type="button" class="btn-secondary" data-cmd="' + esc(f.cmd) + '">Put in terminal</button>' : '') + '</div>'; }).join('') + '<p class="pro-dim">Pick the fix that matches your intent. A taint or label is often there on purpose.</p></div>';
    host.innerHTML = h + '</div>';
    host.querySelectorAll('[data-cmd]').forEach(function (b) { b.onclick = function () { insertCmd(b.dataset.cmd); }; });
  }

  // ───────── network path tracer ─────────
  function polAllows(sim, np, dir, from, to, port) {
    var rules = dir === 'ingress' ? (np.spec.ingress || []) : (np.spec.egress || []), peerPod = dir === 'ingress' ? from : to;
    return rules.some(function (rule) {
      var portOk = !rule.ports || !rule.ports.length || rule.ports.some(function (p) { return p.port === undefined || p.port === port || String(p.port) === String(port); });
      if (!portOk) return false; var peers = dir === 'ingress' ? rule.from : rule.to; if (!peers || !peers.length) return true;
      return peers.some(function (f) {
        if (f.ipBlock) return false; var nsOk, podOk = true;
        if (f.namespaceSelector !== undefined) { var nso = sim.get('Namespace', '', peerPod.metadata.namespace); nsOk = matchSel(f.namespaceSelector, (nso && nso.metadata.labels) || {}); } else nsOk = from.metadata.namespace === to.metadata.namespace;
        if (f.podSelector !== undefined) podOk = matchSel(f.podSelector, peerPod.metadata.labels); return nsOk && podOk;
      });
    });
  }
  function policyStep(sim, dir, from, to, port) {
    var pod = dir === 'ingress' ? to : from, label = dir === 'ingress' ? 'Ingress policy on ' + to.metadata.name : 'Egress policy on ' + from.metadata.name;
    var pols = sim.list('NetworkPolicy', pod.metadata.namespace).filter(function (np) { var t = np.spec.policyTypes || ['Ingress']; return t.map(function (x) { return x.toLowerCase(); }).indexOf(dir) >= 0 && matchSel(np.spec.podSelector, pod.metadata.labels); });
    if (!pols.length) return { ok: true, t: label, d: 'No NetworkPolicy selects this pod for ' + dir + ', so traffic is allowed (default allow).' };
    var ok = pols.filter(function (np) { return polAllows(sim, np, dir, from, to, port); });
    if (ok.length) return { ok: true, t: label, d: 'Allowed by policy ' + ok.map(function (x) { return '“' + x.metadata.name + '”'; }).join(', ') + '.' };
    return { ok: false, t: label, d: 'Dropped. ' + pols.map(function (x) { return '“' + x.metadata.name + '”'; }).join(', ') + ' select' + (pols.length === 1 ? 's' : '') + ' this pod but no ' + dir + ' rule matches ' + (dir === 'ingress' ? 'the source' : 'the destination') + ' on port ' + port + '.', fix: 'kubectl describe netpol -n ' + pod.metadata.namespace, cmd: 'kubectl describe netpol -n ' + pod.metadata.namespace };
  }
  function trace(sim, from, host, port) {
    var steps = [], res = sim.resolveTarget(from, host, port || 80), end = false;
    function add(s) { steps.push(s); if (!s.ok) end = true; }
    if (res.dns === false) { add({ ok: false, t: 'DNS lookup', d: '“' + host + '” does not resolve: no Service with that name in ' + from.metadata.namespace + ' (or the namespace you named).', fix: 'Use <service>.<namespace> from another namespace; check the name with kubectl get svc -A', cmd: 'kubectl get svc -A' }); return steps; }
    try { if (sim.dnsUp && !sim.dnsUp()) { add({ ok: false, t: 'DNS lookup', d: 'CoreDNS has no ready endpoints, so every name lookup fails.', fix: 'kubectl get pods -n kube-system -l k8s-app=kube-dns', cmd: 'kubectl get pods -n kube-system' }); return steps; } } catch (e) { /* ignore */ }
    var svc = res.svc;
    add({ ok: true, t: 'DNS lookup', d: svc ? '“' + host + '” → Service ' + svc.metadata.namespace + '/' + svc.metadata.name + ' ClusterIP ' + (svc.spec.clusterIP || '—') + '.' : '“' + host + '” is a pod IP: no DNS or Service hop.' });
    if (svc) {
      if (res.refused && !res.noep) { add({ ok: false, t: 'Service port', d: 'The Service does not expose port ' + (port || 80) + '. It exposes ' + (svc.spec.ports || []).map(function (p) { return p.port; }).join(', ') + '.', fix: 'Use one of the Service ports, or add the port to the Service.', cmd: 'kubectl get svc ' + svc.metadata.name + ' -n ' + svc.metadata.namespace }); return steps; }
      add({ ok: true, t: 'Service port', d: 'Port ' + (res.svcPort || port || 80) + ' is exposed by the Service.' });
      if (res.noep) {
        var sel = svc.spec.selector || {}, cand = sim.list('Pod', svc.metadata.namespace), match = cand.filter(function (p) { return matchSel({ matchLabels: sel }, p.metadata.labels); });
        var why = !Object.keys(sel).length ? 'The Service has no selector, so it has no endpoints.' : match.length ? 'Selector ' + JSON.stringify(sel) + ' matches ' + match.length + ' pod(s), but none is Ready (' + match.slice(0, 3).map(function (p) { return p.metadata.name + ': ' + sim.podStatus(p); }).join('; ') + ').' : 'Selector ' + JSON.stringify(sel) + ' matches no pod. Pods here carry labels like ' + (cand[0] ? JSON.stringify(cand[0].metadata.labels || {}) : '(there are no pods)') + '.';
        add({ ok: false, t: 'Endpoints', d: why, fix: 'kubectl get endpoints ' + svc.metadata.name + ' -n ' + svc.metadata.namespace + ' --show-labels', cmd: 'kubectl get endpoints ' + svc.metadata.name + ' -n ' + svc.metadata.namespace }); return steps;
      }
      add({ ok: true, t: 'Endpoints', d: res.pods.length + ' ready endpoint(s); traffic goes to targetPort ' + res.port + ' on ' + res.pods.slice(0, 3).map(function (p) { return p.metadata.name; }).join(', ') + (res.pods.length > 3 ? '…' : '') + '.' });
    }
    var dest = res.pods && res.pods[0]; if (!dest) { add({ ok: false, t: 'Destination', d: 'No pod owns that address.' }); return steps; }
    var eg = policyStep(sim, 'egress', from, dest, res.port); add(eg); if (end) return steps;
    var ig = policyStep(sim, 'ingress', from, dest, res.port); add(ig); if (end) return steps;
    add({ ok: true, t: 'Delivered', d: 'The request reaches ' + dest.metadata.name + ':' + res.port + ' and gets a response.' });
    return steps;
  }
  function renderNet(host, r) {
    var sim = r.sim, pods = userPods(sim).filter(function (p) { return !/Completed|Succeeded/.test(sim.podStatus(p)); }), svcs = sim.list('Service').filter(function (x) { return !/^kube-/.test(x.metadata.namespace) && !(x.metadata.namespace === 'default' && x.metadata.name === 'kubernetes'); });
    if (!pods.length) { host.innerHTML = '<p class="pro-note">There are no running pods to trace from yet.</p>'; return; }
    var targets = svcs.map(function (x) { return { v: x.metadata.name + '.' + x.metadata.namespace + ':' + ((x.spec.ports || [{ port: 80 }])[0].port), l: 'svc ' + x.metadata.namespace + '/' + x.metadata.name }; }).concat(pods.filter(function (p) { return p.status.podIP; }).slice(0, 12).map(function (p) { return { v: p.status.podIP + ':80', l: 'pod ' + p.metadata.name + ' (' + p.status.podIP + ')' }; }));
    var st = r.netSel || {}, fromSel = st.from || (pods.filter(function (p) { return /tester|client|test|frontend|curl/.test(p.metadata.name); })[0] || pods[0]).metadata.namespace + '/' + (pods.filter(function (p) { return /tester|client|test|frontend|curl/.test(p.metadata.name); })[0] || pods[0]).metadata.name;
    var toSel = st.to || (targets[0] && targets[0].v) || '';
    host.innerHTML = '<div class="pro-netf"><label>From pod<select id="proNetFrom">' + pods.map(function (p) { var k = p.metadata.namespace + '/' + p.metadata.name; return '<option value="' + esc(k) + '"' + (k === fromSel ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('') + '</select></label><label>To<input id="proNetTo" list="proNetList" value="' + esc(toSel) + '" aria-label="Target host:port" spellcheck="false" autocomplete="off"><datalist id="proNetList">' + targets.map(function (t) { return '<option value="' + esc(t.v) + '">' + esc(t.l) + '</option>'; }).join('') + '</datalist></label><button type="button" class="btn-primary" id="proNetGo">▶ Trace</button></div><div id="proNetOut"></div>';
    function go() {
      var fp = $('proNetFrom').value.split('/'), from = sim.get('Pod', fp[0], fp[1]), to = $('proNetTo').value.trim(), m = to.match(/^(.*?)(?::(\d+))?$/), hostn = m[1], port = m[2] ? +m[2] : 80; r.netSel = { from: $('proNetFrom').value, to: to };
      if (!from || !hostn) { $('proNetOut').innerHTML = '<p class="pro-note">Pick a source pod and a target such as <code>db:80</code>.</p>'; return; }
      var steps = trace(sim, from, hostn, port), last = steps[steps.length - 1], ok = last.ok;
      var conn = null; try { conn = sim.connect(from, hostn, port); } catch (e) { /* ignore */ }
      $('proNetOut').innerHTML = '<div class="pro-track" aria-hidden="true"><span class="pk-n">' + esc(from.metadata.name) + '</span>' + steps.map(function (s, i) { return '<i style="--d:' + (i * 380 + 150) + 'ms" class="' + (s.ok ? 'ok' : 'no') + '">' + (s.ok ? '●' : '✕') + '</i><u style="--d:' + (i * 380) + 'ms"></u>'; }).join('') + '<span class="pk-n">' + esc(hostn) + '</span><b class="pk-dot' + (ok ? '' : ' stop') + '" style="--n:' + steps.length + '"></b></div>' +
        '<ol class="pro-hops">' + steps.map(function (s, i) { return '<li class="' + (s.ok ? 'ok' : 'no') + '" style="--d:' + (i * 380 + 150) + 'ms"><span>' + (s.ok ? '✓' : '✗') + '</span><div><b>' + esc(s.t) + '</b><p>' + esc(s.d) + '</p>' + (s.fix ? '<small>Next: ' + esc(s.fix) + '</small>' + (s.cmd ? ' <button type="button" class="btn-secondary" data-cmd="' + esc(s.cmd) + '">Put in terminal</button>' : '') : '') + '</div></li>'; }).join('') + '</ol>' +
        '<p class="pro-v ' + (ok ? 'ok' : 'bad') + '">' + (ok ? 'Connection works.' : 'Blocked at: <b>' + esc(last.t) + '</b>.') + (conn ? ' <code>' + esc(conn.curl.split('\n')[0]).slice(0, 80) + '</code>' : '') + '</p>';
      $('proNetOut').querySelectorAll('[data-cmd]').forEach(function (b) { b.onclick = function () { insertCmd(b.dataset.cmd); }; });
    }
    $('proNetGo').onclick = go; $('proNetTo').onkeydown = function (e) { if (e.key === 'Enter') go(); }; go();
  }
  KL.proExplain = { sched: explainSched, trace: trace };

  // ───────── explain drawer ─────────
  var tab = 'sched';
  function pending(r) { try { return userPods(r.sim).filter(function (p) { return /^Pending$/.test(r.sim.podStatus(p)) && !p.spec.nodeName; }); } catch (e) { return []; } }
  function paintDrawer(d) {
    var r = R(); if (!r) return; var pods = userPods(r.sim), pend = pending(r);
    var h = '<div class="pro-dh"><b>🧭 Explain</b><button type="button" id="proExX" aria-label="Close">✕</button></div><div class="pro-tabs" role="tablist"><button role="tab" data-tab="sched" class="' + (tab === 'sched' ? 'on' : '') + '">Why is it Pending?</button><button role="tab" data-tab="net" class="' + (tab === 'net' ? 'on' : '') + '">Can A reach B?</button></div><div id="proExBody"></div>';
    d.innerHTML = h; $('proExX').onclick = function () { d.remove(); };
    d.querySelectorAll('.pro-tabs button').forEach(function (b) { b.onclick = function () { tab = b.dataset.tab; paintDrawer(d); }; });
    var body = $('proExBody');
    if (tab === 'net') { renderNet(body, r); return; }
    if (!pods.length) { body.innerHTML = '<p class="pro-note">There are no pods yet. Create one, then come back to see how the scheduler picks a node.</p>'; return; }
    var sel = r.schedSel && pods.some(function (p) { return p.metadata.namespace + '/' + p.metadata.name === r.schedSel; }) ? r.schedSel : (pend[0] || pods[0]).metadata.namespace + '/' + (pend[0] || pods[0]).metadata.name;
    body.innerHTML = '<div class="pro-netf"><label>Pod<select id="proSchedPod">' + pods.map(function (p) { var k = p.metadata.namespace + '/' + p.metadata.name, pp = pend.indexOf(p) >= 0; return '<option value="' + esc(k) + '"' + (k === sel ? ' selected' : '') + '>' + (pp ? '⏳ ' : '') + esc(k) + '</option>'; }).join('') + '</select></label></div><div id="proSchedOut"></div>';
    function go() { r.schedSel = $('proSchedPod').value; var p = r.schedSel.split('/'), pod = r.sim.get('Pod', p[0], p[1]); if (pod) renderSched($('proSchedOut'), r, pod); }
    $('proSchedPod').onchange = go; go();
  }
  function openExplain(which) { var ex = $('proEx'); if (ex && !which) { ex.remove(); return; } if (which) tab = which; var d = ex || document.createElement('aside'); if (!ex) { d.id = 'proEx'; d.className = 'pro-drawer wide'; d.setAttribute('aria-label', 'Explain'); $('labRunner').appendChild(d); d.onkeydown = function (e) { if (e.key === 'Escape') d.remove(); }; } paintDrawer(d); }
  KL.openExplain = openExplain;
  function badge() { var r = R(), b = $('proExBtn'); if (!r || !b) return; var n = pending(r).length; b.classList.toggle('pulse', n > 0); var c = b.querySelector('.pro-badge'); if (c) { c.textContent = String(n); c.hidden = !n; } }

  // ───────── alert-first pager ─────────
  function sparkPath(vals, w, h) { var n = vals.length; if (n < 2) return ''; return vals.map(function (v, i) { return (i ? 'L' : 'M') + (i / (n - 1) * w).toFixed(1) + ' ' + (h - v / 100 * h).toFixed(1); }).join(' '); }
  function seeded(str) { var h = 2166136261 >>> 0, i; for (i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return function () { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; }; }
  function symptoms(sim) {
    var out = [], pods = userPods(sim), total = 0, ready = 0, bad = {};
    pods.forEach(function (p) { var st = sim.podStatus(p); if (/Completed|Succeeded/.test(st)) return; total++; if (sim.podReady(p) && p.status.phase === 'Running' && !p.metadata.deletionTimestamp) ready++; else if (!/Terminating/.test(st)) (bad[st] = bad[st] || []).push(p); });
    Object.keys(bad).forEach(function (st) {
      var name = /CrashLoop|Error|OOM|RunContainerError|CreateContainer/.test(st) ? 'KubePodCrashLooping' : /ImagePull|ErrImage|InvalidImage/.test(st) ? 'KubeContainerImagePullFailing' : /Pending/.test(st) ? 'KubePodNotScheduled' : /ContainerCreating|PodInit/.test(st) ? 'KubePodStuckCreating' : 'KubePodNotReady';
      out.push({ name: name, sev: /Crash|ImagePull/.test(name) ? 'critical' : 'warning', lab: bad[st][0].metadata.namespace + '/' + bad[st][0].metadata.name + (bad[st].length > 1 ? ' +' + (bad[st].length - 1) : ''), st: st, pod: bad[st][0] });
    });
    sim.list('Service').filter(function (x) { return !/^kube-/.test(x.metadata.namespace) && x.spec.selector && Object.keys(x.spec.selector).length; }).forEach(function (x) {
      var eps = 0; try { eps = sim.endpointsFor(x).length; } catch (e) { /* ignore */ }
      if (!eps) out.push({ name: 'ServiceNoEndpoints', sev: 'critical', lab: x.metadata.namespace + '/' + x.metadata.name, st: '0 ready endpoints' });
    });
    return { alerts: out, total: total, ready: ready };
  }
  function lastLogs(sim, sy) {
    var lines = [];
    try {
      var p = sy.alerts.filter(function (a) { return a.pod; })[0];
      if (p) { var x = sim.exec('kubectl logs ' + p.pod.metadata.name + ' -n ' + p.pod.metadata.namespace + ' --tail=4 2>&1'); (x.stdout + x.stderr).split('\n').filter(Boolean).slice(-4).forEach(function (l) { lines.push({ s: p.pod.metadata.name, l: l, w: /error|fail|fatal|panic|denied|refused/i.test(l) }); }); }
      sim.events.filter(function (e) { return e.type === 'Warning' && !/^kube-/.test(e.ns || ''); }).slice(-3).forEach(function (e) { lines.push({ s: 'event', l: e.reason + ': ' + e.msg, w: true }); });
    } catch (e) { /* ignore */ }
    return lines.slice(-7);
  }
  var pager = null;
  function mmss(s) { s = Math.max(0, Math.floor(s)); return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + s % 60).slice(-2); }
  function buildPager() {
    var r = R(); if (!r) return; var lab = r.lab, left = document.querySelector('.lr-left'); if (!left) return; var have = left.querySelector('.pager'); if (have) { if (!pager || pager.el !== have) pager = { el: have, id: lab.id, t0: r.pgT0 || (r.pgT0 = Date.now()), series: r.pgSeries || (r.pgSeries = []), rnd: seeded(lab.id + 'pg'), ack: r.pgAck || 0, res: r.pgRes || 0 }; return; }
    var fault = lab.incident || (KL.predictable && KL.predictable(lab)); if (!fault || !learn(r)) return;
    var el = document.createElement('section'); el.className = 'pager'; el.setAttribute('aria-label', 'Alert');
    var story = left.querySelector('.lr-story');
    if (lab.incident && story) { var det = document.createElement('details'); det.className = 'pager-story'; det.innerHTML = '<summary>Background story (read after you have looked at the alert)</summary>'; story.parentNode.insertBefore(det, story); det.appendChild(story); det.parentNode.insertBefore(el, det); }
    else if (story) story.parentNode.insertBefore(el, story.nextSibling); else left.insertBefore(el, left.firstChild);
    pager = { el: el, id: lab.id, t0: r.pgT0 || (r.pgT0 = Date.now()), series: r.pgSeries || (r.pgSeries = []), rnd: seeded(lab.id + 'pg'), ack: r.pgAck || 0, res: r.pgRes || 0 };
    paintPager();
  }
  function paintPager() {
    var r = R(); if (!r || !pager || pager.id !== r.lab.id || !pager.el.isConnected) return; var sim = r.sim, sy = symptoms(sim), allOk = r.lab.tasks.every(function (t) { return r.tasksOk[t.id]; });
    var firing = sy.alerts.length > 0 && !allOk, frac = sy.total ? 1 - sy.ready / sy.total : 0, last = pager.series.length ? pager.series[pager.series.length - 1] : 3;
    var target = firing ? Math.max(18, Math.min(96, frac * 100 + (sy.alerts.some(function (a) { return a.name === 'ServiceNoEndpoints'; }) ? 45 : 8))) : 1.2; var v = last + (target - last) * 0.35 + (pager.rnd() - 0.5) * (firing ? 7 : 0.6); v = Math.max(0, Math.min(100, v)); pager.series.push(v); if (pager.series.length > 60) pager.series.shift();
    if (!firing && sy.alerts.length === 0 && !pager.res && pager.series.length > 3) pager.res = r.pgRes = Date.now() - 0;
    if (firing) pager.res = r.pgRes = 0;
    var el = (pager.res || Date.now()) - pager.t0, avail = sy.total ? Math.round(sy.ready / sy.total * 100) : 100;
    var logs = lastLogs(sim, sy), sev = firing ? (sy.alerts.some(function (a) { return a.sev === 'critical'; }) ? 'critical' : 'warning') : 'ok';
    var h = '<div class="pg-h ' + sev + '"><span class="pg-st">' + (firing ? '🔥 FIRING' : '✅ RESOLVED') + '</span><b>' + (firing ? sy.alerts.length + ' alert' + (sy.alerts.length > 1 ? 's' : '') : 'All alerts cleared') + '</b><span class="pg-clk" title="' + (pager.res ? 'Time to resolve' : 'Firing for') + '">' + mmss(el / 1000) + '</span></div>';
    h += '<div class="pg-grid"><div class="pg-chart"><div class="pg-ct">HTTP 5xx rate <em>' + Math.round(v) + '%</em></div><svg viewBox="0 0 240 64" preserveAspectRatio="none" role="img" aria-label="5xx error rate over time"><path class="pg-fill" d="' + (pager.series.length > 1 ? sparkPath(pager.series, 240, 64) + ' L240 64 L0 64 Z' : 'M0 64') + '"/><path class="pg-line ' + (firing ? 'bad' : 'ok') + '" d="' + (sparkPath(pager.series, 240, 64) || 'M0 64') + '"/></svg></div>' +
      '<div class="pg-tiles"><div><b class="' + (avail < 100 ? 'bad' : 'ok') + '">' + avail + '%</b><span>availability</span></div><div><b>' + sy.ready + '/' + sy.total + '</b><span>pods ready</span></div></div></div>';
    h += '<ul class="pg-al">' + (sy.alerts.length ? sy.alerts.slice(0, 4).map(function (a) { return '<li class="' + a.sev + '"><b>' + a.name + '</b><code>' + esc(a.lab) + '</code><em>' + esc(a.st) + '</em></li>'; }).join('') : '<li class="ok"><b>No active alerts</b><code>' + esc(r.lab.ns) + '</code></li>') + '</ul>';
    h += '<div class="pg-logs" aria-label="Recent logs and events">' + (logs.length ? logs.map(function (l) { return '<div class="' + (l.w ? 'w' : '') + '"><i>' + esc(String(l.s).slice(0, 18)) + '</i>' + esc(l.l.slice(0, 120)) + '</div>'; }).join('') : '<div><i>—</i>quiet</div>') + '</div>';
    h += '<div class="pg-act">' + (pager.ack ? '<span class="pg-ack">Acknowledged · time to acknowledge ' + mmss((pager.ack - pager.t0) / 1000) + '</span>' : (firing ? '<button type="button" class="btn-secondary" id="pgAck">Acknowledge page</button>' : '')) + '<span class="pg-note">Look at the alert, the graph and the logs first. Then form a hypothesis.</span></div>';
    pager.el.innerHTML = h; pager.el.className = 'pager ' + sev;
    var a = $('pgAck'); if (a) a.onclick = function () { pager.ack = r.pgAck = Date.now(); paintPager(); };
  }
  setInterval(function () { try { paintPager(); badge(); } catch (e) { /* ignore */ } }, 2000);

  function install() {
    var r = R(); if (!r) return; var bar = document.querySelector('.lr-bar'); if (!bar) return;
    if (!learn(r)) { var ee = $('proExBtn'); if (ee) ee.remove(); return; }
    if (!bar.querySelector('#proExBtn')) { var b = document.createElement('button'); b.type = 'button'; b.id = 'proExBtn'; b.className = 'btn-secondary'; b.title = 'Why is a pod Pending? Can A reach B?'; b.innerHTML = '🧭 Explain <span class="pro-badge" hidden>0</span>'; var t = bar.querySelector('.pro-tools'); if (t) t.appendChild(b); else bar.insertBefore(b, $('lrDocsBtn') || null); b.onclick = function () { openExplain(); }; }
    buildPager(); badge();
  }
  window.addEventListener('kl:runner', function () { setTimeout(install, 30); });
  window.addEventListener('kl:cmd', function () { setTimeout(function () { paintPager(); badge(); var ex = $('proEx'); if (ex && tab === 'sched') { /* keep the open view fresh */ var s = $('proSchedPod'); if (s && s.onchange) s.onchange(); } }, 20); });
})();
