/* Real-world failure modelling: finalizers & Terminating namespaces, NotReady nodes (kubelet / swap), dead admission webhooks,
   DNS that depends on CoreDNS, and expired control-plane certificates. Reached through lab `flags`. */
(function (root) {
  'use strict';
  var Sim = root.KL && root.KL.Sim || require('./sim.js'), P = Sim.prototype, KErr = Sim.KErr;
  Sim.nodeReady = function (n) { var c = ((n.status && n.status.conditions) || []).filter(function (x) { return x.type === 'Ready'; })[0]; return !c || c.status === 'True'; };
  function flags(s) { return s.flags || (s.flags = {}); }
  function down(s, node) { var f = flags(s); return !!(f.kubeletDown && f.kubeletDown[node]); }

  // ── finalizers + namespace termination ──
  var origRemove = P.remove;
  P.remove = function (o, noCascade) {
    if (this._real) return origRemove.call(this, o, noCascade);
    var self = this, fin = (o.metadata.finalizers || []).length;
    if (o.kind === 'Namespace') {
      if (!o.metadata.deletionTimestamp) {
        o.metadata.deletionTimestamp = this.t; o.status = { phase: 'Terminating' };
        Object.keys(this.objs).forEach(function (k) { var x = self.objs[k]; if (x && x.kind !== 'Namespace' && x.metadata.namespace === o.metadata.name) self.remove(x); });
        this.changed(); this.faultPass();
      }
      return;
    }
    if (fin) { if (!o.metadata.deletionTimestamp) { o.metadata.deletionTimestamp = this.t; this.changed(); } return; }
    return origRemove.call(this, o, noCascade);
  };
  function realRemove(s, o) { s._real = true; try { origRemove.call(s, o, false); } finally { s._real = false; } }
  P.faultPass = function () {
    var self = this;
    // objects whose finalizers were cleared go away (pods have their own path)
    Object.keys(this.objs).forEach(function (k) {
      var o = self.objs[k]; if (!o || !o.metadata.deletionTimestamp || o.kind === 'Pod' || o.kind === 'Namespace') return;
      if (!(o.metadata.finalizers || []).length) realRemove(self, o);
    });
    // namespaces: finish once empty, otherwise report what is holding them
    this.list('Namespace').forEach(function (ns) {
      if (!ns.metadata.deletionTimestamp) return;
      var left = Object.keys(self.objs).map(function (k) { return self.objs[k]; }).filter(function (x) { return x && x.kind !== 'Namespace' && x.metadata.namespace === ns.metadata.name; });
      left.filter(function (x) { return !x.metadata.deletionTimestamp; }).forEach(function (x) { self.remove(x); });
      left = left.filter(function (x) { return self.objs[self.key(x.kind, x.metadata.namespace, x.metadata.name)]; });
      if (!left.length) { realRemove(self, ns); return; }
      var kinds = {}, fins = {}; left.forEach(function (x) { var d = self.kindOf(x), pl = d ? d.plural : x.kind; kinds[pl] = (kinds[pl] || 0) + 1; (x.metadata.finalizers || []).forEach(function (f) { fins[f] = (fins[f] || 0) + 1; }); });
      var cond = [{ type: 'NamespaceContentRemaining', status: 'True', reason: 'SomeResourcesRemain', message: 'Some resources are remaining: ' + Object.keys(kinds).map(function (k) { return k + '. has ' + kinds[k] + ' resource instances'; }).join(', ') },
        { type: 'NamespaceFinalizersRemaining', status: Object.keys(fins).length ? 'True' : 'False', reason: Object.keys(fins).length ? 'SomeFinalizersRemain' : 'ContentHasNoFinalizers', message: Object.keys(fins).length ? 'Some content in the namespace has finalizers remaining: ' + Object.keys(fins).map(function (f) { return f + ' in ' + fins[f] + ' resource instances'; }).join(', ') : 'All content-preserving finalizers finished' }];
      if (JSON.stringify(ns.status.conditions) !== JSON.stringify(cond)) { ns.status.conditions = cond; self.changed(); }
    });
    // nodes: Ready condition + unreachable taint follow the kubelet
    this.list('Node').forEach(function (n) {
      var d = down(self, n.metadata.name), want = [{ type: 'Ready', status: d ? 'Unknown' : 'True', reason: d ? 'NodeStatusUnknown' : 'KubeletReady', message: d ? 'Kubelet stopped posting node status.' : 'kubelet is posting ready status' },
        { type: 'MemoryPressure', status: 'False', reason: 'KubeletHasSufficientMemory', message: 'kubelet has sufficient memory available' }, { type: 'DiskPressure', status: 'False', reason: 'KubeletHasNoDiskPressure', message: 'kubelet has no disk pressure' }, { type: 'PIDPressure', status: 'False', reason: 'KubeletHasSufficientPID', message: 'kubelet has sufficient PID available' }];
      n.status = n.status || {}; var cur = JSON.stringify(n.status.conditions);
      if (cur !== JSON.stringify(want)) { n.status.conditions = want; self.changed(); }
      var tk = 'node.kubernetes.io/unreachable', ts = n.spec.taints || [], has = ts.some(function (t) { return t.key === tk; });
      if (d && !has) { n.spec.taints = ts.concat([{ key: tk, effect: 'NoSchedule' }]); self.changed(); }
      if (!d && has) { n.spec.taints = ts.filter(function (t) { return t.key !== tk; }); self.changed(); }
    });
  };
  var origReconcile = P.reconcile;
  P.reconcile = function () { var r = origReconcile.apply(this, arguments); this.faultPass(); return r; };

  // ── admission webhooks (validating, pods CREATE): a dead backend + failurePolicy Fail blocks pod creation ──
  function selOk(sel, labels) { var ml = sel.matchLabels || {}; for (var k in ml) if ((labels || {})[k] !== ml[k]) return false; return (sel.matchExpressions || []).every(function (e) { var v = (labels || {})[e.key]; return e.operator === 'In' ? (e.values || []).indexOf(v) >= 0 : e.operator === 'NotIn' ? (e.values || []).indexOf(v) < 0 : e.operator === 'Exists' ? v !== undefined : e.operator === 'DoesNotExist' ? v === undefined : true; }); }
  P.webhookGate = function (o) {
    var ns = o.metadata.namespace; if (/^kube-/.test(ns)) return; var nso = this.get('Namespace', '', ns), self = this;
    this.list('ValidatingWebhookConfiguration').forEach(function (cfg) {
      (cfg.webhooks || []).forEach(function (w) {
        var hit = (w.rules || []).some(function (r) { return (r.resources || []).some(function (x) { return x === 'pods' || x === '*'; }) && (r.operations || []).some(function (op) { return op === 'CREATE' || op === '*'; }); });
        if (!hit) return; if (w.namespaceSelector && nso && !selOk(w.namespaceSelector, nso.metadata.labels)) return;
        var ref = w.clientConfig && w.clientConfig.service; if (!ref) return;
        var svc = self.get('Service', ref.namespace, ref.name), eps = svc ? self.endpointsFor(svc).length : 0;
        if (eps > 0 || w.failurePolicy === 'Ignore') return;
        throw new KErr('Internal error occurred: failed calling webhook "' + w.name + '": failed to call webhook: Post "https://' + ref.name + '.' + ref.namespace + '.svc:' + (ref.port || 443) + (ref.path || '/validate') + '?timeout=' + (w.timeoutSeconds || 10) + 's": ' + (svc ? 'no endpoints available for service "' + ref.name + '"' : 'service "' + ref.name + '" not found'));
      });
    });
  };
  var origAdmit = P.admitPod; P.admitPod = function (o) { this.webhookGate(o); return origAdmit.apply(this, arguments); };

  // ── DNS needs CoreDNS ──
  P.dnsUp = function () { var svc = this.get('Service', 'kube-system', 'kube-dns'); return !svc || this.endpointsFor(svc).length > 0; };
  var origResolve = P.resolveTarget;
  P.resolveTarget = function (fromPod, host, port) {
    if (fromPod && !/^\d+\.\d+\.\d+\.\d+$/.test(String(host).replace(/\.$/, '')) && !this.dnsUp()) return { dns: false, msg: "bad address '" + host + "'" };
    return origResolve.apply(this, arguments);
  };

  // ── expired control-plane certificates: kubectl is dead until renewed + restarted ──
  var origRun = P.runCmd;
  P.runCmd = function (w) {
    var c = w && w[0]; if ((c === 'kubectl' || c === 'k') && flags(this).certExpired) return { stdout: '', stderr: 'Unable to connect to the server: tls: failed to verify certificate: x509: certificate has expired or is not yet valid: current time 2026-11-11T09:30:00Z is after 2026-11-04T08:12:41Z\n', code: 1 };
    return origRun.apply(this, arguments);
  };

  // ── ssh <node> '<command>' (single commands only) ──
  P.ssh = function (a) {
    var node = String(a[0] || '').replace(/^.*@/, ''), cmd = a.slice(1).join(' ').replace(/^(['"])(.*)\1$/, '$2').trim(), f = flags(this);
    function out(s, c) { return { stdout: s, stderr: '', code: c || 0 }; } function err(s, c) { return { stdout: '', stderr: s, code: c || 1 }; }
    if (!this.get('Node', '', node)) return err('ssh: Could not resolve hostname ' + node + ': Name or service not known\n', 255);
    if (!cmd) return err('ssh: interactive sessions are not available in the simulator — pass one command, e.g.  ssh ' + node + ' "sudo systemctl status kubelet"\n');
    var c = cmd.replace(/^sudo\s+/, ''), isDown = down(this, node), swap = !!(f.swapOn && f.swapOn[node]), cp = /^cp/.test(node), m;
    if ((m = c.match(/^systemctl\s+(status|restart|start|stop)\s+kubelet$/))) {
      if (m[1] === 'status') return out('● kubelet.service - kubelet: The Kubernetes Node Agent\n     Loaded: loaded (/lib/systemd/system/kubelet.service; enabled; preset: enabled)\n     Active: ' + (!isDown ? 'active (running) since Tue 2026-11-10 08:02:11 UTC; 1 day ago' : swap ? 'activating (auto-restart) (Result: exit-code) since Wed 2026-11-11 09:12:41 UTC; 3s ago' : 'inactive (dead) since Wed 2026-11-11 08:58:02 UTC; 31min ago') + '\n', isDown ? 3 : 0);
      if (m[1] === 'stop') { f.kubeletDown = f.kubeletDown || {}; f.kubeletDown[node] = true; return out(''); }
      if (swap) return out('');            // fails again straight away: see journalctl
      if (f.kubeletDown) delete f.kubeletDown[node];
      if (cp && f.certsRenewed) f.certExpired = false;
      return out('');
    }
    if ((m = c.match(/^journalctl\s+-u\s+kubelet/))) {
      var base = 'Nov 11 09:12:3' + '9 ' + node + ' systemd[1]: ';
      return out(swap ? base + 'Started kubelet: The Kubernetes Node Agent.\n' + 'Nov 11 09:12:41 ' + node + ' kubelet[4121]: E1111 09:12:41.201355    4121 run.go:72] "command failed" err="failed to run Kubelet: running with swap on is not supported, please disable swap or set --fail-swap-on=false"\n' + 'Nov 11 09:12:41 ' + node + ' systemd[1]: kubelet.service: Main process exited, code=exited, status=1/FAILURE\n' + 'Nov 11 09:12:41 ' + node + ' systemd[1]: kubelet.service: Failed with result \'exit-code\'.\n'
        : isDown ? 'Nov 11 08:58:02 ' + node + ' systemd[1]: Stopping kubelet: The Kubernetes Node Agent...\nNov 11 08:58:02 ' + node + ' systemd[1]: kubelet.service: Deactivated successfully.\nNov 11 08:58:02 ' + node + ' systemd[1]: Stopped kubelet: The Kubernetes Node Agent.\n' : 'Nov 11 09:30:00 ' + node + ' kubelet[812]: I1111 09:30:00.001 kubelet.go:2431] "SyncLoop (housekeeping)"\n');
    }
    if (c === 'swapoff -a') { if (f.swapOn) delete f.swapOn[node]; return out(''); }
    if (/^(free(\s+-[mh])?|swapon\s+--show)$/.test(c)) return out(c.indexOf('swapon') === 0 ? (swap ? 'NAME      TYPE SIZE USED PRIO\n/swapfile file   2G   0B   -2\n' : '') : '               total        used        free      shared  buff/cache   available\nMem:            7936        2113        3320          12        2502        5575\nSwap:           ' + (swap ? '2047' : '0') + '           0        ' + (swap ? '2047' : '0') + '\n');
    if (c === 'hostname') return out(node + '\n');
    if (/^uptime/.test(c)) return out(' 09:31:12 up 12 days,  3:41,  1 user,  load average: 0.21, 0.30, 0.28\n');
    if (/^df(\s+-h)?$/.test(c)) return out('Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        58G   21G   35G  38% /\n');
    if ((m = c.match(/^kubeadm\s+certs\s+(check-expiration|renew\s+all)$/))) {
      if (!cp) return err('bash: kubeadm: command not found\n', 127);
      var bad = !!f.certExpired && !f.certsRenewed;
      if (m[1] === 'check-expiration') { var row = function (n) { return n.padEnd(26) + (bad ? 'Nov 04, 2026 08:12 UTC   <invalid>' : 'Nov 11, 2027 09:31 UTC   364d').padEnd(36) + (bad ? 'ca        ' : 'ca        ') + 'no\n'; }; return out('[check-expiration] Reading configuration from the "kubeadm-config" ConfigMap in namespace "kube-system"...\n\nCERTIFICATE                EXPIRES                  RESIDUAL TIME   CERTIFICATE AUTHORITY   EXTERNALLY MANAGED\n' + ['admin.conf', 'apiserver', 'apiserver-etcd-client', 'apiserver-kubelet-client', 'controller-manager.conf', 'etcd-healthcheck-client', 'etcd-peer', 'etcd-server', 'front-proxy-client', 'scheduler.conf'].map(function (n) { return n.padEnd(27) + (bad ? 'Nov 04, 2026 08:12 UTC   <invalid>       ' : 'Nov 11, 2027 09:31 UTC   364d            ') + 'ca                      no\n'; }).join('') + '\n' + (bad ? '!MISSING! one or more certificates have expired\n' : ''));
      }
      f.certsRenewed = true; return out('certificate embedded in the kubeconfig file for the admin to use and for kubeadm itself renewed\ncertificate for serving the Kubernetes API renewed\ncertificate for the API server to connect to kubelet renewed\ncertificate embedded in the kubeconfig file for the controller manager to use renewed\ncertificate for liveness probes to healthcheck etcd renewed\ncertificate for the front proxy client renewed\ncertificate embedded in the kubeconfig file for the scheduler manager to use renewed\n\nDone renewing certificates. You must restart the kube-apiserver, kube-controller-manager, kube-scheduler and etcd, so that they can use the new certificates.\n');
    }
    return err('bash: ' + c.split(/\s+/)[0] + ': command not found\n', 127);
  };
})(typeof window !== 'undefined' ? window : globalThis);
