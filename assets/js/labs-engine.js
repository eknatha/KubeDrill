/* KubeLab labs engine — declarative lab specs, auto-check against the simulator,
   and generation of equivalent bash (setup.sh / check.sh / reset.sh) for real kind clusters.
   One assertion DSL → two backends (JS for the simulator, bash for kubectl). */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {};
  var Labs = KL.Labs = { list: [], byId: {} };

  Labs.register = function (arr) { arr.forEach(function (l) { if (!Labs.byId[l.id]) { Labs.list.push(l); Labs.byId[l.id] = l; } }); };

  // ── simulator backend ──
  Labs.setup = function (sim, lab) {
    var ns = lab.ns;
    (lab.setupNs || [ns]).forEach(function (n) { if (!sim.get('Namespace', '', n)) sim.createRaw({ apiVersion: 'v1', kind: 'Namespace', metadata: { name: n } }); });
    var prev = sim.ctxNs;
    (lab.setup || []).forEach(function (txt) { var r = sim.exec('kubectl apply -f - <<EOF\n' + txt + '\nEOF'); if (r.code) throw new Error('lab ' + lab.id + ' setup failed: ' + r.stderr); });
    (lab.setupCmds || []).forEach(function (c) { var r = sim.exec(c); if (r.code) throw new Error('lab ' + lab.id + ' setup cmd failed: ' + c + ' → ' + r.stderr); });
    (lab.files || []).forEach(function (f) { sim.writeFile(f.path, f.content); });
    if (lab.flags) { sim.flags = JSON.parse(JSON.stringify(lab.flags)); }
    sim.ctxNs = lab.keepCtx ? prev : ns;
    sim.settle(lab.settle || 8);
  };

  function ref(sim, a) { var p = String(a.ref).split('/'); return sim.get(p[0], a.ns, p[1]); }
  function pathVal(sim, o, path) { var v = sim.jsonpathVals(sim.exportObj(o), String(path).replace(/^\./, '')); return v.join(' '); }

  Labs.evalAssert = function (sim, a) {
    sim.fastForward && sim.fastForward();
    var o, v, n;
    switch (a.t) {
      case 'exists': return { ok: !!ref(sim, a), msg: a.ref + ' should exist in ' + a.ns };
      case 'absent': return { ok: !ref(sim, a), msg: a.ref + ' should not exist in ' + a.ns };
      case 'jp': o = ref(sim, a); if (!o) return { ok: false, msg: a.ref + ' not found in ' + a.ns };
        v = pathVal(sim, o, a.path);
        if (a.eq !== undefined) return { ok: v === String(a.eq), msg: a.ref + ' ' + a.path + ' should be "' + a.eq + '" (is "' + v + '")' };
        if (a.has !== undefined) return { ok: v.indexOf(a.has) >= 0, msg: a.ref + ' ' + a.path + ' should contain "' + a.has + '" (is "' + v + '")' };
        if (a.ne !== undefined) return { ok: v !== String(a.ne) && v !== '', msg: a.ref + ' ' + a.path + ' should not be "' + a.ne + '"' };
        return { ok: v !== '', msg: a.ref + ' ' + a.path + ' should be set' };
      case 'podsReady': n = sim.list('Pod', a.ns, a.sel || null).filter(function (p) { return sim.podReady(p) && p.status.phase === 'Running'; }).length;
        return { ok: n >= (a.min || 1) && (a.max === undefined || n <= a.max), msg: 'need ≥' + (a.min || 1) + ' Ready pods' + (a.sel ? ' with ' + a.sel : '') + ' in ' + a.ns + ' (have ' + n + ')' };
      case 'noNotReady': n = sim.list('Pod', a.ns, a.sel || null).filter(function (p) { return !p.metadata.deletionTimestamp && p.status.phase !== 'Succeeded' && !sim.podReady(p); }); return { ok: n.length === 0, msg: 'all pods in ' + a.ns + ' should be Ready (' + n.map(function (p) { return p.metadata.name + ':' + sim.podStatus(p); }).slice(0, 3).join(', ') + ')' };
      case 'count': n = sim.list(a.kind, a.ns, a.sel || null).length; return { ok: n >= (a.min || 0) && (a.max === undefined || n <= a.max), msg: 'expected ' + (a.min || 0) + '–' + (a.max === undefined ? '∞' : a.max) + ' ' + a.kind + ' in ' + a.ns + ' (have ' + n + ')' };
      case 'endpoints': o = sim.get('Service', a.ns, a.svc); if (!o) return { ok: false, msg: 'service ' + a.svc + ' not found' }; n = sim.endpointsFor(o).length; return { ok: n >= (a.min || 1), msg: 'service ' + a.svc + ' should have ≥' + (a.min || 1) + ' endpoints (has ' + n + ')' };
      case 'canI': { var yes = sim.canI(a.as, a.verb, a.res, a.ns); return { ok: yes === (a.expect !== false), msg: a.as.split(':').pop() + ' ' + (a.expect === false ? 'must NOT be able to ' : 'should be able to ') + a.verb + ' ' + a.res }; }
      case 'curl': { var from = sim.get('Pod', a.ns, a.from); if (!from || from.status.phase !== 'Running') return { ok: false, msg: 'client pod ' + a.from + ' is not running' }; var hp = String(a.to).split(':'), r = sim.connect(from, hp[0], parseInt(hp[1] || '80', 10)); return { ok: (r.code === 0) === (a.ok !== false), msg: a.from + ' → ' + a.to + (a.ok === false ? ' should be BLOCKED' : ' should succeed') }; }
      case 'qty': { o = ref(sim, a); if (!o) return { ok: false, msg: a.ref + ' not found in ' + a.ns }; v = pathVal(sim, o, a.path); var q0 = String(v), nq; if (a.kind === 'cpu') nq = /m$/.test(q0) ? parseFloat(q0) : parseFloat(q0) * 1000; else if (a.kind === 'mem') { var mm = q0.match(/^([\d.]+)(Ki|Mi|Gi|K|M|G)?$/); nq = mm ? parseFloat(mm[1]) * ({ Ki: 1 / 1024, Mi: 1, Gi: 1024, K: 1000 / 1048576, M: 1000000 / 1048576, G: 1e9 / 1048576 }[mm[2]] || 1 / 1048576) : NaN; } else nq = parseFloat(q0); var okq = !isNaN(nq) && (a.min === undefined || nq >= a.min) && (a.max === undefined || nq <= a.max); return { ok: okq, msg: a.msg || (a.ref + ' ' + a.path + ' should be ' + (a.min !== undefined ? '≥ ' + a.min : '') + (a.max !== undefined ? ' ≤ ' + a.max : '') + (a.kind === 'cpu' ? ' millicores' : a.kind === 'mem' ? ' MiB' : '') + ' (is "' + v + '")') }; }
      case 'ctx': { var cx = (sim.flags && sim.flags.contexts) || [], hit = a.name ? cx.filter(function (c) { return c.name === a.name; })[0] : null; if (a.current !== undefined) return { ok: !!sim.flags && sim.flags.current === a.current, msg: 'current context should be ' + a.current + ' (is ' + ((sim.flags && sim.flags.current) || 'none') + ')' }; var cn = hit && hit.name === sim.flags.current ? sim.ctxNs : hit && hit.ns; return { ok: !!hit && (a.ns === undefined || cn === a.ns), msg: 'context ' + a.name + (hit ? ' should use namespace ' + a.ns + ' (is ' + cn + ')' : ' does not exist') }; }
      case 'fval': { var fv2 = sim.flags, ps = String(a.path).split('.'), qi; for (qi = 0; qi < ps.length && fv2 != null; qi++) fv2 = fv2[ps[qi]]; return { ok: String(fv2) === String(a.eq), msg: a.msg || (a.path + ' should be ' + a.eq + ' (now ' + fv2 + ')') }; }
      case 'flag': { var fv = sim.flags && sim.flags[a.k]; if (a.sub) fv = fv && fv[a.sub]; return { ok: !!fv === (a.v !== false), msg: a.msg || (a.k + (a.v === false ? ' should be cleared' : ' should be set')) }; }
      case 'nodeCordoned': o = sim.get('Node', '', a.node); return { ok: !!o && !!o.spec.unschedulable === (a.v !== false), msg: 'node ' + a.node + (a.v === false ? ' should be schedulable' : ' should be cordoned') };
      case 'podsOffNode': n = sim.list('Pod', a.ns).filter(function (p) { return p.spec.nodeName === a.node && !p.metadata.deletionTimestamp && (p.metadata.ownerReferences || []).length; }).length; return { ok: n === 0, msg: 'no ' + a.ns + ' pods should run on ' + a.node + ' (' + n + ' left)' };
      case 'file': { var c = sim.readFile(a.path); return { ok: c !== null && (a.has === undefined || c.indexOf(a.has) >= 0), msg: 'file ' + a.path + ' should exist' + (a.has ? ' and contain "' + a.has + '"' : '') }; }
      case 'noQuotaErr': n = sim.list('ReplicaSet', a.ns).filter(function (r) { return sim.failedCreate && sim.failedCreate[r.metadata.uid]; }).length; return { ok: n === 0, msg: 'no ReplicaSet in ' + a.ns + ' should be failing admission' };
    }
    return { ok: false, msg: 'unknown assertion ' + a.t };
  };

  Labs.check = function (sim, lab) {
    sim.fastForward && sim.fastForward();
    var res = lab.tasks.map(function (t) {
      var rs = (t.assert || []).map(function (a) { try { return Labs.evalAssert(sim, a); } catch (e) { return { ok: false, msg: 'check error: ' + e.message }; } });
      return { id: t.id, ok: rs.every(function (r) { return r.ok; }), results: rs };
    });
    return { tasks: res, passed: res.filter(function (r) { return r.ok; }).length, total: res.length, ok: res.every(function (r) { return r.ok; }) };
  };

  // ── bash backend (real cluster) ──
  function q(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }
  Labs.bashAssert = function (a) {
    var ns = a.ns ? ' -n ' + a.ns : '';
    switch (a.t) {
      case 'exists': return 'kubectl get ' + a.ref + ns + ' >/dev/null 2>&1';
      case 'absent': return '! kubectl get ' + a.ref + ns + ' >/dev/null 2>&1';
      case 'jp': { var g = '"$(kubectl get ' + a.ref + ns + ' -o jsonpath=' + q('{' + a.path + '}') + ' 2>/dev/null)"'; if (a.eq !== undefined) return '[ ' + g + ' = ' + q(a.eq) + ' ]'; if (a.has !== undefined) return 'echo ' + g + ' | grep -q -- ' + q(a.has); if (a.ne !== undefined) return '[ -n ' + g + ' ] && [ ' + g + ' != ' + q(a.ne) + ' ]'; return '[ -n ' + g + ' ]'; }
      case 'podsReady': return '[ "$(kubectl get pods' + ns + (a.sel ? ' -l ' + a.sel : '') + ' -o jsonpath=' + q('{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\\n"}{end}') + ' 2>/dev/null | grep -c "Running true")" -ge ' + (a.min || 1) + ' ]' + (a.max !== undefined ? ' && [ "$(kubectl get pods' + ns + (a.sel ? ' -l ' + a.sel : '') + ' -o jsonpath=' + q('{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\\n"}{end}') + ' 2>/dev/null | grep -c "Running true")" -le ' + a.max + ' ]' : '');
      case 'noNotReady': return '! kubectl get pods' + ns + (a.sel ? ' -l ' + a.sel : '') + ' -o jsonpath=' + q('{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\\n"}{end}') + ' 2>/dev/null | grep -v "Succeeded" | grep -q -v "Running true"';
      case 'count': return '[ "$(kubectl get ' + a.kind + ns + (a.sel ? ' -l ' + a.sel : '') + ' --no-headers 2>/dev/null | wc -l)" -ge ' + (a.min || 0) + ' ]' + (a.max !== undefined ? ' && [ "$(kubectl get ' + a.kind + ns + (a.sel ? ' -l ' + a.sel : '') + ' --no-headers 2>/dev/null | wc -l)" -le ' + a.max + ' ]' : '');
      case 'endpoints': return '[ "$(kubectl get endpoints ' + a.svc + ns + ' -o jsonpath=' + q('{.subsets[*].addresses[*].ip}') + ' 2>/dev/null | wc -w)" -ge ' + (a.min || 1) + ' ]';
      case 'canI': return '[ "$(kubectl auth can-i ' + a.verb + ' ' + a.res + ' --as=' + a.as + ns + ' 2>/dev/null)" = ' + (a.expect === false ? 'no' : 'yes') + ' ]';
      case 'curl': return (a.ok === false ? '! ' : '') + 'kubectl exec' + ns + ' ' + a.from + ' -- wget -qO- -T 3 ' + a.to + ' >/dev/null 2>&1';
      case 'qty': case 'ctx': return 'true # (simulator-only check)'
      case 'fval': return 'true # (simulator-only check)'
      case 'flag': return 'true # (simulator-only check)'
      case 'nodeCordoned': return '[ "$(kubectl get node ' + a.node + ' -o jsonpath=' + q('{.spec.unschedulable}') + ' 2>/dev/null)" ' + (a.v === false ? '!=' : '=') + ' "true" ]';
      case 'podsOffNode': return '[ "$(kubectl get pods' + ns + ' --field-selector spec.nodeName=' + a.node + ' --no-headers 2>/dev/null | wc -l)" -eq 0 ]';
      case 'file': return '[ -f ' + q(a.path.replace(/^\/home\/student\//, '$HOME/')).replace(/'\$HOME/, '"$HOME').replace(/'$/, '"') + ' ]' + (a.has ? ' && grep -q -- ' + q(a.has) + ' ' + q(a.path.replace(/^\/home\/student\//, '')) : '');
      case 'noQuotaErr': return 'true';
    }
    return 'false';
  };
  Labs.genPack = function (lab) {
    var hdr = '#!/usr/bin/env bash\n# KubeLab lab pack: ' + lab.title + ' (' + lab.id + ')\n# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).\nset -uo pipefail\n';
    var ns = lab.ns, nsList = lab.setupNs || [ns];
    var setup = hdr + 'echo "▶ Setting up lab: ' + lab.title.replace(/"/g, '') + '"\n' + nsList.map(function (n) { return 'kubectl create namespace ' + n + ' --dry-run=client -o yaml | kubectl apply -f -'; }).join('\n') + '\n' +
      (lab.setup || []).map(function (y) { return "kubectl apply -f - <<'KUBELAB_EOF'\n" + y.replace(/^\n/, '') + "\nKUBELAB_EOF"; }).join('\n') + '\n' + (lab.setupCmds || []).join('\n') + '\n' +
      (lab.files || []).map(function (f) { var p = f.path.replace(/^\/home\/student\//, ''); var d = p.indexOf('/') > 0 ? 'mkdir -p ' + q(p.replace(/\/[^\/]*$/, '')) + '\n' : ''; return d + "cat > " + q(p) + " <<'KUBELAB_EOF'\n" + f.content + "\nKUBELAB_EOF"; }).join('\n') + '\n' +
      'kubectl config set-context --current --namespace=' + ns + ' >/dev/null\necho "✔ Ready. Namespace: ' + ns + '. Read README.md, fix the cluster, then run ./check.sh"\n';
    var check = hdr + 'pass=0; fail=0\nchk() { # $1=task title, rest = condition\n  local title="$1"; shift\n  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi\n}\nsleep 1\n' +
      lab.tasks.map(function (t) { return 'echo ' + q('Task ' + t.id + ': ' + t.title) + '\nchk ' + q(t.title) + ' ' + q((t.assert || []).map(Labs.bashAssert).join(' && ')); }).join('\n') +
      '\necho; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail\n';
    var reset = hdr + 'echo "Removing lab namespaces…"\n' + nsList.map(function (n) { return 'kubectl delete namespace ' + n + ' --ignore-not-found'; }).join('\n') + '\n' + (lab.cleanupCmds || []).join('\n') + '\n';
    var readme = '# ' + lab.title + '\n\n**Track:** ' + lab.track.join(', ') + ' · **Level:** ' + lab.diff + ' · **Time:** ' + lab.time + ' · **Namespace:** `' + ns + '`\n\n' + lab.story + '\n\n## Tasks\n\n' + lab.tasks.map(function (t, i) { return (i + 1) + '. **' + t.title + '** — ' + t.desc; }).join('\n') + '\n\n## Run\n\n```bash\n./setup.sh   # create the broken environment\n# ...fix it with kubectl...\n./check.sh   # grade your work\n./reset.sh   # remove everything\n```\n\n## Hints\n\n' + lab.tasks.map(function (t, i) { return '<details><summary>Task ' + (i + 1) + ' hints</summary>\n\n' + (t.hints || []).map(function (h, j) { return (j + 1) + '. ' + h; }).join('\n') + '\n</details>'; }).join('\n\n') + '\n\n<details><summary>Solution</summary>\n\n```bash\n' + lab.solution.join('\n') + '\n```\n</details>\n';
    return { 'setup.sh': setup, 'check.sh': check, 'reset.sh': reset, 'README.md': readme };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Labs;
})(typeof window !== 'undefined' ? window : globalThis);
