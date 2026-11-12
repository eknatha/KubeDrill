/* Failure model, part 2: PriorityClass + preemption, kubeconfig contexts, kubeadm upgrade/join/reset over ssh, disk & memory pressure. */
(function (root) {
  'use strict';
  var Sim = root.KL && root.KL.Sim || require('./sim.js'), P = Sim.prototype, KErr = Sim.KErr;
  function F(s) { return s.flags || (s.flags = {}); }
  function out(s, c) { return { stdout: s, stderr: '', code: c || 0 }; } function err(s, c) { return { stdout: '', stderr: s, code: c || 1 }; }
  function minor(v) { return parseInt(String(v).replace(/^v/, '').split('.')[1], 10); }
  function vnorm(v) { return 'v' + String(v).replace(/^v/, '').split('-')[0]; }

  // ── PriorityClass + preemption ──
  var admit0 = P.admitPod;
  P.admitPod = function (o) {
    var r = admit0.apply(this, arguments), s = o.spec, name = s.priorityClassName;
    if (name) { var pc = this.get('PriorityClass', '', name); if (!pc && !/^system-/.test(name)) throw new KErr('Error from server (Forbidden): pods "' + o.metadata.name + '" is forbidden: no PriorityClass with name ' + name + ' was found'); s.priority = pc ? (pc.value || 0) : (name === 'system-cluster-critical' ? 2000000000 : 2000001000); }
    else if (s.priority === undefined) { var d = this.list('PriorityClass').filter(function (x) { return x.globalDefault; })[0]; s.priority = d ? (d.value || 0) : 0; }
    return r;
  };
  var sched0 = P.schedule;
  P.schedule = function (pod) {
    var r = sched0.apply(this, arguments), self = this, pr = (pod.spec && pod.spec.priority) || 0;
    if (!r.fail || !/Insufficient/.test(r.fail) || pr <= 0) return r;
    var victims = this.list('Pod').filter(function (p) { return p !== pod && p.spec.nodeName && (p.spec.priority || 0) < pr && p.status.phase !== 'Failed' && p.status.phase !== 'Succeeded' && !/^kube-/.test(p.metadata.namespace); }).sort(function (a, b) { return (a.spec.priority || 0) - (b.spec.priority || 0); });
    var nodes = this.list('Node').map(function (n) { return n.metadata.name; });
    for (var i = 0; i < nodes.length; i++) {
      var nm = nodes[i], on = victims.filter(function (v) { return v.spec.nodeName === nm; }), taken = [], saved = [];
      for (var j = 0; j < on.length; j++) {
        taken.push(on[j]); saved.push(on[j].status.phase); on[j].status.phase = 'Failed';
        var t = sched0.call(this, pod);
        if (t.node === nm) { taken.forEach(function (v) { v.status.phase = 'Running'; self.ev(v, 'Normal', 'Preempted', 'Preempted by pod ' + pod.metadata.namespace + '/' + pod.metadata.name + ' on node ' + nm); self.remove(v); }); return { node: nm }; }
      }
      taken.forEach(function (v, k) { v.status.phase = saved[k]; });
    }
    return r;
  };

  // ── kubeconfig contexts ──
  function ctxInit(s) { var f = F(s); if (!f.contexts) { f.contexts = [{ name: 'kubernetes-admin@kubedrill', cluster: 'kubedrill', user: 'kubernetes-admin', ns: s.ctxNs || 'default' }]; f.current = f.contexts[0].name; } return f; }
  var cfg0 = P.kConfig;
  P.kConfig = function (a) {
    var s = this, f = ctxInit(this), sub = a.pos[0], nm = a.pos[1], fl = a.flags || {}, cur = f.contexts.filter(function (c) { return c.name === f.current; })[0];
    function find(n) { return f.contexts.filter(function (c) { return c.name === n; })[0]; }
    if (sub === 'get-contexts') { var rows = [['CURRENT', 'NAME', 'CLUSTER', 'AUTHINFO', 'NAMESPACE']].concat(f.contexts.map(function (c) { return [c.name === f.current ? '*' : '', c.name, c.cluster, c.user, c.name === f.current ? s.ctxNs : c.ns]; })); var w = [0, 1, 2, 3, 4].map(function (i) { return Math.max.apply(null, rows.map(function (r) { return String(r[i]).length; })) + 3; }); return rows.map(function (r) { return r.map(function (x, i) { return String(x).padEnd(w[i]); }).join('').replace(/\s+$/, ''); }).join('\n') + '\n'; }
    if (sub === 'current-context') return f.current + '\n';
    if (sub === 'use-context') { var c = find(nm); if (!c) throw new KErr('error: no context exists with the name: "' + nm + '"'); if (cur) cur.ns = s.ctxNs; f.current = c.name; s.ctxNs = c.ns; return 'Switched to context "' + c.name + '".\n'; }
    if (sub === 'set-context') {
      var t = fl.current ? cur : find(nm), made = false; if (!t) { t = { name: nm, cluster: fl.cluster || 'kubedrill', user: fl.user || 'kubernetes-admin', ns: 'default' }; f.contexts.push(t); made = true; }
      if (fl.n || fl.namespace) { t.ns = fl.n || fl.namespace; if (t === cur) s.ctxNs = t.ns; } if (fl.cluster) t.cluster = fl.cluster; if (fl.user) t.user = fl.user;
      return 'Context "' + t.name + '" ' + (made ? 'created' : 'modified') + '.\n';
    }
    if (sub === 'rename-context') { var o = find(nm), n2 = a.pos[2]; if (!o) throw new KErr('error: cannot rename the context "' + nm + '", it\'s not in the kubeconfig'); if (find(n2)) throw new KErr('error: cannot rename the context "' + nm + '", the context "' + n2 + '" already exists'); if (f.current === o.name) f.current = n2; o.name = n2; return 'Context "' + nm + '" renamed to "' + n2 + '".\n'; }
    if (sub === 'delete-context') { var d = find(nm); if (!d) throw new KErr('error: cannot delete context ' + nm + ', not in /home/student/.kube/config'); f.contexts = f.contexts.filter(function (c) { return c !== d; }); var extra = d.name === f.current ? ' WARNING: this removed your active context, use "kubectl config use-context" to select a different one\n' : ''; if (d.name === f.current) f.current = ''; return 'deleted context ' + nm + ' from /home/student/.kube/config\n' + extra; }
    if (sub === 'view') { var list = fl.minify ? [cur].filter(Boolean) : f.contexts, clusters = {}, users = {}; list.forEach(function (c) { clusters[c.cluster] = 1; users[c.user] = 1; });
      return 'apiVersion: v1\nclusters:\n' + Object.keys(clusters).map(function (c) { return '- cluster:\n    server: https://192.168.49.2:6443\n  name: ' + c + '\n'; }).join('') + 'contexts:\n' + list.map(function (c) { return '- context:\n    cluster: ' + c.cluster + '\n    namespace: ' + (c === cur ? s.ctxNs : c.ns) + '\n    user: ' + c.user + '\n  name: ' + c.name + '\n'; }).join('') + 'current-context: ' + f.current + '\nkind: Config\npreferences: {}\nusers:\n' + Object.keys(users).map(function (u) { return '- name: ' + u + '\n  user:\n    client-certificate-data: DATA+OMITTED\n    client-key-data: DATA+OMITTED\n'; }).join(''); }
    return cfg0.apply(this, arguments);
  };
  var run0 = P.runCmd;
  P.runCmd = function (w) {
    if (w && (w[0] === 'kubectl' || w[0] === 'k') && F(this).contexts) {
      var i, ctx = null, rest = w.slice(); for (i = 1; i < rest.length; i++) { if (rest[i] === '--context' && rest[i + 1] !== undefined) { ctx = rest[i + 1]; rest.splice(i, 2); break; } if (/^--context=/.test(rest[i])) { ctx = rest[i].slice(10); rest.splice(i, 1); break; } }
      if (ctx !== null) { var c = F(this).contexts.filter(function (x) { return x.name === ctx; })[0]; if (!c) return err('error: context "' + ctx + '" does not exist\n'); var keep = this.ctxNs; this.ctxNs = c.name === F(this).current ? keep : c.ns; try { return run0.call(this, rest); } finally { this.ctxNs = keep; } }
    }
    return run0.apply(this, arguments);
  };

  // ── nodes: stash on delete, so `kubeadm join` can bring it back ──
  var rm0 = P.remove;
  P.remove = function (o) { if (o && o.kind === 'Node' && !this._real) { var f = F(this); f.nodeStash = f.nodeStash || {}; f.nodeStash[o.metadata.name] = JSON.parse(JSON.stringify(o)); } return rm0.apply(this, arguments); };

  // ── pressure + version sync ──
  var fp0 = P.faultPass;
  P.faultPass = function () {
    var r = fp0.apply(this, arguments), self = this, f = F(this);
    this.list('Node').forEach(function (n) {
      var nm = n.metadata.name, vn = f.ver && f.ver.nodes && f.ver.nodes[nm];
      if (vn && n.status.nodeInfo && n.status.nodeInfo.kubeletVersion !== vn.kubelet) { n.status.nodeInfo.kubeletVersion = vn.kubelet; self.changed(); }
      [['diskPressure', 'DiskPressure', 'disk-pressure', 'KubeletHasDiskPressure', 'kubelet has disk pressure'], ['memPressure', 'MemoryPressure', 'memory-pressure', 'KubeletHasInsufficientMemory', 'kubelet has insufficient memory available']].forEach(function (k) {
        var on = !!(f[k[0]] && f[k[0]][nm]);
        if (k[0] === 'memPressure' && on) { var app = f.memPressure[nm]; on = self.list('Pod').some(function (p) { return p.spec.nodeName === nm && (p.metadata.labels || {}).app === app && p.status.phase === 'Running' && !p.metadata.deletionTimestamp && p.spec.containers.some(function (c) { return !(c.resources && c.resources.limits && c.resources.limits.memory); }); }); }
        var cs = n.status.conditions || [], c = cs.filter(function (x) { return x.type === k[1]; })[0];
        if (c && (c.status === 'True') !== on) { c.status = on ? 'True' : 'False'; c.reason = on ? k[3] : k[3].replace('HasDisk', 'HasNoDisk').replace('HasInsufficientMemory', 'HasSufficientMemory'); c.message = on ? k[4] : k[4].replace('has disk', 'has no disk').replace('insufficient', 'sufficient'); self.changed(); }
        var tk = 'node.kubernetes.io/' + k[2], ts = n.spec.taints || [], has = ts.some(function (t) { return t.key === tk; });
        if (on && !has) { n.spec.taints = ts.concat([{ key: tk, effect: 'NoSchedule' }]); self.changed(); } if (!on && has) { n.spec.taints = ts.filter(function (t) { return t.key !== tk; }); self.changed(); }
        if (on) {
          var pods = self.list('Pod').filter(function (p) { return p.spec.nodeName === nm && !/^kube-/.test(p.metadata.namespace) && p.status.phase === 'Running' && !(p.metadata.ownerReferences || []).some(function (o) { return o.kind === 'DaemonSet'; }); });
          var rank = { BestEffort: 0, Burstable: 1, Guaranteed: 2 }; var lo = Math.min.apply(null, pods.map(function (p) { return rank[p.status.qosClass || 'BestEffort']; }));
          pods.filter(function (p) { return k[0] === 'diskPressure' || rank[p.status.qosClass || 'BestEffort'] === lo; }).filter(function (p) { return k[0] === 'diskPressure' || lo < 2; }).forEach(function (p) { p.status.phase = 'Failed'; p.status.reason = 'Evicted'; p.status.message = 'The node was low on resource: ' + (k[0] === 'diskPressure' ? 'ephemeral-storage' : 'memory') + '.'; (p.status.conditions || []).forEach(function (q) { if (q.type === 'Ready') q.status = 'False'; }); self.ev(p, 'Warning', 'Evicted', 'The node was low on resource: ' + (k[0] === 'diskPressure' ? 'ephemeral-storage' : 'memory') + '.'); self.changed(); });
        }
      });
    });
    return r;
  };

  // ── ssh: package versions, kubeadm upgrade/token/reset/join, disk ──
  var ssh0 = P.ssh;
  P.ssh = function (a) { var r = ssh1.call(this, a); if (r && r.code === 0) this.settle(4); return r; };
  function ssh1(a) {
    var node = String(a[0] || '').replace(/^.*@/, ''), cmd = a.slice(1).join(' ').replace(/^(['"])(.*)\1$/, '$2').trim(), c = cmd.replace(/^sudo\s+/, ''), f = F(this), nobj = this.get('Node', '', node), m, cp = /^cp/.test(node);
    var stash = f.nodeStash && f.nodeStash[node]; if (!nobj && !stash) return ssh0.apply(this, arguments);
    if (!nobj && !/^kubeadm\s+(reset|join)/.test(c) && !/^(hostname|uptime)/.test(c)) return ssh0.apply(this, arguments);
    var ver = f.ver, vn = ver && ver.nodes && ver.nodes[node];
    if (/^apt(-get)?\s+update$/.test(c)) return out('Hit:1 https://pkgs.k8s.io/core:/stable:/v1.34/deb  InRelease\nReading package lists... Done\n');
    if (/^apt-mark\s+(hold|unhold)/.test(c)) return out(c.split(/\s+/)[1] === 'hold' ? 'kubeadm set on hold.\n' : 'Canceled hold on kubeadm.\n');
    if (vn && (m = c.match(/^apt(?:-get)?\s+install\s+(.+)$/))) {
      var log = '';
      for (var t of m[1].split(/\s+/).filter(function (x) { return x && x[0] !== '-'; })) { var kv = t.split('='), pk = kv[0]; if (['kubeadm', 'kubelet', 'kubectl'].indexOf(pk) < 0) return err('E: Unable to locate package ' + pk + '\n', 100); if (!kv[1]) return err('E: refusing to guess the version of ' + pk + ': pin one (e.g. ' + pk + '=1.34.0-1.1)\n', 100); var nv = vnorm(kv[1]), mi = minor(nv); if (!(mi >= 32 && mi <= 34) || !/^\d+\.\d+\.\d+-\d+\.\d+$/.test(kv[1].replace(/^v/, ''))) return err("E: Version '" + kv[1] + "' for '" + pk + "' was not found\n", 100); vn.pkg = vn.pkg || {}; vn.pkg[pk] = nv; log += 'Setting up ' + pk + ' (' + kv[1] + ') ...\n'; }
      return out('Reading package lists... Done\n' + log);
    }
    if (vn && (m = c.match(/^kubeadm\s+version/))) return out('kubeadm version: &version.Info{Major:"1", Minor:"' + minor((vn.pkg || {}).kubeadm || vn.kubelet) + '", GitVersion:"' + ((vn.pkg || {}).kubeadm || vn.kubelet) + '"}\n');
    if (vn && /^kubeadm\s+upgrade\s+plan/.test(c)) { if (!cp) return err('error: unable to read /etc/kubernetes/admin.conf: this command only works on a control-plane node\n'); var kv0 = (vn.pkg || {}).kubeadm || vn.kubelet; return out('[upgrade/config] Reading configuration from the "kubeadm-config" ConfigMap in namespace "kube-system"...\n[upgrade] Fetching available versions to upgrade to\n[upgrade/versions] Cluster version: ' + ver.api + '\n[upgrade/versions] kubeadm version: ' + kv0 + '\n' + (minor(ver.api) < 34 ? '\nComponents that must be upgraded manually after you have upgraded the control plane with \'kubeadm upgrade apply\':\nCOMPONENT   NODE      CURRENT   TARGET\nkubelet     <all>     ' + ver.api + '   v' + '1.' + (minor(ver.api) + 1) + '.0\n\nUpgrade to the latest stable version:\n\nCOMPONENT                 NODE   CURRENT   TARGET\nkube-apiserver            cp1    ' + ver.api + '   v1.' + (minor(ver.api) + 1) + '.0\n\nNote: upgrade ONE minor version at a time. Upgrade kubeadm first, then run: kubeadm upgrade apply v1.' + (minor(ver.api) + 1) + '.0\n' : '\nYour cluster is up to date.\n')); }
    if (vn && (m = c.match(/^kubeadm\s+upgrade\s+apply\s+(v?\d+\.\d+\.\d+)/))) {
      if (!cp) return err('error: unable to read /etc/kubernetes/admin.conf: run "upgrade apply" on a control-plane node\n'); var tv = vnorm(m[1]), kb = (vn.pkg || {}).kubeadm || vn.kubelet;
      if (minor(tv) > minor(kb)) return err('[upgrade/version] FATAL: the target version ' + tv + ' is newer than kubeadm ' + kb + '. Upgrade the kubeadm package first.\n');
      if (minor(tv) - minor(ver.api) > 1) return err('[upgrade/version] FATAL: skipping minor versions is not supported (cluster ' + ver.api + ' → ' + tv + '). Upgrade one minor at a time.\n');
      if (minor(tv) < minor(ver.api)) return err('[upgrade/version] FATAL: downgrades are not supported.\n');
      ver.api = tv; return out('[upgrade/apply] Upgrading your Static Pod-hosted control plane to version "' + tv + '"...\n[upgrade/staticpods] Component "kube-apiserver" upgraded successfully!\n[upgrade/staticpods] Component "kube-controller-manager" upgraded successfully!\n[upgrade/staticpods] Component "kube-scheduler" upgraded successfully!\n\n[upgrade] SUCCESS! A control plane node of your cluster was upgraded to "' + tv + '".\n\n[upgrade] Now please proceed with upgrading the rest of the nodes by following the right order.\n');
    }
    if (vn && /^kubeadm\s+upgrade\s+node/.test(c)) { var kb2 = (vn.pkg || {}).kubeadm || vn.kubelet; if (minor(kb2) > minor(ver.api)) return err('[upgrade] FATAL: this kubeadm (' + kb2 + ') is newer than the control plane (' + ver.api + '). Upgrade the control plane first.\n'); vn.cfg = kb2; return out('[upgrade] Reading configuration from the "kubelet-config" ConfigMap...\n[upgrade] The configuration for this node was successfully updated!\n[upgrade] Now you should go ahead and upgrade the kubelet package using your package manager.\n'); }
    if (vn && /^systemctl\s+restart\s+kubelet$/.test(c)) { var pk2 = (vn.pkg || {}).kubelet; var r0 = ssh0.apply(this, arguments); if (pk2 && !(f.swapOn && f.swapOn[node])) vn.kubelet = pk2; return r0; }
    if ((m = c.match(/^kubeadm\s+token\s+create(.*)$/))) { if (!cp) return err('bash: kubeadm: command not found\n', 127); f.tokenMade = true; return out('kubeadm join 192.168.49.2:6443 --token abcdef.0123456789abcdef --discovery-token-ca-cert-hash sha256:7f1c0a5f9e1c3b9d2a4e6f8081726354a9b8c7d6e5f4031221b0a99887766554\n'); }
    if (/^kubeadm\s+reset(\s|$)/.test(c)) { if (!/(^|\s)(-f|--force)(\s|$)/.test(c)) return out('[reset] WARNING: Changes made to this host by \'kubeadm init\' or \'kubeadm join\' will be reverted.\n[reset] Are you sure you want to proceed? [y/N]: N\n[reset] Aborted reset operation\n', 1); f.reset = f.reset || {}; f.reset[node] = true; f.wasReset = f.wasReset || {}; f.wasReset[node] = true; f.kubeletDown = f.kubeletDown || {}; f.kubeletDown[node] = true; return out('[reset] Stopping the kubelet service\n[reset] Unmounting mounted directories in "/var/lib/kubelet"\n[reset] Deleting contents of directories: [/etc/kubernetes/manifests /var/lib/kubelet /etc/kubernetes/pki]\n\nThe reset process does not clean CNI configuration, iptables rules or kubeconfig files. Clean those manually if needed.\n'); }
    if (/^kubeadm\s+join\s/.test(c)) {
      if (!(f.reset && f.reset[node])) return err('[preflight] Some fatal errors occurred:\n\t[ERROR FileAvailable--etc-kubernetes-kubelet.conf]: /etc/kubernetes/kubelet.conf already exists\n\t[ERROR Port-10250]: Port 10250 is in use\nrun `kubeadm reset` on this node first\n');
      if (!/--token\s+abcdef\.0123456789abcdef/.test(c) || !/--discovery-token-ca-cert-hash\s+sha256:[0-9a-f]{64}/.test(c)) return err('error execution phase preflight: couldn\'t validate the identity of the API Server: invalid or expired token / hash. Create a fresh one on the control plane: kubeadm token create --print-join-command\n');
      if (nobj) return err('error execution phase kubelet-start: a Node with name "' + node + '" and status "' + (Sim.nodeReady(nobj) ? 'Ready' : 'NotReady') + '" already exists in the cluster. You must delete the existing Node or change the name of this new joining Node\n');
      var fresh = JSON.parse(JSON.stringify(stash)); delete fresh.metadata.deletionTimestamp; fresh.spec.unschedulable = false; fresh.spec.taints = []; fresh.metadata.uid = undefined; delete fresh.metadata.uid; this.create ? 0 : 0;
      this.objs[this.key('Node', '', node)] = fresh; if (this.assignUid) this.assignUid(fresh); delete f.reset[node]; if (f.kubeletDown) delete f.kubeletDown[node]; this.changed();
      return out('[preflight] Running pre-flight checks\n[kubelet-start] Starting the kubelet\n[kubelet-start] Waiting for the kubelet to perform the TLS Bootstrap...\n\nThis node has joined the cluster:\n* Certificate signing request was sent to apiserver and a response was received.\n* The Kubelet was informed of the new secure connection details.\n');
    }
    if (/^df(\s+-h)?$/.test(c) && f.diskPressure && f.diskPressure[node]) return out('Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        58G   56G  1.2G  98% /\n');
    if (/^du\s+-sh\s+\/var\/log\/\*?/.test(c) && f.diskPressure && f.diskPressure[node]) return out('1.1G\t/var/log/containers\n44G\t/var/log/journal\n220M\t/var/log/pods\n');
    if ((m = c.match(/^journalctl\s+--vacuum-size=(\d+)([MG])/))) { if (f.diskPressure && f.diskPressure[node]) { delete f.diskPressure[node]; } return out('Vacuuming done, freed 43.8G of archived journals from /var/log/journal.\n'); }
    if (/^rm\s+-rf?\s+\/(var\/lib\/(containerd|kubelet|etcd)|etc\/kubernetes)/.test(c) || /^rm\s+-rf?\s+\/\s*$/.test(c)) return err('simulator: refused. That would delete container state / kubelet or etcd data and break the node. Free space with log vacuuming or image pruning instead.\n', 1);
    if (/^crictl\s+rmi\s+--prune/.test(c)) { if (f.diskPressure && f.diskPressure[node]) f.diskPressure[node] = f.diskPressure[node]; return out('Deleted: 12 unused images\n'); }
    return ssh0.apply(this, arguments);
  }
})(typeof window !== 'undefined' ? window : globalThis);
