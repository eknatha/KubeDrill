/* KubeLab simulator — kubectl part 1: argument parsing, get/describe/logs/exec/top/auth/wait/explain, printers, jsonpath */
(function (root) {
  'use strict';
  var Sim = root.KL ? root.KL.Sim : require('./sim.js');
  var P = Sim.prototype, KErr = Sim.KErr, U = Sim.util, Y = Sim.Y;

  var VALUE_FLAGS = { n: 1, namespace: 1, o: 1, output: 1, l: 1, selector: 1, f: 1, filename: 1, c: 1, container: 1, p: 1, patch: 1, image: 1, replicas: 1, port: 1, 'target-port': 1, type: 1, 'from-literal': 1, 'from-file': 1, 'dry-run': 1, as: 1, tail: 1, k: 1, 'sort-by': 1, 'field-selector': 1, restart: 1, env: 1, e: 1, labels: 1, L: 1, 'grace-period': 1, timeout: 1, for: 1, min: 1, max: 1, 'cpu-percent': 1, requests: 1, limits: 1, serviceaccount: 1, user: 1, group: 1, clusterrole: 1, role: 1, verb: 1, resource: 1, 'resource-name': 1, schedule: 1, from: 1, name: 1, 'to-revision': 1, 'node-port': 1, 'cluster-ip': 1, 'tcp': 1, 'selector-label': 1, 'docker-server': 1, 'docker-username': 1, 'docker-password': 1, 'docker-email': 1, 'storage-class': 1, 'min-available': 1, 'max-unavailable': 1, 'overwrite-labels': 1, 'api-group': 1, 'rolebinding': 1, 'show-labels': 0, 'completions': 1, 'parallelism': 1, 'class': 1, 'rule': 1, 'default-backend': 1, 'external-name': 1, 'since': 1, 'limit-bytes': 1, 'template': 1, 'kustomize': 1, 'all-namespaces': 0, 'context': 1, 'cluster': 1, 'resource-version': 1, 'subresource': 1, 'v': 1 };
  var BOOL_SHORT = { A: 'all-namespaces', w: 'watch', i: 'stdin', t: 'tty', R: 'recursive' };

  function parseArgs(args) {
    var o = { pos: [], flags: {}, rest: null }, i;
    for (i = 0; i < args.length; i++) {
      var a = args[i];
      if (a === '--') { o.rest = args.slice(i + 1); break; }
      if (a.indexOf('--') === 0) {
        var eq = a.indexOf('='), key = eq > 0 ? a.slice(2, eq) : a.slice(2), val = eq > 0 ? a.slice(eq + 1) : null;
        if (val === null && VALUE_FLAGS[key] && i + 1 < args.length) val = args[++i];
        add(o.flags, key, val === null ? true : val);
      } else if (a.length > 1 && a[0] === '-' && !/^-\d/.test(a)) {
        if (/^-[A-Za-z]$/.test(a) && VALUE_FLAGS[a[1]]) add(o.flags, a[1], args[++i]);
        else if (/^-[A-Za-z]=/.test(a)) add(o.flags, a[1], a.slice(3));
        else if (a.length > 2 && VALUE_FLAGS[a[1]] && !/^-[itA]+$/.test(a)) add(o.flags, a[1], a.slice(2));
        else a.slice(1).split('').forEach(function (ch) { add(o.flags, BOOL_SHORT[ch] || ch, true); });
      } else o.pos.push(a);
    }
    function add(f, k, v) { if (k === 'namespace') k = 'n'; if (k === 'output') k = 'o'; if (k === 'selector') k = 'l'; if (k === 'filename') k = 'f'; if (k === 'container') k = 'c'; if (k === 'patch') k = 'p'; if (k === 'e') k = 'env'; if (f[k] === undefined) f[k] = v; else if (Array.isArray(f[k])) f[k].push(v); else f[k] = [f[k], v]; }
    return o;
  }
  function arr(v) { return v === undefined ? [] : Array.isArray(v) ? v : [v]; }
  P.parseArgs = parseArgs; P.arr = arr;

  P.nsOf = function (flags, d) { if (d && !d.ns) return ''; return flags.n || this.ctxNs; };

  P.kubectl = function (args, stdin) {
    try {
      var r = this.kubectlInner(args, stdin);
      if (typeof r === 'string') return { stdout: r, stderr: '', code: 0 };
      return r;
    } catch (e) {
      if (e instanceof KErr) return { stdout: '', stderr: e.message.replace(/\n?$/, '\n'), code: e.code || 1 };
      throw e;
    }
  };

  P.kubectlInner = function (args, stdin) {
    var a = parseArgs(args), verb = a.pos.shift();
    if (a.flags.as) this.asUser = a.flags.as; else this.asUser = null;
    if (a.flags.n === true) throw new KErr('error: flag needs an argument: \'n\' in -n');
    switch (verb) {
      case undefined: case 'help': return 'kubectl controls the Kubernetes cluster manager.\n\n Basic Commands: create, expose, run, set\n Deploy Commands: rollout, scale, autoscale\n Cluster Management: cordon, uncordon, drain, taint\n Troubleshooting: describe, logs, exec, top, events\n Advanced: apply, patch, replace, wait, auth, kustomize\n Settings: label, annotate\n Other: api-resources, explain, version, config\n\nUse "kubectl <command> --help" for more information.\n';
      case 'version': return 'Client Version: ' + Sim.VERSION + '\nKustomize Version: v5.4.2\nServer Version: ' + Sim.VERSION + '\n';
      case 'cluster-info': return 'Kubernetes control plane is running at https://192.168.49.2:6443\nCoreDNS is running at https://192.168.49.2:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy\n\nTo further debug and diagnose cluster problems, use \'kubectl cluster-info dump\'.\n';
      case 'get': return this.kGet(a);
      case 'describe': return this.kDescribe(a);
      case 'logs': case 'log': return this.kLogs(a);
      case 'exec': return this.kExec(a);
      case 'top': return this.kTop(a);
      case 'auth': return this.kAuth(a);
      case 'api-resources': return this.kApiResources();
      case 'explain': return this.kExplain(a);
      case 'events': return this.kEvents(a);
      case 'wait': return this.kWait(a);
      case 'config': return this.kConfig(a);
      case 'completion': return '';
      case 'port-forward': return 'Forwarding from 127.0.0.1:' + String(a.pos[1] || '8080').split(':')[0] + ' -> ' + String(a.pos[1] || '8080').split(':').pop() + '\n(port-forward is not available in the simulator — use kubectl exec ... -- wget -qO- <svc>)\n';
      default:
        if (this.kMutate) return this.kMutate(verb, a, stdin);
        throw new KErr('error: unknown command "' + verb + '" for "kubectl"');
    }
  };

  // ─── resolving "TYPE NAME" / "TYPE/NAME" ───
  P.parseRefs = function (a, opts) {
    var refs = [], pos = a.pos.slice(), self = this;
    if (!pos.length) return refs;
    var first = pos[0];
    if (first.indexOf('/') > 0) { pos.forEach(function (p) { var s = p.split('/'); var d = self.findKind(s[0]); if (!d) throw new KErr('error: the server doesn\'t have a resource type "' + s[0] + '"'); refs.push({ d: d, name: s[1] }); }); return refs; }
    var kinds = first.split(','), names = pos.slice(1);
    var ds = kinds.map(function (k) { var d = self.findKind(k); if (!d) { if (k === 'all') return 'all'; throw new KErr('error: the server doesn\'t have a resource type "' + k + '"'); } return d; });
    if (ds[0] === 'all') ds = ['pods', 'services', 'deployments', 'replicasets', 'statefulsets', 'daemonsets', 'jobs', 'cronjobs'].map(function (k) { return self.findKind(k); });
    if (!names.length) ds.forEach(function (d) { refs.push({ d: d, name: null }); });
    else names.forEach(function (n) { refs.push({ d: ds[0], name: n }); });
    void opts; return refs;
  };
  P.notFound = function (d, name) { return new KErr('Error from server (NotFound): ' + d.plural + (d.group ? '.' + d.group : '') + ' "' + name + '" not found'); };

  // ─── printers ───
  function table(cols, rows) {
    var w = cols.map(function (c, i) { return Math.max(c.length, rows.reduce(function (m, r) { return Math.max(m, String(r[i] === undefined ? '' : r[i]).length); }, 0)); });
    function line(r) { return r.map(function (c, i) { return i === r.length - 1 ? String(c) : String(c === undefined ? '' : c).padEnd(w[i] + 3); }).join(''); }
    return [line(cols)].concat(rows.map(line)).join('\n') + '\n';
  }
  P.table = table;
  function ready(p) { var cs = p.status.containerStatuses || []; if (!cs.length) return '0/' + p.spec.containers.length; return cs.filter(function (c) { return c.ready; }).length + '/' + p.spec.containers.length; }
  function portsStr(s) { return (s.spec.ports || []).map(function (p) { return p.port + (p.nodePort ? ':' + p.nodePort : '') + '/' + p.protocol; }).join(','); }

  P.cols = function (d, wide, o) {
    var self = this, age = function (x) { return self.fmtAge(x.metadata.creationTimestamp); };
    var C = {
      Pod: [['NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE'].concat(wide ? ['IP', 'NODE', 'NOMINATED NODE', 'READINESS GATES'] : []), function (p) { var rc = (p.status.containerStatuses || []).reduce(function (m, c) { return m + c.restartCount; }, 0); return [p.metadata.name, ready(p), self.podStatus(p), rc, age(p)].concat(wide ? [p.status.podIP || '<none>', p.spec.nodeName || '<none>', '<none>', '<none>'] : []); }],
      Deployment: [['NAME', 'READY', 'UP-TO-DATE', 'AVAILABLE', 'AGE'].concat(wide ? ['CONTAINERS', 'IMAGES', 'SELECTOR'] : []), function (x) { var s = x.status || {}; return [x.metadata.name, (s.readyReplicas || 0) + '/' + x.spec.replicas, s.updatedReplicas || 0, s.availableReplicas || 0, age(x)].concat(wide ? [x.spec.template.spec.containers.map(function (c) { return c.name; }).join(','), x.spec.template.spec.containers.map(function (c) { return c.image; }).join(','), Object.keys(x.spec.selector.matchLabels || {}).map(function (k) { return k + '=' + x.spec.selector.matchLabels[k]; }).join(',')] : []); }],
      ReplicaSet: [['NAME', 'DESIRED', 'CURRENT', 'READY', 'AGE'], function (x) { var s = x.status || {}; return [x.metadata.name, x.spec.replicas, s.replicas || 0, s.readyReplicas || 0, age(x)]; }],
      StatefulSet: [['NAME', 'READY', 'AGE'], function (x) { return [x.metadata.name, ((x.status || {}).readyReplicas || 0) + '/' + x.spec.replicas, age(x)]; }],
      DaemonSet: [['NAME', 'DESIRED', 'CURRENT', 'READY', 'UP-TO-DATE', 'AVAILABLE', 'NODE SELECTOR', 'AGE'], function (x) { var s = x.status || {}; return [x.metadata.name, s.desiredNumberScheduled || 0, s.currentNumberScheduled || 0, s.numberReady || 0, s.currentNumberScheduled || 0, s.numberReady || 0, '<none>', age(x)]; }],
      Job: [['NAME', 'STATUS', 'COMPLETIONS', 'DURATION', 'AGE'], function (x) { var s = x.status || {}; return [x.metadata.name, s.complete ? 'Complete' : s.finished ? 'Failed' : 'Running', (s.succeeded || 0) + '/' + x.spec.completions, s.complete ? (s.completionTime - x.metadata.creationTimestamp) + 's' : self.fmtAge(x.metadata.creationTimestamp), age(x)]; }],
      CronJob: [['NAME', 'SCHEDULE', 'TIMEZONE', 'SUSPEND', 'ACTIVE', 'LAST SCHEDULE', 'AGE'], function (x) { return [x.metadata.name, x.spec.schedule, '<none>', x.spec.suspend ? 'True' : 'False', 0, '<none>', age(x)]; }],
      Service: [['NAME', 'TYPE', 'CLUSTER-IP', 'EXTERNAL-IP', 'PORT(S)', 'AGE'].concat(wide ? ['SELECTOR'] : []), function (x) { return [x.metadata.name, x.spec.type, x.spec.clusterIP || '<none>', x.spec.type === 'LoadBalancer' ? '<pending>' : x.spec.type === 'ExternalName' ? x.spec.externalName : '<none>', portsStr(x) || '<none>', age(x)].concat(wide ? [Object.keys(x.spec.selector || {}).map(function (k) { return k + '=' + x.spec.selector[k]; }).join(',') || '<none>'] : []); }],
      Endpoints: [['NAME', 'ENDPOINTS', 'AGE'], function (x) { var ad = []; (x.subsets || []).forEach(function (s) { (s.addresses || []).forEach(function (a2) { (s.ports || []).forEach(function (p) { ad.push(a2.ip + ':' + p.port); }); }); }); return [x.metadata.name, ad.join(',') || '<none>', age(x)]; }],
      ConfigMap: [['NAME', 'DATA', 'AGE'], function (x) { return [x.metadata.name, Object.keys(x.data || {}).length, age(x)]; }],
      Secret: [['NAME', 'TYPE', 'DATA', 'AGE'], function (x) { return [x.metadata.name, x.type, Object.keys(x.data || {}).length, age(x)]; }],
      Namespace: [['NAME', 'STATUS', 'AGE'], function (x) { return [x.metadata.name, x.metadata.deletionTimestamp ? 'Terminating' : 'Active', age(x)]; }],
      Node: [['NAME', 'STATUS', 'ROLES', 'AGE', 'VERSION'].concat(wide ? ['INTERNAL-IP', 'EXTERNAL-IP', 'OS-IMAGE'] : []), function (x) { var cp = (x.metadata.labels || {})['node-role.kubernetes.io/control-plane'] !== undefined; return [x.metadata.name, (Sim.nodeReady(x) ? 'Ready' : 'NotReady') + (x.spec.unschedulable ? ',SchedulingDisabled' : ''), cp ? 'control-plane' : '<none>', age(x), Sim.VERSION].concat(wide ? [x.status.addresses[0].address, '<none>', x.status.nodeInfo.osImage] : []); }],
      PersistentVolume: [['NAME', 'CAPACITY', 'ACCESS MODES', 'RECLAIM POLICY', 'STATUS', 'CLAIM', 'STORAGECLASS', 'REASON', 'AGE'], function (x) { var cr = x.spec.claimRef; return [x.metadata.name, x.spec.capacity.storage, (x.spec.accessModes || []).map(function (m) { return { ReadWriteOnce: 'RWO', ReadOnlyMany: 'ROX', ReadWriteMany: 'RWX' }[m] || m; }).join(','), x.spec.persistentVolumeReclaimPolicy, x.status.phase, cr ? cr.namespace + '/' + cr.name : '', x.spec.storageClassName || '', '', age(x)]; }],
      PersistentVolumeClaim: [['NAME', 'STATUS', 'VOLUME', 'CAPACITY', 'ACCESS MODES', 'STORAGECLASS', 'AGE'], function (x) { return [x.metadata.name, x.status.phase, x.spec.volumeName || '', (x.status.capacity || {}).storage || '', (x.spec.accessModes || []).map(function (m) { return { ReadWriteOnce: 'RWO', ReadOnlyMany: 'ROX', ReadWriteMany: 'RWX' }[m] || m; }).join(','), x.spec.storageClassName === undefined ? 'standard' : x.spec.storageClassName, age(x)]; }],
      StorageClass: [['NAME', 'PROVISIONER', 'RECLAIMPOLICY', 'VOLUMEBINDINGMODE', 'AGE'], function (x) { var def = (x.metadata.annotations || {})['storageclass.kubernetes.io/is-default-class'] === 'true'; return [x.metadata.name + (def ? ' (default)' : ''), x.provisioner, x.reclaimPolicy || 'Delete', x.volumeBindingMode || 'Immediate', age(x)]; }],
      NetworkPolicy: [['NAME', 'POD-SELECTOR', 'AGE'], function (x) { var m = (x.spec.podSelector || {}).matchLabels || {}; return [x.metadata.name, Object.keys(m).map(function (k) { return k + '=' + m[k]; }).join(',') || '<none>', age(x)]; }],
      Ingress: [['NAME', 'CLASS', 'HOSTS', 'ADDRESS', 'PORTS', 'AGE'], function (x) { return [x.metadata.name, x.spec.ingressClassName || '<none>', (x.spec.rules || []).map(function (r) { return r.host || '*'; }).join(',') || '*', x.spec.ingressClassName === 'nginx' ? '192.168.49.2' : '', '80', age(x)]; }],
      IngressClass: [['NAME', 'CONTROLLER', 'PARAMETERS', 'AGE'], function (x) { return [x.metadata.name, x.spec.controller, '<none>', age(x)]; }],
      ServiceAccount: [['NAME', 'SECRETS', 'AGE'], function (x) { return [x.metadata.name, 0, age(x)]; }],
      Role: [['NAME', 'CREATED AT'], function (x) { return [x.metadata.name, '2026-11-09T07:00:00Z']; }],
      ClusterRole: [['NAME', 'CREATED AT'], function (x) { return [x.metadata.name, '2026-11-09T07:00:00Z']; }],
      RoleBinding: [['NAME', 'ROLE', 'AGE'], function (x) { return [x.metadata.name, x.roleRef.kind + '/' + x.roleRef.name, age(x)]; }],
      ClusterRoleBinding: [['NAME', 'ROLE', 'AGE'], function (x) { return [x.metadata.name, x.roleRef.kind + '/' + x.roleRef.name, age(x)]; }],
      ResourceQuota: [['NAME', 'AGE', 'REQUEST', 'LIMIT'], function (x) { var h = x.spec.hard || {}, u = self.quotaUsed(x.metadata.namespace), req = [], lim = []; Object.keys(h).forEach(function (k) { var used = u[k] !== undefined ? (k.indexOf('cpu') >= 0 ? U.fmtCpu(u[k]) : k.indexOf('memory') >= 0 ? Math.round(u[k]) + 'Mi' : u[k]) : 0; (/^limits\./.test(k) ? lim : req).push(k + ': ' + used + '/' + h[k]); }); return [x.metadata.name, age(x), req.join(', '), lim.join(', ')]; }],
      LimitRange: [['NAME', 'CREATED AT'], function (x) { return [x.metadata.name, '2026-11-09T07:00:00Z']; }],
      HorizontalPodAutoscaler: [['NAME', 'REFERENCE', 'TARGETS', 'MINPODS', 'MAXPODS', 'REPLICAS', 'AGE'], function (x) { var s = x.status || {}, m = ((x.spec.metrics || [])[0] || {}).resource, tgt = (m && m.target && m.target.averageUtilization) || x.spec.targetCPUUtilizationPercentage || 80; return [x.metadata.name, x.spec.scaleTargetRef.kind + '/' + x.spec.scaleTargetRef.name, (s.currentUtil === undefined || s.currentUtil === null ? '<unknown>' : s.currentUtil + '%') + '/' + tgt + '%', x.spec.minReplicas, x.spec.maxReplicas, s.currentReplicas || 0, age(x)]; }],
      PodDisruptionBudget: [['NAME', 'MIN AVAILABLE', 'MAX UNAVAILABLE', 'ALLOWED DISRUPTIONS', 'AGE'], function (x) { return [x.metadata.name, x.spec.minAvailable !== undefined ? x.spec.minAvailable : 'N/A', x.spec.maxUnavailable !== undefined ? x.spec.maxUnavailable : 'N/A', (x.status || {}).disruptionsAllowed || 0, age(x)]; }],
      CustomResourceDefinition: [['NAME', 'CREATED AT'], function (x) { return [x.metadata.name, '2026-11-09T07:' + String(x.metadata.creationTimestamp % 60).padStart(2, '0') + ':00Z']; }],
      Gateway: [['NAME', 'CLASS', 'ADDRESS', 'PROGRAMMED', 'AGE'], function (x) { return [x.metadata.name, x.spec.gatewayClassName, '192.168.49.2', 'True', age(x)]; }],
      GatewayClass: [['NAME', 'CONTROLLER', 'ACCEPTED', 'AGE'], function (x) { return [x.metadata.name, x.spec.controllerName, 'True', age(x)]; }],
      HTTPRoute: [['NAME', 'HOSTNAMES', 'AGE'], function (x) { return [x.metadata.name, JSON.stringify(x.spec.hostnames || []), age(x)]; }]
    };
    var c = C[d.kind] || [['NAME', 'AGE'], function (x) { return [x.metadata.name, age(x)]; }];
    void o; return c;
  };

  // ─── get ───
  P.kGet = function (a) {
    var self = this, refs = this.parseRefs(a), f = a.flags, o = f.o, out = [], multi = false;
    if (!refs.length) throw new KErr('You must specify the type of resource to get. Use "kubectl api-resources" for a complete list of supported resources.\n\nerror: Required resource not specified.');
    var items = [], single = refs.length === 1 && refs[0].name && refs.length === 1 && a.pos.length <= 2 || (refs.length === 1 && refs[0].name && a.pos[0].indexOf('/') > 0);
    if (f.f) { var objs = this.loadManifests(f.f, null); objs.forEach(function (ob) { var d = self.kindOf(ob); if (!d) return; var g = self.objs[self.key(ob.kind, d.ns ? (ob.metadata.namespace || self.ctxNs) : '', ob.metadata.name)]; if (g) items.push({ d: d, o: g }); }); }
    refs.forEach(function (r) {
      if (!r.d) return; var ns = f['all-namespaces'] ? null : self.nsOf(f, r.d);
      if (r.name) { var ob = self.objs[self.key(r.d.kind, r.d.ns ? ns : '', r.name)]; if (!ob) throw self.notFound(r.d, r.name); items.push({ d: r.d, o: ob }); }
      else { var sel = f.l ? String(f.l) : null; var list = self.list(r.d, ns, sel); if (f['field-selector']) list = self.fieldSel(list, f['field-selector']); list.forEach(function (ob) { items.push({ d: r.d, o: ob }); }); }
    });
    if (refs.length > 1 || (refs[0] && !refs[0].name && refs.length > 0)) multi = true;
    // ----- output formats
    if (f['sort-by'] && o === 'name') { var sp0 = String(f['sort-by']).replace(/^[{}]|[{}]$/g, '').replace(/^\./, ''); items = items.map(function (it, i) { return { it: it, i: i, k: self.jsonpathVals(self.exportObj(it.o), sp0)[0] }; }).sort(function (p, q) { return p.k < q.k ? -1 : p.k > q.k ? 1 : p.i - q.i; }).map(function (z) { return z.it; }); }
    if (o === 'name') return items.map(function (it) { return self.disp(it.d) + '/' + it.o.metadata.name; }).join('\n') + (items.length ? '\n' : '');
    if (o === 'yaml' || o === 'json') {
      var clean = items.map(function (it) { return self.exportObj(it.o); });
      if (single || (items.length === 1 && refs[0].name)) return o === 'yaml' ? Y.dump(clean[0], { lineWidth: -1, noRefs: true }) : JSON.stringify(clean[0], null, 2) + '\n';
      var list2 = { apiVersion: 'v1', kind: 'List', metadata: { resourceVersion: '' }, items: clean };
      return o === 'yaml' ? Y.dump(list2, { lineWidth: -1, noRefs: true }) : JSON.stringify(list2, null, 2) + '\n';
    }
    if (o && /^jsonpath/.test(o)) {
      var tpl = o.replace(/^jsonpath(-as-json)?=/, '').replace(/^['"]|['"]$/g, '');
      var root2 = (single || (items.length === 1 && refs[0].name)) ? self.exportObj(items[0].o) : { apiVersion: 'v1', kind: 'List', items: items.map(function (it) { return self.exportObj(it.o); }) };
      return this.jsonpath(root2, tpl);
    }
    if (o && /^custom-columns/.test(o)) {
      var spec = o.replace(/^custom-columns=/, '').split(','), heads = spec.map(function (s) { return s.split(':')[0]; });
      return table(heads, items.map(function (it) { var ex = self.exportObj(it.o); return spec.map(function (s) { var p = s.split(':')[1] || ''; var r = self.jsonpathVals(ex, p.replace(/^\./, '')); return r.length ? r.join(',') : '<none>'; }); }));
    }
    if (!items.length) return (f['all-namespaces'] || true) ? 'No resources found' + (refs[0].d && refs[0].d.ns && !f['all-namespaces'] ? ' in ' + self.nsOf(f, refs[0].d) + ' namespace' : '') + '.\n' : '';
    // tables, grouped by kind
    var groups = [], seen = {};
    items.forEach(function (it) { if (!seen[it.d.kind]) { seen[it.d.kind] = { d: it.d, items: [] }; groups.push(seen[it.d.kind]); } seen[it.d.kind].items.push(it.o); });
    var txt = groups.map(function (g) {
      var wide = o === 'wide', cd = self.cols(g.d, wide), cols = cd[0].slice(), rows = g.items.map(function (x) { return cd[1](x); }), pre = '';
      if (f['all-namespaces'] && g.d.ns) { cols.unshift('NAMESPACE'); rows = rows.map(function (r, i) { return [g.items[i].metadata.namespace].concat(r); }); }
      if (f['show-labels']) { cols.push('LABELS'); rows = rows.map(function (r, i) { return r.concat([Object.keys(g.items[i].metadata.labels || {}).map(function (k) { return k + '=' + g.items[i].metadata.labels[k]; }).join(',') || '<none>']); }); }
      if (f.L) { arr(f.L).forEach(function (lk) { cols.push(lk.toUpperCase()); rows = rows.map(function (r, i) { return r.concat([(g.items[i].metadata.labels || {})[lk] || '']); }); }); }
      if (f['sort-by']) { var sp = String(f['sort-by']).replace(/^[{}]|[{}]$/g, ''); var idx = g.items.map(function (x, i) { return { i: i, k: self.jsonpathVals(self.exportObj(x), sp.replace(/^\./, ''))[0] }; }); idx.sort(function (p, q) { return p.k < q.k ? -1 : p.k > q.k ? 1 : 0; }); rows = idx.map(function (z) { return rows[z.i]; }); }
      if (g.d.kind === 'Event') return '';
      if (f['no-headers']) return rows.map(function (r) { return r.join('   '); }).join('\n') + '\n';
      if (items.length > 0 && groups.length > 1) pre = '';
      return pre + table(cols, rows);
    }).join('\n');
    if (arr(a.pos[0]).length && /(^|,)(events?|ev)$/.test(a.pos[0])) return this.kEvents(a);
    return txt;
  };
  P.fieldSel = function (list, fs) {
    return list.filter(function (o) { return String(fs).split(',').every(function (t) { var m = t.match(/^([\w.]+)(!?=)=?(.*)$/); if (!m) return true; var v = m[1].split('.').reduce(function (x, k) { return x == null ? x : x[k]; }, o); var eq = String(v) === m[3]; return m[2] === '!=' ? !eq : eq; }); });
  };
  // object as shown by -o yaml (adds status, strips internals)
  P.exportObj = function (o) {
    var c = U.clone(o); delete c._skipAdmit;
    var m = c.metadata; var ts = m.creationTimestamp; if (typeof ts === 'number') m.creationTimestamp = '2026-11-09T07:' + String(Math.floor(ts / 60) % 60).padStart(2, '0') + ':' + String(ts % 60).padStart(2, '0') + 'Z';
    if (typeof m.deletionTimestamp === 'number') m.deletionTimestamp = m.creationTimestamp;
    if (c.status && c.status._complete !== undefined) delete c.status._complete;
    if (c.status) { ['msg', 'unsched', 'volWait'].forEach(function (k) { delete c.status[k]; }); if (c.kind === 'Pod') { (c.status.containerStatuses || []).forEach(function (cs) { var s = cs.state; ['running', 'terminated'].forEach(function (k) { if (s[k]) { Object.keys(s[k]).forEach(function (kk) { if (/At$/.test(kk) && typeof s[k][kk] === 'number') s[k][kk] = '2026-11-09T07:00:00Z'; }); } }); }); if (c.status.startTime) c.status.startTime = '2026-11-09T07:00:00Z'; } }
    if (c.kind === 'Pod' && c.status && c.status.conditions) c.status.conditions = c.status.conditions.map(function (x) { return x; });
    return c;
  };

  // ─── jsonpath (subset) ───
  P.jsonpathVals = function (obj, path) {
    var segs = [], re = /\.?([A-Za-z0-9_\-\/\\.]+(?:\\.[A-Za-z0-9_\-\/]+)*)|\[(\*|\d+|\?\(@\.[^)]+\))\]/g;
    path = String(path).replace(/^\$/, ''); var cur = [obj], m, i;
    var tokens = []; var p = path.replace(/\\\./g, '\u0001');
    var rx = /\[([^\]]+)\]|\.?([^.\[\]]+)/g; while ((m = rx.exec(p))) tokens.push(m[1] !== undefined ? { br: m[1] } : { key: m[2].replace(/\u0001/g, '.') });
    void segs; void re;
    for (i = 0; i < tokens.length; i++) {
      var t = tokens[i], nxt = [];
      cur.forEach(function (v) {
        if (v == null) return;
        if (t.key !== undefined) { if (t.key === '*') { Object.keys(v).forEach(function (k) { nxt.push(v[k]); }); } else if (v[t.key] !== undefined) nxt.push(v[t.key]); }
        else if (t.br === '*') { (Array.isArray(v) ? v : Object.keys(v).map(function (k) { return v[k]; })).forEach(function (x) { nxt.push(x); }); }
        else if (/^\d+$/.test(t.br)) { if (Array.isArray(v) && v[+t.br] !== undefined) nxt.push(v[+t.br]); }
        else if ((m = t.br.match(/^\?\(@\.([\w.]+)\s*==\s*['"]?([^'")]*)['"]?\)$/))) { (Array.isArray(v) ? v : []).forEach(function (x) { var val = m[1].split('.').reduce(function (y, k) { return y == null ? y : y[k]; }, x); if (String(val) === m[2]) nxt.push(x); }); }
      });
      cur = nxt;
    }
    return cur.map(function (v) { return typeof v === 'object' ? JSON.stringify(v) : String(v); });
  };
  P.jsonpath = function (root, tpl) {
    var self = this, out = '';
    tpl = tpl.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    function evalTpl(t, ctx) {
      var res = '', i = 0;
      while (i < t.length) {
        var s = t.indexOf('{', i); if (s < 0) { res += t.slice(i); break; } res += t.slice(i, s);
        var e = t.indexOf('}', s); var expr = t.slice(s + 1, e);
        if (/^range\s+/.test(expr)) {
          var depth = 1, j = e + 1, endAt = -1; while (j < t.length) { var n1 = t.indexOf('{', j); if (n1 < 0) break; var n2 = t.indexOf('}', n1); var inner = t.slice(n1 + 1, n2); if (/^range\s/.test(inner)) depth++; else if (inner === 'end') { depth--; if (!depth) { endAt = n1; break; } } j = n2 + 1; }
          var body = t.slice(e + 1, endAt), path = expr.replace(/^range\s+/, '').replace(/^\./, '');
          var arr2 = self.jsonpathRaw(ctx, path); arr2.forEach(function (it) { res += evalTpl(body, it); });
          i = t.indexOf('}', endAt) + 1; continue;
        }
        if (expr === 'end') { i = e + 1; continue; }
        if (/^"/.test(expr)) { res += expr.replace(/^"|"$/g, '').replace(/\\n/g, '\n').replace(/\\t/g, '\t'); i = e + 1; continue; }
        res += self.jsonpathVals(ctx, expr.replace(/^\./, '')).join(' '); i = e + 1;
      }
      return res;
    }
    out = evalTpl(tpl, root); return out;
  };
  P.jsonpathRaw = function (obj, path) {
    var vals = [obj], m, tokens = [], p = path.replace(/\\\./g, '\u0001'), rx = /\[([^\]]+)\]|\.?([^.\[\]]+)/g;
    while ((m = rx.exec(p))) tokens.push(m[1] !== undefined ? { br: m[1] } : { key: m[2].replace(/\u0001/g, '.') });
    tokens.forEach(function (t) { var n = []; vals.forEach(function (v) { if (v == null) return; if (t.key !== undefined) { if (v[t.key] !== undefined) n.push(v[t.key]); } else if (t.br === '*') (Array.isArray(v) ? v : []).forEach(function (x) { n.push(x); }); else if (/^\d+$/.test(t.br)) { if (Array.isArray(v) && v[+t.br] !== undefined) n.push(v[+t.br]); } }); vals = n; });
    return vals;
  };

  // ─── events ───
  P.kEvents = function (a) {
    var f = a.flags, ns = f['all-namespaces'] ? null : (f.n || this.ctxNs), self = this;
    var evs = this.events.filter(function (e) { return !ns || e.ns === ns; });
    if (!evs.length) return 'No resources found in ' + (ns || 'all') + ' namespace.\n';
    var rows = evs.slice(-40).map(function (e) { return [self.fmtAge(e.t), e.type, e.reason, e.kind.toLowerCase() + '/' + e.name, e.msg]; });
    return table(['LAST SEEN', 'TYPE', 'REASON', 'OBJECT', 'MESSAGE'], rows);
  };
  P.eventsFor = function (o) {
    var self = this, es = this.events.filter(function (e) { return e.uid === o.metadata.uid; }).slice(-12);
    if (!es.length) return 'Events:            <none>\n';
    return 'Events:\n' + table(['  Type', 'Reason', 'Age', 'From', 'Message'], es.map(function (e) { return ['  ' + e.type, e.reason, self.fmtAge(e.first) + (e.count > 1 ? ' (x' + e.count + ' over ' + self.fmtAge(e.first) + ')' : ''), /Scheduling|Scheduled/.test(e.reason) ? 'default-scheduler' : e.kind === 'Pod' ? 'kubelet' : e.kind.toLowerCase() + '-controller', e.msg]; })).replace(/^/, '').split('\n').map(function (l, i) { return i === 0 ? l : l; }).join('\n').replace(/\n  ---/g, '');
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Sim;
})(typeof window !== 'undefined' ? window : globalThis);
