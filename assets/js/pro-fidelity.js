/* Fidelity: per-lab badge (Exact / Modelled / Scripted) and the #fidelity page that says what the simulator does and does not do. */
(function () {
  'use strict';
  var KL = window.KL, Labs = KL.Labs;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var TIERS = { exact: { label: 'Exact', tip: 'Behaves like real Kubernetes for the objects and commands this lab uses.' }, model: { label: 'Modelled', tip: 'Core behaviour is real, but part of it (network, metrics, runtime) is a faithful model, not the real thing.' }, script: { label: 'Scripted', tip: 'Part of this lab uses scripted tooling (ssh, kubeadm, scanners…) that follows the lab scenario, not a real implementation.' } };
  var SCRIPTED = [[/\bssh\b|systemctl|journalctl|crictl/, 'Node access (ssh, systemctl, journalctl, crictl) is a scripted shell'], [/kubeadm|etcdctl|openssl|\/etc\/kubernetes/, 'Control-plane tooling (kubeadm, etcdctl, certificates) follows scripted flows'], [/trivy/, 'Scanner output is canned for the lab images']];
  var MODELLED = [[/\bcurl\b|\bwget\b|nslookup|NetworkPolicy|netpol/i, 'Network is modelled (DNS, Services, policies), not real packets'], [/\btop\b|HorizontalPodAutoscaler|\bhpa\b/i, 'CPU and memory metrics are synthetic'], [/Gateway|HTTPRoute|Ingress/, 'No real data plane: routing objects are checked, not served'], [/PersistentVolume|StorageClass|\bpvc\b|\bpv\b/i, 'Volumes bind and expand as objects; no real disk'], [/seccomp|apparmor|securityContext|runAsNonRoot|readOnlyRootFilesystem/i, 'Security settings are validated as spec fields, not enforced by a runtime'], [/OOMKilled|oom|memory/i, 'Container memory behaviour is inferred from image and command'], [/probe|CrashLoop|logs/i, 'Container behaviour is inferred from image and command']];
  var cache = {};
  function fidelity(lab) {
    if (cache[lab.id]) return cache[lab.id];
    var txt = JSON.stringify([lab.setup, lab.setupCmds, lab.solution, lab.files, lab.tasks.map(function (t) { return t.assert; })]) + ' ' + lab.story, why = [], tier = 'exact';
    SCRIPTED.forEach(function (p) { if (p[0].test(txt)) { why.push(p[1]); tier = 'script'; } });
    if (tier !== 'script') MODELLED.forEach(function (p) { if (p[0].test(txt) && why.indexOf(p[1]) < 0) { why.push(p[1]); tier = 'model'; } });
    if (lab.simOnly && tier === 'exact') { tier = 'model'; why.push('Simulator-only scenario: a kind pack cannot reproduce it faithfully'); }
    return (cache[lab.id] = { tier: tier, why: why.slice(0, 3) });
  }
  KL.fid = {
    of: fidelity, TIERS: TIERS,
    badge: function (lab) { var f = fidelity(lab); return '<span class="fid fid-' + f.tier + '" title="' + esc(TIERS[f.tier].label + ': ' + TIERS[f.tier].tip) + '">' + TIERS[f.tier].label + '</span>'; }
  };
  var AREAS = [
    ['API objects and kubectl', 'exact', 'get, describe, apply, create, patch, scale, set, rollout, label, taint, drain, explain and more. Required fields are validated; unknown fields and removed apiVersions are not rejected.'],
    ['Controllers', 'model', 'Deployment, ReplicaSet, StatefulSet, DaemonSet, Job, CronJob, HPA, PDB reconcile on a simulated clock.'],
    ['Scheduler', 'model', 'Node name, cordon, selector and node affinity, taints and tolerations, requests, pod anti-affinity, topology spread; least-loaded scoring. No priority classes or preemption.'],
    ['Kubelet and containers', 'model', 'Pod lifecycle, probes, restarts, CrashLoopBackOff, OOMKilled. Container behaviour is inferred from the image and command; there are no real processes.'],
    ['Networking', 'model', 'DNS, Services and endpoints, NetworkPolicy ingress and egress, curl and wget from pods. No packets, CNI or kube-proxy modes. Ingress and Gateway objects are checked, not served.'],
    ['Storage', 'model', 'PV and PVC binding, StorageClass, WaitForFirstConsumer, reclaim policy, expansion flag. No real volumes or data.'],
    ['RBAC and admission', 'model', 'Roles, ClusterRoles, bindings, can-i, ResourceQuota, LimitRange, Pod Security labels. Aggregated roles and non-resource URLs may be incomplete.'],
    ['Metrics', 'script', 'kubectl top and HPA use synthetic load, so the numbers are plausible but not measured.'],
    ['Node and control-plane tasks', 'script', 'ssh, systemctl, journalctl, crictl, kubeadm, etcdctl and certificate checks follow scripted flows for the lab scenarios.'],
    ['Security tooling', 'script', 'Image scanner output is canned. Settings such as seccomp or AppArmor are accepted as spec fields but not enforced.'],
    ['Not modelled', 'no', 'CertificateSigningRequest, RuntimeClass, Lease, EndpointSlices, static pod directories, kubectl debug, Falco, audit policy files, real admission webhooks, real container runtime and real time.']
  ];
  var filt = { tier: 'all', q: '' };
  function render() {
    var root = $('fidRoot'); if (!root) return; var labs = Labs.list, n = { exact: 0, model: 0, script: 0 };
    labs.forEach(function (l) { n[fidelity(l).tier]++; });
    var shown = labs.filter(function (l) { var f = fidelity(l); return (filt.tier === 'all' || f.tier === filt.tier) && (!filt.q || (l.num + ' ' + l.title).toLowerCase().indexOf(filt.q) >= 0); });
    var h = '<div class="section-header"><div class="section-tag">Trust</div><h2 class="section-title">Simulator fidelity</h2><p class="section-desc">KubeDrill runs a Kubernetes simulator in your browser (modelled on ' + esc(KL.Sim.VERSION) + '). It is good for learning the model and building muscle memory, and it is not a real cluster. This page says exactly where it matches and where it does not.</p></div>';
    h += '<div class="fid-tiers">' + ['exact', 'model', 'script'].map(function (k) { return '<div class="fid-tier fid-' + k + '"><b>' + n[k] + '</b><span>' + TIERS[k].label + '</span><p>' + esc(TIERS[k].tip) + '</p></div>'; }).join('') + '</div>';
    h += '<h3 class="fid-h">What the simulator covers</h3><div class="fid-areas">' + AREAS.map(function (a) { var lab = { exact: 'Exact', model: 'Modelled', script: 'Scripted', no: 'Not modelled' }[a[1]]; return '<div class="fid-area"><span class="fid fid-' + a[1] + '">' + lab + '</span><div><b>' + esc(a[0]) + '</b><p>' + esc(a[2]) + '</p></div></div>'; }).join('') + '</div>';
    h += '<h3 class="fid-h">How every lab is tested</h3><p class="fid-p">Each of the ' + labs.length + ' labs is run twice by an automated test: it must <b>fail</b> in its broken state and <b>pass</b> after its reference solution, and the same result must survive saving and reloading a session. The tests check the end state of the cluster, as the real exam does.</p>';
    h += '<h3 class="fid-h">Fidelity of each lab</h3><div class="fid-ctl"><div class="filter-group" id="fidTier" role="group" aria-label="Filter by tier">' + [['all', 'All'], ['exact', 'Exact'], ['model', 'Modelled'], ['script', 'Scripted']].map(function (t) { return '<button type="button" class="filter-btn' + (filt.tier === t[0] ? ' active' : '') + '" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div><input id="fidQ" type="search" placeholder="Search labs…" aria-label="Search labs" value="' + esc(filt.q) + '"></div>';
    h += '<div class="fid-tw"><table class="fid-tab"><thead><tr><th>Lab</th><th>Fidelity</th><th>What is modelled or scripted</th></tr></thead><tbody>' + shown.map(function (l) { var f = fidelity(l); return '<tr><td><a href="#lab/' + l.id + '"><b>' + esc(l.num) + '</b> ' + esc(l.title) + '</a></td><td>' + KL.fid.badge(l) + '</td><td>' + (f.why.length ? f.why.map(esc).join('; ') : 'Nothing: behaves like real Kubernetes for these commands.') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    h += '<p class="fid-p">Found a place where real Kubernetes behaves differently? <a href="https://github.com/eknatha/KubeLab/issues/new" target="_blank" rel="noopener">Open an issue</a> with the command and what you expected. For exam practice, also run the kind lab packs on a real cluster.</p>';
    root.innerHTML = h;
    root.querySelectorAll('#fidTier button').forEach(function (b) { b.onclick = function () { filt.tier = b.dataset.v; render(); }; });
    var q = $('fidQ'); q.oninput = function () { filt.q = q.value.toLowerCase(); var pos = q.selectionStart; render(); var q2 = $('fidQ'); q2.focus(); q2.setSelectionRange(pos, pos); };
  }
  KL.route('fidelity', render);
  window.addEventListener('kl:runner', function () {
    setTimeout(function () { var r = KL.runner && KL.runner.cur(), chips = document.querySelector('.lr-chips'); if (!r || !chips || chips.querySelector('.fid')) return; var a = document.createElement('a'); a.href = '#fidelity'; a.className = 'fid-link'; a.innerHTML = KL.fid.badge(r.lab); a.title = 'How faithful is this lab? Click for details.'; chips.appendChild(a); }, 40);
  });
})();
