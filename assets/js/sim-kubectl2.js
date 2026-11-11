/* KubeLab simulator — kubectl part 2: describe, logs, exec, top, auth, wait, explain, config */
(function (root) {
  'use strict';
  var Sim = root.KL ? root.KL.Sim : require('./sim.js');
  var P = Sim.prototype, KErr = Sim.KErr, U = Sim.util, Y = Sim.Y;

  function kv(o) { return Object.keys(o || {}).map(function (k) { return k + '=' + o[k]; }).join(','); }
  function pad(k, v) { return (k + ':').padEnd(19) + v + '\n'; }

  P.kDescribe = function (a) {
    var self = this, refs = this.parseRefs(a), f = a.flags, out = [];
    if (!refs.length) throw new KErr('error: You must specify the type of resource to describe. Use "kubectl api-resources" for a complete list of supported resources.');
    refs.forEach(function (r) {
      var ns = self.nsOf(f, r.d), list = r.name ? [self.objs[self.key(r.d.kind, r.d.ns ? ns : '', r.name)]] : self.list(r.d, ns, f.l);
      if (r.name && !list[0]) throw self.notFound(r.d, r.name);
      list.forEach(function (o) { out.push(self.describeOne(o, r.d)); });
    });
    return out.join('\n\n');
  };
  P.describeOne = function (o, d) {
    var m = o.metadata, s = '', self = this;
    s += pad('Name', m.name); if (d.ns) s += pad('Namespace', m.namespace);
    var specific = this['desc' + o.kind]; if (specific) return s + specific.call(this, o);
    s += pad('Labels', Object.keys(m.labels || {}).length ? Object.keys(m.labels).map(function (k, i) { return (i ? ' '.repeat(19) : '') + k + '=' + m.labels[k]; }).join('\n') : '<none>');
    s += pad('Annotations', Object.keys(m.annotations || {}).length ? Object.keys(m.annotations).map(function (k, i) { return (i ? ' '.repeat(19) : '') + k + ': ' + m.annotations[k]; }).join('\n') : '<none>');
    var body = self.exportObj(o); delete body.metadata; delete body.apiVersion; delete body.kind;
    s += Y.dump(body, { lineWidth: -1, noRefs: true }).split('\n').map(function (l) { return l; }).join('\n');
    return s + '\n' + this.eventsFor(o);
  };
  P.descPod = function (p) {
    var self = this, m = p.metadata, st = p.status, s = '';
    s += pad('Priority', '0'); s += pad('Service Account', p.spec.serviceAccountName);
    s += pad('Node', p.spec.nodeName ? p.spec.nodeName + '/' + st.hostIP : '<none>');
    if (st.startTime) s += pad('Start Time', 'Mon, 09 Nov 2026 07:00:00 +0000');
    s += pad('Labels', Object.keys(m.labels || {}).length ? Object.keys(m.labels).map(function (k, i) { return (i ? ' '.repeat(19) : '') + k + '=' + m.labels[k]; }).join('\n') : '<none>');
    s += pad('Annotations', '<none>');
    s += pad('Status', st.phase === 'Pending' && m.deletionTimestamp ? 'Terminating' : st.phase);
    s += pad('IP', st.podIP || ''); s += pad('IPs', st.podIP ? '\n  IP:           ' + st.podIP : '<none>').replace(/^IPs: +\n/, 'IPs:\n');
    var ow = (m.ownerReferences || [])[0]; if (ow) s += pad('Controlled By', ow.kind + '/' + ow.name);
    function cblock(c, cst, init) {
      var o = '  ' + c.name + ':\n    Container ID:   containerd://' + U.hash(m.uid + c.name).toString(16) + '\n    Image:          ' + c.image + '\n';
      if (c.ports && c.ports.length) o += '    Port:           ' + c.ports.map(function (x) { return x.containerPort + '/' + (x.protocol || 'TCP'); }).join(', ') + '\n';
      if (c.command) o += '    Command:\n' + c.command.map(function (x) { return '      ' + x; }).join('\n') + '\n';
      if (c.args) o += '    Args:\n' + c.args.map(function (x) { return '      ' + x; }).join('\n') + '\n';
      var sx = cst ? cst.state : { waiting: { reason: 'ContainerCreating' } };
      if (sx.running) o += '    State:          Running\n      Started:      Mon, 09 Nov 2026 07:00:00 +0000\n';
      else if (sx.terminated) o += '    State:          Terminated\n      Reason:       ' + sx.terminated.reason + '\n      Exit Code:    ' + sx.terminated.exitCode + '\n';
      else o += '    State:          Waiting\n      Reason:       ' + sx.waiting.reason + '\n';
      if (cst && cst.lastState && cst.lastState.terminated) o += '    Last State:     Terminated\n      Reason:       ' + cst.lastState.terminated.reason + '\n      Exit Code:    ' + cst.lastState.terminated.exitCode + '\n';
      else if (cst && sx.terminated && !init) { /* shown above */ }
      if (!init) o += '    Ready:          ' + (cst && cst.ready ? 'True' : 'False') + '\n    Restart Count:  ' + (cst ? cst.restartCount : 0) + '\n';
      var r = c.resources || {}; if (r.limits) o += '    Limits:\n' + Object.keys(r.limits).map(function (k) { return '      ' + k + ':  ' + r.limits[k]; }).join('\n') + '\n'; if (r.requests) o += '    Requests:\n' + Object.keys(r.requests).map(function (k) { return '      ' + k + ':  ' + r.requests[k]; }).join('\n') + '\n';
      ['liveness', 'readiness'].forEach(function (k) { var pr = c[k + 'Probe']; if (pr) { var h = pr.httpGet ? 'http-get http://:' + pr.httpGet.port + (pr.httpGet.path || '/') : pr.tcpSocket ? 'tcp-socket :' + pr.tcpSocket.port : 'exec ' + (pr.exec.command || []).join(' '); o += '    ' + (k === 'liveness' ? 'Liveness' : 'Readiness') + ':       ' + h + ' delay=' + (pr.initialDelaySeconds || 0) + 's timeout=' + (pr.timeoutSeconds || 1) + 's period=' + (pr.periodSeconds || 10) + 's #success=1 #failure=3\n'; } });
      if (c.env && c.env.length) o += '    Environment:\n' + c.env.map(function (e) { return '      ' + e.name + ':  ' + (e.value !== undefined ? e.value : e.valueFrom && e.valueFrom.configMapKeyRef ? '<set to the key \'' + e.valueFrom.configMapKeyRef.key + '\' of config map \'' + e.valueFrom.configMapKeyRef.name + '\'>  Optional: false' : e.valueFrom && e.valueFrom.secretKeyRef ? '<set to the key \'' + e.valueFrom.secretKeyRef.key + '\' in secret \'' + e.valueFrom.secretKeyRef.name + '\'>  Optional: false' : '<ref>'); }).join('\n') + '\n'; else o += '    Environment:    <none>\n';
      if (c.volumeMounts) o += '    Mounts:\n' + c.volumeMounts.map(function (v) { return '      ' + v.mountPath + ' from ' + v.name + ' (' + (v.readOnly ? 'ro' : 'rw') + ')'; }).join('\n') + '\n';
      return o;
    }
    if ((p.spec.initContainers || []).length) s += 'Init Containers:\n' + p.spec.initContainers.map(function (c, i) { return cblock(c, (st.initContainerStatuses || [])[i], true); }).join('');
    s += 'Containers:\n' + p.spec.containers.map(function (c, i) { return cblock(c, (st.containerStatuses || [])[i], false); }).join('');
    s += 'Conditions:\n  Type                        Status\n' + (st.conditions || []).map(function (c) { return '  ' + c.type.padEnd(28) + c.status; }).join('\n') + '\n';
    if (p.spec.volumes && p.spec.volumes.length) s += 'Volumes:\n' + p.spec.volumes.map(function (v) { var t = v.persistentVolumeClaim ? 'PersistentVolumeClaim (a reference to a PersistentVolumeClaim in the same namespace)\n    ClaimName:  ' + v.persistentVolumeClaim.claimName : v.configMap ? 'ConfigMap (a volume populated by a ConfigMap)\n    Name:  ' + v.configMap.name : v.secret ? 'Secret (a volume populated by a Secret)\n    SecretName:  ' + v.secret.secretName : v.emptyDir ? 'EmptyDir (a temporary directory that shares a pod\'s lifetime)' : 'HostPath'; return '  ' + v.name + ':\n    Type:  ' + t; }).join('\n') + '\n';
    s += 'QoS Class:       ' + st.qosClass + '\n';
    s += 'Node-Selectors:  ' + (kv(p.spec.nodeSelector) || '<none>') + '\n';
    s += 'Tolerations:     ' + ((p.spec.tolerations || []).map(function (t) { return t.key ? t.key + ':' + (t.effect || '') + ' op=' + (t.operator || 'Equal') : 'op=Exists'; }).join('\n                 ') || 'node.kubernetes.io/not-ready:NoExecute op=Exists for 300s') + '\n';
    return s + this.eventsFor(p);
  };
  P.descNode = function (n) {
    var self = this, s = '', used = this.nodeUsed(n.metadata.name), al = n.status.allocatable;
    s += pad('Roles', (n.metadata.labels || {})['node-role.kubernetes.io/control-plane'] !== undefined ? 'control-plane' : '<none>');
    s += pad('Labels', Object.keys(n.metadata.labels).map(function (k, i) { return (i ? ' '.repeat(19) : '') + k + '=' + n.metadata.labels[k]; }).join('\n'));
    s += pad('Taints', (n.spec.taints || []).map(function (t) { return t.key + (t.value ? '=' + t.value : '') + ':' + t.effect; }).join('\n' + ' '.repeat(19)) || '<none>');
    s += pad('Unschedulable', n.spec.unschedulable ? 'true' : 'false');
    if ((n.status.conditions || []).length) s += 'Conditions:\n  Type             Status   Reason                Message\n' + n.status.conditions.map(function (c) { return '  ' + c.type.padEnd(17) + c.status.padEnd(9) + (c.reason || '').padEnd(22) + (c.message || ''); }).join('\n') + '\n';
    s += 'Addresses:\n  InternalIP:  ' + n.status.addresses[0].address + '\n  Hostname:    ' + n.metadata.name + '\n';
    s += 'Capacity:\n  cpu:     ' + n.status.capacity.cpu + '\n  memory:  ' + n.status.capacity.memory + '\n  pods:    110\nAllocatable:\n  cpu:     ' + al.cpu + '\n  memory:  ' + al.memory + '\n  pods:    110\n';
    s += 'System Info:\n  Kubelet Version:   ' + (n.status.nodeInfo.kubeletVersion || Sim.VERSION) + '\n  OS Image:          ' + n.status.nodeInfo.osImage + '\n';
    var pods = this.list('Pod').filter(function (p) { return p.spec.nodeName === n.metadata.name; });
    s += 'Non-terminated Pods:          (' + pods.length + ' in total)\n' + this.table(['  Namespace', 'Name', 'CPU Requests', 'Memory Requests'], pods.map(function (p) { var c = 0, mm = 0; p.spec.containers.forEach(function (x) { var r = x.resources && x.resources.requests; if (r) { c += U.parseCpu(r.cpu); mm += U.parseMem(r.memory); } }); return ['  ' + p.metadata.namespace, p.metadata.name, U.fmtCpu(c) + ' (' + Math.round(c / U.parseCpu(al.cpu) * 100) + '%)', Math.round(mm) + 'Mi (' + Math.round(mm / U.parseMem(al.memory) * 100) + '%)']; }));
    s += 'Allocated resources:\n  cpu                ' + U.fmtCpu(used.cpu) + '\n  memory             ' + Math.round(used.mem) + 'Mi\n'; void self;
    return s + this.eventsFor(n);
  };
  P.descService = function (x) {
    var eps = this.endpointsFor(x), s = '';
    s += pad('Labels', kv(x.metadata.labels) || '<none>'); s += pad('Selector', kv(x.spec.selector) || '<none>'); s += pad('Type', x.spec.type); s += pad('IP', x.spec.clusterIP || '');
    (x.spec.ports || []).forEach(function (p) { s += pad('Port', (p.name || '<unset>') + '  ' + p.port + '/' + p.protocol); s += pad('TargetPort', p.targetPort + '/' + p.protocol); if (p.nodePort) s += pad('NodePort', (p.name || '<unset>') + '  ' + p.nodePort + '/' + p.protocol); });
    s += pad('Endpoints', eps.length ? eps.map(function (p) { return p.status.podIP + ':' + (x.spec.ports[0].targetPort); }).join(',') : '<none>');
    return s + this.eventsFor(x);
  };
  P.descDeployment = function (x) {
    var st = x.status || {}, s = '', ru = (x.spec.strategy || {}).rollingUpdate || {};
    s += pad('Labels', kv(x.metadata.labels) || '<none>'); s += pad('Selector', kv(x.spec.selector.matchLabels));
    s += pad('Replicas', x.spec.replicas + ' desired | ' + (st.updatedReplicas || 0) + ' updated | ' + (st.replicas || 0) + ' total | ' + (st.availableReplicas || 0) + ' available | ' + (st.unavailableReplicas || 0) + ' unavailable');
    s += pad('StrategyType', (x.spec.strategy || {}).type); s += pad('RollingUpdateStrategy', (ru.maxUnavailable || '25%') + ' max unavailable, ' + (ru.maxSurge || '25%') + ' max surge');
    s += 'Pod Template:\n  Labels:  ' + kv(x.spec.template.metadata && x.spec.template.metadata.labels) + '\n  Containers:\n' + x.spec.template.spec.containers.map(function (c) { return '   ' + c.name + ':\n    Image:  ' + c.image + (c.resources && c.resources.limits ? '\n    Limits:  ' + kv(c.resources.limits) : '') + (c.resources && c.resources.requests ? '\n    Requests:  ' + kv(c.resources.requests) : ''); }).join('\n') + '\n';
    var self = this, rss = this.list('ReplicaSet', x.metadata.namespace).filter(function (r) { return (r.metadata.ownerReferences || []).some(function (o) { return o.uid === x.metadata.uid; }); });
    s += pad('NewReplicaSet', (rss.filter(function (r) { return r.spec.replicas > 0; }).slice(-1)[0] || { metadata: { name: '<none>' } }).metadata.name + ' (' + (st.readyReplicas || 0) + '/' + x.spec.replicas + ' replicas created)'); void self;
    return s + this.eventsFor(x);
  };
  P.descConfigMap = function (x) { var s = pad('Labels', kv(x.metadata.labels) || '<none>') + '\nData\n====\n'; Object.keys(x.data || {}).forEach(function (k) { s += k + ':\n----\n' + x.data[k] + '\n\n'; }); return s + this.eventsFor(x); };
  P.descSecret = function (x) { var s = pad('Type', x.type) + '\nData\n====\n'; Object.keys(x.data || {}).forEach(function (k) { s += k + ':  ' + (typeof Buffer !== 'undefined' ? Buffer.from(x.data[k], 'base64').length : atob(x.data[k]).length) + ' bytes\n'; }); return s; };
  P.descPersistentVolumeClaim = function (x) { return pad('StorageClass', x.spec.storageClassName === undefined ? 'standard' : x.spec.storageClassName) + pad('Status', x.status.phase) + pad('Volume', x.spec.volumeName || '') + pad('Capacity', (x.status.capacity || {}).storage || '') + pad('Access Modes', (x.spec.accessModes || []).join(',')) + this.eventsFor(x); };
  P.descNamespace = function (x) { var s = pad('Labels', kv(x.metadata.labels) || '<none>') + pad('Status', 'Active'); this.list('ResourceQuota', x.metadata.name).forEach(function (q) { s += '\nResource Quotas\n  Name:  ' + q.metadata.name + '\n  Resource  Used  Hard\n'; }); return s; };

  // ─── logs ───
  P.kLogs = function (a) {
    var f = a.flags, ns = f.n || this.ctxNs, name = a.pos[0], pod, d;
    if (!name) throw new KErr('error: expected \'logs [-f] [-p] (POD | TYPE/NAME) [-c CONTAINER]\'.\nPOD or TYPE/NAME is a required argument for the logs command');
    if (name.indexOf('/') > 0) { var sp = name.split('/'); d = this.findKind(sp[0]); var ob = this.get(sp[0], ns, sp[1]); if (!ob) throw this.notFound(d, sp[1]); pod = ob.kind === 'Pod' ? ob : this.podsOf(ob)[0] || this.list('Pod', ns, { matchLabels: (ob.spec.selector || {}).matchLabels || {} })[0]; }
    else pod = this.get('Pod', ns, name);
    if (!pod) throw new KErr('Error from server (NotFound): pods "' + name + '" not found');
    var cname = f.c || pod.spec.containers[0].name, all = (pod.spec.initContainers || []).concat(pod.spec.containers), c = all.filter(function (x) { return x.name === cname; })[0];
    if (!c) throw new KErr('Error from server (BadRequest): container ' + cname + ' is not valid for pod ' + pod.metadata.name);
    var pi = this.pi[pod.metadata.uid] || { c: {}, init: {} }, cs = (pod.spec.initContainers || []).indexOf(c) >= 0 ? pi.init[cname] : pi.c[cname];
    if (!cs || cs.st === 'creating' || cs.st === 'pullerr' || cs.st === 'cfgerr') {
      var why = cs && cs.st === 'cfgerr' ? 'CreateContainerConfigError' : 'ContainerCreating';
      if (cs && cs.st === 'pullerr') why = 'ImagePullBackOff';
      throw new KErr('Error from server (BadRequest): container "' + cname + '" in pod "' + pod.metadata.name + '" is waiting to start: ' + why);
    }
    if (f.previous && !(cs.rc > 0)) throw new KErr('Error from server (BadRequest): previous terminated container "' + cname + '" in pod "' + pod.metadata.name + '" not found');
    var plan = this.containerPlan(pod, c), lines = plan.logs.slice();
    if (cname === 'sidecar-logger' || (pod.spec.containers.length > 1 && /tail|cat/.test((c.args || []).join(' ')))) { var any = pod.spec.containers.filter(function (x) { return x !== c; }); if (any.length && /\/var\/log|\/logs/.test((c.args || []).concat(c.command || []).join(' '))) lines = ['2026-11-09T07:00:01Z app: request served', '2026-11-09T07:00:02Z app: request served']; }
    if (f.tail) lines = lines.slice(-parseInt(f.tail, 10));
    return lines.length ? lines.join('\n') + '\n' : '';
  };

  // ─── exec ───
  P.kExec = function (a) {
    var f = a.flags, ns = f.n || this.ctxNs, name = a.pos[0], cmd = a.rest || a.pos.slice(1);
    if (!name) throw new KErr('error: expected \'exec (POD | TYPE/NAME) COMMAND [ARG1 ... ARGN]\'.\nPOD or TYPE/NAME and COMMAND are required arguments for the exec command');
    var pod;
    if (name.indexOf('/') > 0) { var sp = name.split('/'), ob = this.get(sp[0], ns, sp[1]); if (!ob) throw this.notFound(this.findKind(sp[0]), sp[1]); pod = ob.kind === 'Pod' ? ob : this.list('Pod', ns, { matchLabels: ((ob.spec.selector || {}).matchLabels) || {} }).filter(function (p) { return p.status.phase === 'Running'; })[0]; }
    else pod = this.get('Pod', ns, name);
    if (!pod) throw new KErr('Error from server (NotFound): pods "' + name + '" not found');
    if (pod.status.phase !== 'Running' || !(pod.status.containerStatuses || []).some(function (c) { return c.state.running; })) throw new KErr('error: unable to upgrade connection: container not found ("' + pod.spec.containers[0].name + '")');
    if (!cmd.length) throw new KErr('error: you must specify at least one command for the container');
    var c0 = cmd[0], rest = cmd.slice(1);
    if (c0 === 'sh' || c0 === 'bash' || c0 === '/bin/sh') {
      if (rest[0] === '-c') { var inner = rest.slice(1).join(' '); return this.podShell(pod, inner); }
      return 'Simulator: interactive shells are not supported. Run one command, e.g. kubectl exec ' + pod.metadata.name + ' -- sh -c "wget -qO- <svc>"\n';
    }
    return this.podCmd(pod, c0, rest);
  };
  P.podShell = function (pod, line) {
    var self = this, parts = line.split(/\s*(?:&&|;)\s*/), out = '', err = '', code = 0;
    parts.forEach(function (p) { var toks = p.trim().split(/\s+/).filter(Boolean); if (!toks.length) return; var r = self.podCmd(pod, toks[0], toks.slice(1)); if (typeof r === 'string') out += r; else { out += r.stdout || ''; err += r.stderr || ''; code = r.code || 0; } });
    return { stdout: out, stderr: err, code: code };
  };
  P.podCmd = function (pod, c, a) {
    var self = this, ok = function (s) { return { stdout: s, stderr: '', code: 0 }; };
    switch (c) {
      case 'hostname': return ok(pod.metadata.name + '\n');
      case 'env': case 'printenv': { var all = []; pod.spec.containers[0].env && pod.spec.containers[0].env.forEach(function (e) { var v = e.value; if (v === undefined && e.valueFrom) { var r = e.valueFrom.configMapKeyRef ? (self.get('ConfigMap', pod.metadata.namespace, e.valueFrom.configMapKeyRef.name) || { data: {} }).data[e.valueFrom.configMapKeyRef.key] : e.valueFrom.secretKeyRef ? (function () { var sx = self.get('Secret', pod.metadata.namespace, e.valueFrom.secretKeyRef.name); var b = sx && sx.data[e.valueFrom.secretKeyRef.key]; return b ? (typeof Buffer !== 'undefined' ? Buffer.from(b, 'base64').toString() : atob(b)) : ''; })() : ''; v = r; } all.push(e.name + '=' + v); }); (pod.spec.containers[0].envFrom || []).forEach(function (ef) { var cm = ef.configMapRef && self.get('ConfigMap', pod.metadata.namespace, ef.configMapRef.name); if (cm) Object.keys(cm.data || {}).forEach(function (k) { all.push(k + '=' + cm.data[k]); }); }); all.push('HOSTNAME=' + pod.metadata.name, 'KUBERNETES_SERVICE_HOST=10.96.0.1'); if (a[0]) return ok(all.filter(function (x) { return x.indexOf(a[0] + '=') === 0; }).map(function (x) { return x.split('=').slice(1).join('='); }).join('\n') + '\n'); return ok(all.join('\n') + '\n'); }
      case 'cat': {
        var path = a[0] || '', vm = (pod.spec.containers[0].volumeMounts || []).filter(function (v) { return path.indexOf(v.mountPath) === 0; })[0];
        if (path === '/etc/resolv.conf') return ok('search ' + pod.metadata.namespace + '.svc.cluster.local svc.cluster.local cluster.local\nnameserver 10.96.0.10\noptions ndots:5\n');
        if (vm) { var vol = (pod.spec.volumes || []).filter(function (v) { return v.name === vm.name; })[0], key = path.slice(vm.mountPath.length).replace(/^\//, '');
          if (vol && vol.configMap) { var cm = this.get('ConfigMap', pod.metadata.namespace, vol.configMap.name); if (cm && cm.data && cm.data[key] !== undefined) return ok(cm.data[key] + (/\n$/.test(cm.data[key]) ? '' : '\n')); }
          if (vol && vol.secret) { var sc = this.get('Secret', pod.metadata.namespace, vol.secret.secretName); if (sc && sc.data && sc.data[key] !== undefined) return ok((typeof Buffer !== 'undefined' ? Buffer.from(sc.data[key], 'base64').toString() : atob(sc.data[key]))); }
          if (vol && vol.emptyDir) { var f = pod.fsx && pod.fsx[path]; if (f !== undefined) return ok(f); }
        }
        return { stdout: '', stderr: 'cat: ' + path + ': No such file or directory\n', code: 1 };
      }
      case 'ls': { var p2 = a[0] || '/', vm2 = (pod.spec.containers[0].volumeMounts || []).filter(function (v) { return p2.replace(/\/$/, '') === v.mountPath; })[0]; if (vm2) { var vol2 = (pod.spec.volumes || []).filter(function (v) { return v.name === vm2.name; })[0]; if (vol2 && vol2.configMap) return ok(Object.keys((this.get('ConfigMap', pod.metadata.namespace, vol2.configMap.name) || { data: {} }).data || {}).join('\n') + '\n'); if (vol2 && vol2.secret) return ok(Object.keys((this.get('Secret', pod.metadata.namespace, vol2.secret.secretName) || { data: {} }).data || {}).join('\n') + '\n'); } return ok('bin\netc\nusr\nvar\n'); }
      case 'id': return ok(((pod.spec.securityContext || {}).runAsUser || (pod.spec.containers[0].securityContext || {}).runAsUser ? 'uid=' + ((pod.spec.containers[0].securityContext || {}).runAsUser || (pod.spec.securityContext || {}).runAsUser) + ' gid=0(root)' : 'uid=0(root) gid=0(root) groups=0(root)') + '\n');
      case 'whoami': return ok(((pod.spec.securityContext || {}).runAsUser || (pod.spec.containers[0].securityContext || {}).runAsUser) ? 'appuser\n' : 'root\n');
      case 'touch': case 'echo': return ok('');
      case 'nslookup': case 'getent': case 'host': { var h = a[0] || ''; var r2 = this.resolveTarget(pod, h, 0); if (r2.dns === false) return { stdout: 'Server:\t\t10.96.0.10\nAddress:\t10.96.0.10:53\n\n** server can\'t find ' + h + ': NXDOMAIN\n', stderr: '', code: 1 }; return ok('Server:\t\t10.96.0.10\nAddress:\t10.96.0.10:53\n\nName:\t' + h + '.' + pod.metadata.namespace + '.svc.cluster.local\nAddress: ' + r2.svc.spec.clusterIP + '\n'); }
      case 'ping': return ok('PING ' + a[a.length - 1] + ' (10.244.1.2): 56 data bytes\n64 bytes from 10.244.1.2: seq=0 ttl=63 time=0.1 ms\n');
      case 'nc': { var hp = a.filter(function (x) { return x[0] !== '-'; }), r3 = this.connect(pod, hp[0] || '', parseInt(hp[1], 10) || 80); return { stdout: r3.code === 0 ? '(open)\n' : '', stderr: r3.code === 0 ? '' : (hp[0] + ' (' + hp[0] + ':' + hp[1] + ') ' + (r3.code === 1 && /timed out/.test(r3.out) ? 'timed out' : 'refused') + '\n'), code: r3.code }; }
      case 'wget': case 'curl': {
        var url = a.filter(function (x) { return x[0] !== '-' && !/^\d+$/.test(x) && x !== 'GET'; }).pop() || '', mm = url.match(/^(?:https?:\/\/)?([^:\/\s]+)(?::(\d+))?(\/.*)?$/);
        if (!mm) return { stdout: '', stderr: c + ': no URL specified\n', code: 1 };
        var r4 = this.connect(pod, mm[1], mm[2] ? parseInt(mm[2], 10) : 80);
        return r4.code === 0 ? ok(r4.out + '\n') : { stdout: '', stderr: (c === 'curl' ? r4.curl : r4.out) + '\n', code: r4.code };
      }
      case 'sleep': return ok('');
      case 'kill': return ok('');
      case 'nginx': return ok('nginx version: nginx/1.25.3\n');
    }
    return { stdout: '', stderr: 'OCI runtime exec failed: exec failed: unable to start container process: exec: "' + c + '": executable file not found in $PATH: unknown\ncommand terminated with exit code 126\n', code: 126 };
  };

  // ─── top ───
  P.kTop = function (a) {
    var self = this, what = a.pos[0], ns = a.flags['all-namespaces'] ? null : (a.flags.n || this.ctxNs);
    var ms = this.get('Deployment', 'kube-system', 'metrics-server'); if (!ms || !(ms.status && ms.status.readyReplicas)) throw new KErr('error: Metrics API not available');
    if (what === 'node' || what === 'nodes') return this.table(['NAME', 'CPU(cores)', 'CPU(%)', 'MEMORY(bytes)', 'MEMORY(%)'], this.list('Node').map(function (n) { var u = self.nodeUsed(n.metadata.name); return [n.metadata.name, (120 + u.cpu / 4) + 'm', '4%', (600 + u.mem) + 'Mi', '8%']; }));
    if (what === 'pod' || what === 'pods') return this.table(['NAME', 'CPU(cores)', 'MEMORY(bytes)'], this.list('Pod', ns, a.flags.l).filter(function (p) { return p.status.phase === 'Running'; }).map(function (p) { return [p.metadata.name, self.podCpu(p) + 'm', Math.round(self.podMem(p)) + 'Mi']; }));
    throw new KErr('error: You must specify the type of resource to top. Valid resource types include: nodes, pods');
  };

  // ─── auth can-i ───
  P.kAuth = function (a) {
    var sub = a.pos.shift();
    if (sub !== 'can-i') throw new KErr('error: unknown auth command "' + sub + '"');
    if (a.pos[0] === '--list') return 'Resources   Non-Resource URLs   Resource Names   Verbs\n*.*         []                 []               [*]\n';
    var verb = a.pos[0], res = a.pos[1], ns = a.flags['all-namespaces'] ? null : (a.flags.n || this.ctxNs);
    if (!verb || !res) throw new KErr('error: you must specify two or three arguments: verb, resource, and optional resourceName');
    var name = res.indexOf('/') > 0 ? res.split('/')[1] : a.pos[2], r = res.split('/')[0];
    var d = this.findKind(r); if (d && !d.ns) ns = '';
    return (this.canI(a.flags.as, verb, res.split('/')[0], ns, name) ? 'yes' : 'no') + '\n';
  };

  P.kApiResources = function () {
    var self = this; return this.table(['NAME', 'SHORTNAMES', 'APIVERSION', 'NAMESPACED', 'KIND'], this.kinds.map(function (d) { return [d.plural, d.shorts.join(','), d.api, d.ns ? 'true' : 'false', d.kind]; }));
  };
  var EXPLAIN = {
    pod: 'KIND:       Pod\nVERSION:    v1\n\nDESCRIPTION:\n  Pod is a collection of containers that can run on a host.\n\nFIELDS:\n  apiVersion <string>\n  kind <string>\n  metadata <ObjectMeta>\n  spec <PodSpec>   containers, initContainers, volumes, nodeSelector, tolerations, affinity, securityContext, restartPolicy ...\n  status <PodStatus>\n',
    'pod.spec.containers': 'FIELDS:\n  name <string> -required-\n  image <string>\n  command <[]string>\n  args <[]string>\n  env <[]EnvVar>\n  resources <ResourceRequirements>   limits / requests\n  livenessProbe / readinessProbe / startupProbe <Probe>\n  securityContext <SecurityContext>\n  volumeMounts <[]VolumeMount>\n',
    deployment: 'KIND:       Deployment\nVERSION:    apps/v1\n\nFIELDS:\n  spec <DeploymentSpec>   replicas, selector -required-, template -required-, strategy, revisionHistoryLimit\n',
    service: 'KIND:       Service\nVERSION:    v1\n\nFIELDS:\n  spec <ServiceSpec>   type, selector, ports (port, targetPort, nodePort), clusterIP\n'
  };
  P.kExplain = function (a) { var k = (a.pos[0] || '').toLowerCase(); if (EXPLAIN[k]) return EXPLAIN[k]; var d = this.findKind(k.split('.')[0]); if (d) return 'KIND:       ' + d.kind + '\nVERSION:    ' + d.api + '\n\n(The simulator has detailed field docs for pod, pod.spec.containers, deployment, service. Use kubernetes.io/docs/reference for the rest.)\n'; throw new KErr('error: the server doesn\'t have a resource type "' + k + '"'); };

  P.kWait = function (a) {
    var f = a.flags, refs = this.parseRefs(a), r = refs[0], ns = f.n || this.ctxNs, self = this, cond = String(f['for'] || ''), mm = cond.match(/^condition=(\w+)(?:=(\w+))?$/), del = /^delete$/.test(cond);
    if (!r || !r.name) throw new KErr('error: resource name required');
    for (var i = 0; i < 60; i++) {
      var o = this.get(r.d.kind, ns, r.name);
      if (del) { if (!o) return r.d.singular + '/' + r.name + ' condition met\n'; }
      else if (!o) throw this.notFound(r.d, r.name);
      else if (mm) { var conds = (o.status && o.status.conditions) || []; var c = conds.filter(function (x) { return x.type.toLowerCase() === mm[1].toLowerCase(); })[0]; if (c && c.status === (mm[2] ? mm[2][0].toUpperCase() + mm[2].slice(1) : 'True')) return self.disp(r.d) + '/' + r.name + ' condition met\n'; if (o.kind === 'Pod' && mm[1].toLowerCase() === 'ready' && self.podReady(o)) return 'pod/' + r.name + ' condition met\n'; if (o.kind === 'Deployment' && mm[1].toLowerCase() === 'available' && o.status && o.status._complete) return self.disp(r.d) + '/' + r.name + ' condition met\n'; }
      this.settle(1);
    }
    throw new KErr('error: timed out waiting for the condition on ' + r.d.plural + '/' + r.name);
  };
  P.kConfig = function (a) {
    var sub = a.pos[0];
    if (sub === 'set-context') { if (a.flags.n || a.flags.namespace) this.ctxNs = a.flags.n || a.flags.namespace; return 'Context "kubernetes-admin@kubelab" modified.\n'; }
    if (sub === 'current-context') return 'kubernetes-admin@kubelab\n';
    if (sub === 'view') return 'apiVersion: v1\nclusters:\n- cluster:\n    server: https://192.168.49.2:6443\n  name: kubelab\ncontexts:\n- context:\n    cluster: kubelab\n    namespace: ' + this.ctxNs + '\n    user: kubernetes-admin\n  name: kubernetes-admin@kubelab\ncurrent-context: kubernetes-admin@kubelab\nkind: Config\n';
    if (sub === 'get-contexts') return 'CURRENT   NAME                      CLUSTER   AUTHINFO           NAMESPACE\n*         kubernetes-admin@kubelab  kubelab   kubernetes-admin   ' + this.ctxNs + '\n';
    return '';
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Sim;
})(typeof window !== 'undefined' ? window : globalThis);
