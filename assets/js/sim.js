/* KubeDrill cluster simulator — core.
   A small, deterministic, in-memory Kubernetes: object store, controllers (Deployment/ReplicaSet/
   StatefulSet/DaemonSet/Job/HPA), scheduler, kubelet pod lifecycle, endpoints, PVC binding,
   admission (quota, limitrange, pod security), NetworkPolicy and RBAC evaluation.
   It is a TEACHING MODEL, not a real cluster: behaviours are simplified but follow real kubectl
   output and failure modes (Pending, ImagePullBackOff, CrashLoopBackOff, OOMKilled, ...). */
(function (root) {
  'use strict';
  var Y = (typeof jsyaml !== 'undefined') ? jsyaml : require('js-yaml');
  var VERSION = 'v1.34.0';

  // kind, plural, singular, short names, api group, apiVersion, namespaced
  var KDEF = [
    ['Pod', 'pods', 'pod', ['po'], '', 'v1', 1],
    ['Deployment', 'deployments', 'deployment', ['deploy'], 'apps', 'apps/v1', 1],
    ['ReplicaSet', 'replicasets', 'replicaset', ['rs'], 'apps', 'apps/v1', 1],
    ['StatefulSet', 'statefulsets', 'statefulset', ['sts'], 'apps', 'apps/v1', 1],
    ['DaemonSet', 'daemonsets', 'daemonset', ['ds'], 'apps', 'apps/v1', 1],
    ['Job', 'jobs', 'job', [], 'batch', 'batch/v1', 1],
    ['CronJob', 'cronjobs', 'cronjob', ['cj'], 'batch', 'batch/v1', 1],
    ['Service', 'services', 'service', ['svc'], '', 'v1', 1],
    ['Endpoints', 'endpoints', 'endpoints', ['ep'], '', 'v1', 1],
    ['ConfigMap', 'configmaps', 'configmap', ['cm'], '', 'v1', 1],
    ['Secret', 'secrets', 'secret', [], '', 'v1', 1],
    ['Namespace', 'namespaces', 'namespace', ['ns'], '', 'v1', 0],
    ['Node', 'nodes', 'node', ['no'], '', 'v1', 0],
    ['PersistentVolume', 'persistentvolumes', 'persistentvolume', ['pv'], '', 'v1', 0],
    ['PersistentVolumeClaim', 'persistentvolumeclaims', 'persistentvolumeclaim', ['pvc'], '', 'v1', 1],
    ['StorageClass', 'storageclasses', 'storageclass', ['sc'], 'storage.k8s.io', 'storage.k8s.io/v1', 0],
    ['PriorityClass', 'priorityclasses', 'priorityclass', ['pc'], 'scheduling.k8s.io', 'scheduling.k8s.io/v1', 0],
    ['ValidatingWebhookConfiguration', 'validatingwebhookconfigurations', 'validatingwebhookconfiguration', [], 'admissionregistration.k8s.io', 'admissionregistration.k8s.io/v1', 0],
    ['NetworkPolicy', 'networkpolicies', 'networkpolicy', ['netpol'], 'networking.k8s.io', 'networking.k8s.io/v1', 1],
    ['Ingress', 'ingresses', 'ingress', ['ing'], 'networking.k8s.io', 'networking.k8s.io/v1', 1],
    ['IngressClass', 'ingressclasses', 'ingressclass', [], 'networking.k8s.io', 'networking.k8s.io/v1', 0],
    ['ServiceAccount', 'serviceaccounts', 'serviceaccount', ['sa'], '', 'v1', 1],
    ['Role', 'roles', 'role', [], 'rbac.authorization.k8s.io', 'rbac.authorization.k8s.io/v1', 1],
    ['RoleBinding', 'rolebindings', 'rolebinding', [], 'rbac.authorization.k8s.io', 'rbac.authorization.k8s.io/v1', 1],
    ['ClusterRole', 'clusterroles', 'clusterrole', [], 'rbac.authorization.k8s.io', 'rbac.authorization.k8s.io/v1', 0],
    ['ClusterRoleBinding', 'clusterrolebindings', 'clusterrolebinding', [], 'rbac.authorization.k8s.io', 'rbac.authorization.k8s.io/v1', 0],
    ['ResourceQuota', 'resourcequotas', 'resourcequota', ['quota'], '', 'v1', 1],
    ['LimitRange', 'limitranges', 'limitrange', ['limits'], '', 'v1', 1],
    ['HorizontalPodAutoscaler', 'horizontalpodautoscalers', 'horizontalpodautoscaler', ['hpa'], 'autoscaling', 'autoscaling/v2', 1],
    ['PodDisruptionBudget', 'poddisruptionbudgets', 'poddisruptionbudget', ['pdb'], 'policy', 'policy/v1', 1],
    ['Event', 'events', 'event', ['ev'], '', 'v1', 1],
    ['CustomResourceDefinition', 'customresourcedefinitions', 'customresourcedefinition', ['crd', 'crds'], 'apiextensions.k8s.io', 'apiextensions.k8s.io/v1', 0],
    ['GatewayClass', 'gatewayclasses', 'gatewayclass', ['gc'], 'gateway.networking.k8s.io', 'gateway.networking.k8s.io/v1', 0],
    ['Gateway', 'gateways', 'gateway', ['gtw'], 'gateway.networking.k8s.io', 'gateway.networking.k8s.io/v1', 1],
    ['HTTPRoute', 'httproutes', 'httproute', [], 'gateway.networking.k8s.io', 'gateway.networking.k8s.io/v1', 1]
  ].map(function (d) { return { kind: d[0], plural: d[1], singular: d[2], shorts: d[3], group: d[4], api: d[5], ns: !!d[6] }; });

  function KErr(msg, code) { this.message = msg; this.code = code || 1; this.name = 'KErr'; }
  KErr.prototype = Object.create(Error.prototype);

  // ─── helpers ───
  function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
  function parseCpu(v) { if (v == null) return 0; v = String(v); return /m$/.test(v) ? parseFloat(v) : parseFloat(v) * 1000; }
  function parseMem(v) { // → MiB
    if (v == null) return 0; v = String(v); var m = v.match(/^([0-9.]+)\s*([A-Za-z]*)$/); if (!m) return 0;
    var n = parseFloat(m[1]), u = m[2];
    var f = { '': 1 / 1048576, Ki: 1 / 1024, Mi: 1, Gi: 1024, Ti: 1048576, K: 1000 / 1048576, M: 1e6 / 1048576, G: 1e9 / 1048576, k: 1000 / 1048576 };
    return n * (f[u] !== undefined ? f[u] : 1);
  }
  function parseStorage(v) { return parseMem(v); }
  function fmtCpu(m) { return m % 1000 === 0 ? String(m / 1000) : m + 'm'; }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); }
  function alnum(n, seedv) { var cs = 'bcdfghjklmnpqrstvwxz2456789', s = ''; var h = seedv; for (var i = 0; i < n; i++) { h = Math.imul(h ^ (h >>> 15), 2246822507) + 374761393 | 0; s += cs[(h >>> 0) % cs.length]; } return s; }
  function matchSel(sel, labels) {
    labels = labels || {};
    if (sel == null) return true;
    if (typeof sel === 'string') {
      if (!sel.trim()) return true;
      return sel.split(',').every(function (t) {
        t = t.trim(); var m;
        if ((m = t.match(/^([^!=\s]+)\s*(==?|!=)\s*(.*)$/))) return m[2] === '!=' ? labels[m[1]] !== m[3] : labels[m[1]] === m[3];
        if ((m = t.match(/^([^\s]+)\s+in\s+\((.*)\)$/))) return m[2].split(',').map(function (x) { return x.trim(); }).indexOf(labels[m[1]]) >= 0;
        if ((m = t.match(/^([^\s]+)\s+notin\s+\((.*)\)$/))) return m[2].split(',').map(function (x) { return x.trim(); }).indexOf(labels[m[1]]) < 0;
        if (t[0] === '!') return labels[t.slice(1)] === undefined;
        return labels[t] !== undefined;
      });
    }
    var ml = sel.matchLabels || {};
    for (var k in ml) if (labels[k] !== ml[k]) return false;
    var me = sel.matchExpressions || [];
    for (var i = 0; i < me.length; i++) {
      var e = me[i], v = labels[e.key];
      if (e.operator === 'In' && (e.values || []).indexOf(v) < 0) return false;
      if (e.operator === 'NotIn' && (e.values || []).indexOf(v) >= 0) return false;
      if (e.operator === 'Exists' && v === undefined) return false;
      if (e.operator === 'DoesNotExist' && v !== undefined) return false;
    }
    return true;
  }
  function emptySel(sel) { return !sel || (!(sel.matchLabels && Object.keys(sel.matchLabels).length) && !(sel.matchExpressions && sel.matchExpressions.length)); }

  // Images the simulator "knows". Unknown registries/images are assumed to exist.
  var KNOWN_TAGS = {
    nginx: /^(latest|stable|alpine|mainline|1(\.([0-9]|1[0-9]|2[0-9]))?(\.\d{1,2})?(-alpine|-perl|-bookworm)?)$/,
    httpd: /^(latest|alpine|2(\.[0-9])?(\.\d{1,2})?(-alpine)?)$/,
    busybox: /^(latest|1(\.\d+){0,2}(-glibc|-musl|-uclibc)?)$/,
    alpine: /^(latest|3(\.\d+){0,2})$/,
    redis: /^(latest|alpine|[5-8](\.\d+){0,2}(-alpine)?)$/,
    postgres: /^(latest|1[0-9](\.\d+)?(-alpine)?)$/,
    mysql: /^(latest|[58](\.\d+){0,2})$/,
    ubuntu: /^(latest|\d\d\.\d\d|jammy|noble)$/,
    node: /^(latest|\d+(\.\d+){0,2}(-alpine|-slim)?|lts)$/,
    python: /^(latest|3(\.\d+){0,2}(-slim|-alpine)?)$/,
    'nginxinc/nginx-unprivileged': /^(latest|1(\.\d+){0,2}(-alpine)?)$/,
    'curlimages/curl': /^(latest|\d+(\.\d+){0,2})$/,
    'polinux/stress': /^(latest|1\.0\.4)$/
  };
  var ROOT_IMAGES = /^(nginx|httpd|busybox|alpine|ubuntu|debian|redis|polinux\/stress|curlimages\/curl-root)$/;
  var VULNS = { // canned `trivy image` results (illustrative, simulated)
    'nginx:1.19': { crit: 14, high: 62, med: 120 }, 'nginx:1.21': { crit: 6, high: 31, med: 70 }, 'nginx:1.25': { crit: 1, high: 9, med: 40 },
    'nginx:1.27-alpine': { crit: 0, high: 0, med: 2 }, 'nginx:alpine': { crit: 0, high: 0, med: 2 }, 'nginx:latest': { crit: 1, high: 5, med: 33 },
    'redis:6.0': { crit: 9, high: 41, med: 90 }, 'redis:7-alpine': { crit: 0, high: 1, med: 5 },
    'busybox:1.36': { crit: 0, high: 0, med: 1 }, 'python:3.8': { crit: 12, high: 55, med: 110 }, 'python:3.12-slim': { crit: 0, high: 2, med: 14 }
  };

  function imageRepo(img) { return String(img).replace(/^(docker\.io\/|library\/)/, '').replace(/:[^:\/]*$/, '').replace(/@.*$/, ''); }
  function imageTag(img) { var m = String(img).match(/:([^:\/@]+)$/); return m ? m[1] : 'latest'; }
  function imageProblem(img, pullSecrets) {
    if (!img) return 'image not set';
    var repo = imageRepo(img), tag = imageTag(img);
    if (/(^|\/)(private\.registry|registry\.internal|gcr\.io\/private|corp\.registry)/.test(repo) || /private[-.]registry/.test(repo)) {
      if (!pullSecrets || !pullSecrets.length) return 'pull access denied, repository does not exist or may require authorization: authorization failed: no basic auth credentials';
    }
    if (/nonexist|doesnotexist|notfound|does-not-exist/.test(repo)) return 'repository does not exist or may require authorization';
    var re = KNOWN_TAGS[repo];
    if (re && !re.test(tag)) return 'manifest for ' + repo + ':' + tag + ' not found: manifest unknown';
    if (/nonexist|doesnotexist|notfound|broken|badtag|typo/.test(tag)) return 'manifest for ' + repo + ':' + tag + ' not found: manifest unknown';
    return null;
  }

  function Sim(opts) { this.opts = opts || {}; this.reset(); }
  var P = Sim.prototype;
  Sim.KDEF = KDEF; Sim.KErr = KErr; Sim.VERSION = VERSION; Sim.Y = Y;
  Sim.util = { clone: clone, parseCpu: parseCpu, parseMem: parseMem, fmtCpu: fmtCpu, matchSel: matchSel, hash: hash, imageProblem: imageProblem, VULNS: VULNS };

  P.reset = function () {
    this.t = 100; this.seed = 7; this.objs = {}; this.pi = {}; this.events = []; this.fs = {}; this.cwd = '/home/student'; this.env = { HOME: '/home/student', USER: 'student' };
    this.ctxNs = 'default'; this.uidN = 1; this.ipN = {}; this.cipN = 10; this.npN = 0; this.crds = []; this.dirty = 0; this.listeners = []; this.loadgen = {}; this.history = []; this.pvN = 0;
    this.kinds = KDEF.slice(); this.flags = {};
    this.fs['/home/student/.keep'] = '';
    this.bootstrap();
  };
  P.on = function (fn) { this.listeners.push(fn); };
  P.changed = function () { this.dirty++; for (var i = 0; i < this.listeners.length; i++) try { this.listeners[i](); } catch (e) { /* ignore */ } };
  P.rnd = function () { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed; };
  P.newUid = function () { var n = this.uidN++; return ('00000000' + (n * 2654435761 >>> 0).toString(16)).slice(-8) + '-0000-4000-8000-' + ('000000000000' + n.toString(16)).slice(-12); };

  // ─── kinds registry ───
  P.findKind = function (tok) {
    tok = String(tok || '').toLowerCase(); if (!tok) return null;
    var parts = tok.split('.'), head = parts[0], grp = parts.slice(1).join('.');
    for (var i = 0; i < this.kinds.length; i++) {
      var d = this.kinds[i];
      if (d.kind.toLowerCase() === tok || d.plural === head || d.singular === head || d.shorts.indexOf(head) >= 0) {
        if (!grp || grp === d.group || d.group.indexOf(grp) === 0) return d;
      }
    }
    return null;
  };
  P.kindOf = function (obj) {
    for (var i = 0; i < this.kinds.length; i++) if (this.kinds[i].kind === obj.kind) return this.kinds[i];
    return null;
  };
  P.disp = function (d) { return d.singular + (d.group ? '.' + d.group : ''); };
  P.key = function (kind, ns, name) { return kind + '/' + (ns || '') + '/' + name; };
  P.get = function (kind, ns, name) { var d = this.findKind(kind); if (!d) return null; return this.objs[this.key(d.kind, d.ns ? ns : '', name)] || null; };
  P.list = function (kind, ns, sel) {
    var d = typeof kind === 'string' ? this.findKind(kind) : kind; if (!d) return [];
    var out = [], pre = d.kind + '/';
    for (var k in this.objs) {
      if (k.indexOf(pre) !== 0) continue; var o = this.objs[k];
      if (d.ns && ns && o.metadata.namespace !== ns) continue;
      if (sel && !matchSel(sel, o.metadata.labels)) continue;
      out.push(o);
    }
    out.sort(function (a, b) { return a.metadata.name < b.metadata.name ? -1 : a.metadata.name > b.metadata.name ? 1 : 0; });
    return out;
  };
  P.put = function (o) { var d = this.kindOf(o); this.objs[this.key(o.kind, d && d.ns ? o.metadata.namespace : '', o.metadata.name)] = o; this.changed(); return o; };
  P.remove = function (o, noCascade) {
    var d = this.kindOf(o); delete this.objs[this.key(o.kind, d && d.ns ? o.metadata.namespace : '', o.metadata.name)]; delete this.pi[o.metadata.uid];
    if (!noCascade) this.gc(o.metadata.uid);
    if (o.kind === 'Namespace') this.cascadeNs(o.metadata.name);
    if (o.kind === 'CustomResourceDefinition') this.dropCrd(o);
    this.changed();
  };
  P.gc = function (uid) {
    var self = this;
    Object.keys(this.objs).forEach(function (k) {
      var o = self.objs[k]; if (!o) return;
      var or = (o.metadata.ownerReferences || []).some(function (r) { return r.uid === uid; });
      if (or) { if (o.kind === 'Pod' && o.spec.nodeName) { o.metadata.deletionTimestamp = self.t; self.changed(); } else self.remove(o); }
    });
  };
  P.cascadeNs = function (ns) {
    var self = this;
    Object.keys(this.objs).forEach(function (k) { var o = self.objs[k]; if (o && o.metadata.namespace === ns) { delete self.objs[k]; delete self.pi[o.metadata.uid]; } });
  };
  P.ev = function (o, type, reason, msg) {
    var last = this.events[this.events.length - 1], uidO = o.metadata.uid;
    for (var i = this.events.length - 1; i >= 0 && i > this.events.length - 40; i--) {
      var e = this.events[i]; if (e.uid === uidO && e.reason === reason && e.msg === msg) { e.count++; e.t = this.t; return; }
    }
    this.events.push({ uid: uidO, ns: o.metadata.namespace || '', kind: o.kind, name: o.metadata.name, type: type, reason: reason, msg: msg, t: this.t, first: this.t, count: 1 });
    if (this.events.length > 600) this.events.splice(0, 100);
    void last;
  };

  // ─── bootstrap cluster ───
  P.bootstrap = function () {
    var self = this;
    function node(name, cp, ip) {
      return { apiVersion: 'v1', kind: 'Node', metadata: { name: name, labels: Object.assign({ 'kubernetes.io/hostname': name, 'kubernetes.io/os': 'linux', 'kubernetes.io/arch': 'amd64' }, cp ? { 'node-role.kubernetes.io/control-plane': '' } : {}) },
        spec: { taints: cp ? [{ key: 'node-role.kubernetes.io/control-plane', effect: 'NoSchedule' }] : [] },
        status: { allocatable: cp ? { cpu: '2', memory: '4Gi', pods: '110' } : { cpu: '4', memory: '8Gi', pods: '110' }, capacity: cp ? { cpu: '2', memory: '4Gi', pods: '110' } : { cpu: '4', memory: '8Gi', pods: '110' }, addresses: [{ type: 'InternalIP', address: ip }, { type: 'Hostname', address: name }], nodeInfo: { kubeletVersion: VERSION, osImage: 'Debian GNU/Linux 12 (bookworm)', containerRuntimeVersion: 'containerd://1.7.18', kernelVersion: '6.8.0-sim', architecture: 'amd64' } } };
    }
    ['default', 'kube-system', 'kube-public', 'kube-node-lease'].forEach(function (n) { self.createRaw({ apiVersion: 'v1', kind: 'Namespace', metadata: { name: n } }); });
    this.createRaw(node('cp1', true, '192.168.49.2'));
    this.createRaw(node('worker1', false, '192.168.49.3'));
    this.createRaw(node('worker2', false, '192.168.49.4'));
    this.createRaw({ apiVersion: 'storage.k8s.io/v1', kind: 'StorageClass', metadata: { name: 'standard', annotations: { 'storageclass.kubernetes.io/is-default-class': 'true' } }, provisioner: 'rancher.io/local-path', reclaimPolicy: 'Delete', volumeBindingMode: 'WaitForFirstConsumer' });
    this.createRaw({ apiVersion: 'networking.k8s.io/v1', kind: 'IngressClass', metadata: { name: 'nginx' }, spec: { controller: 'k8s.io/ingress-nginx' } });
    this.createRaw({ apiVersion: 'gateway.networking.k8s.io/v1', kind: 'GatewayClass', metadata: { name: 'nginx' }, spec: { controllerName: 'gateway.nginx.org/nginx-gateway-controller' } });
    // built-in cluster roles (simplified)
    var rules = {
      'cluster-admin': [{ apiGroups: ['*'], resources: ['*'], verbs: ['*'] }],
      admin: [{ apiGroups: ['*'], resources: ['*'], verbs: ['*'] }],
      edit: [{ apiGroups: ['', 'apps', 'batch'], resources: ['*'], verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'] }],
      view: [{ apiGroups: ['', 'apps', 'batch'], resources: ['*'], verbs: ['get', 'list', 'watch'] }]
    };
    Object.keys(rules).forEach(function (n) { self.createRaw({ apiVersion: 'rbac.authorization.k8s.io/v1', kind: 'ClusterRole', metadata: { name: n }, rules: rules[n] }); });
    this.createRaw({ apiVersion: 'rbac.authorization.k8s.io/v1', kind: 'ClusterRoleBinding', metadata: { name: 'cluster-admin' }, roleRef: { kind: 'ClusterRole', name: 'cluster-admin', apiGroup: 'rbac.authorization.k8s.io' }, subjects: [{ kind: 'Group', name: 'system:masters' }] });
    // system workloads
    this.createRaw({ apiVersion: 'apps/v1', kind: 'Deployment', metadata: { name: 'coredns', namespace: 'kube-system', labels: { 'k8s-app': 'kube-dns' } }, spec: { replicas: 2, selector: { matchLabels: { 'k8s-app': 'kube-dns' } }, template: { metadata: { labels: { 'k8s-app': 'kube-dns' } }, spec: { containers: [{ name: 'coredns', image: 'registry.k8s.io/coredns/coredns:v1.11.1', ports: [{ containerPort: 53 }] }] } } } });
    this.createRaw({ apiVersion: 'apps/v1', kind: 'Deployment', metadata: { name: 'metrics-server', namespace: 'kube-system', labels: { 'k8s-app': 'metrics-server' } }, spec: { replicas: 1, selector: { matchLabels: { 'k8s-app': 'metrics-server' } }, template: { metadata: { labels: { 'k8s-app': 'metrics-server' } }, spec: { containers: [{ name: 'metrics-server', image: 'registry.k8s.io/metrics-server/metrics-server:v0.7.1' }] } } } });
    this.createRaw({ apiVersion: 'v1', kind: 'Service', metadata: { name: 'kube-dns', namespace: 'kube-system' }, spec: { clusterIP: '10.96.0.10', selector: { 'k8s-app': 'kube-dns' }, ports: [{ port: 53, protocol: 'UDP', name: 'dns' }] } });
    this.createRaw({ apiVersion: 'v1', kind: 'Service', metadata: { name: 'kubernetes', namespace: 'default' }, spec: { clusterIP: '10.96.0.1', ports: [{ port: 443, protocol: 'TCP', name: 'https' }] } });
    [['etcd-cp1', 'registry.k8s.io/etcd:3.5.15-0', 'etcd'], ['kube-apiserver-cp1', 'registry.k8s.io/kube-apiserver:' + VERSION, 'kube-apiserver'], ['kube-controller-manager-cp1', 'registry.k8s.io/kube-controller-manager:' + VERSION, 'kube-controller-manager'], ['kube-scheduler-cp1', 'registry.k8s.io/kube-scheduler:' + VERSION, 'kube-scheduler']].forEach(function (p) {
      self.createRaw({ apiVersion: 'v1', kind: 'Pod', metadata: { name: p[0], namespace: 'kube-system', labels: { component: p[2], tier: 'control-plane' } }, spec: { nodeName: 'cp1', containers: [{ name: p[2], image: p[1] }], tolerations: [{ operator: 'Exists' }] } });
    });
    ['worker1', 'worker2', 'cp1'].forEach(function (n) {
      self.createRaw({ apiVersion: 'v1', kind: 'Pod', metadata: { name: 'kube-proxy-' + alnum(5, hash(n)), namespace: 'kube-system', labels: { 'k8s-app': 'kube-proxy' } }, spec: { nodeName: n, containers: [{ name: 'kube-proxy', image: 'registry.k8s.io/kube-proxy:' + VERSION }], tolerations: [{ operator: 'Exists' }] } });
    });
    this.settle(12);
    this.t += 3000; // cluster has "been up" for a while
    this.events = [];
  };

  // ─── admission + creation ───
  P.defaults = function (o) {
    var d = this.kindOf(o), m = o.metadata = o.metadata || {};
    if (!d) throw new KErr('error: unable to recognize "' + (o.kind || '?') + '": no matches for kind "' + o.kind + '" in version "' + o.apiVersion + '"');
    if (!m.name && !m.generateName) throw new KErr('error: error validating data: metadata.name is required');
    if (!m.name && m.generateName) m.name = m.generateName + alnum(5, this.rnd());
    if (d.ns && !m.namespace) m.namespace = this.ctxNs;
    if (!d.ns) delete m.namespace;
    if (m.name.length > 253 || !/^[a-z0-9]([-a-z0-9.]*[a-z0-9])?$/.test(m.name) && o.kind !== 'ClusterRole' && o.kind !== 'Role' && o.kind !== 'RoleBinding' && o.kind !== 'ClusterRoleBinding')
      throw new KErr('The ' + d.singular + ' "' + m.name + '" is invalid: metadata.name: Invalid value: "' + m.name + '": a lowercase RFC 1123 subdomain must consist of lower case alphanumeric characters, \'-\' or \'.\', and must start and end with an alphanumeric character');
    o.apiVersion = d.api;
    if (!m.uid) { m.uid = this.newUid(); m.creationTimestamp = this.t; m.resourceVersion = String(this.uidN * 7); m.generation = 1; }
    var s = o.spec = o.spec || (['ConfigMap', 'Secret', 'ClusterRole', 'Role', 'RoleBinding', 'ClusterRoleBinding', 'StorageClass', 'ServiceAccount', 'Event'].indexOf(o.kind) >= 0 ? undefined : {});
    switch (o.kind) {
      case 'Deployment': case 'ReplicaSet': case 'StatefulSet':
        if (s.replicas === undefined) s.replicas = 1;
        if (!s.selector) throw new KErr('The ' + d.singular + ' "' + m.name + '" is invalid: spec.selector: Required value');
        if (!s.template || !s.template.spec) throw new KErr('The ' + d.singular + ' "' + m.name + '" is invalid: spec.template: Required value');
        if (!matchSel(s.selector, s.template.metadata && s.template.metadata.labels)) throw new KErr('The ' + d.singular + ' "' + m.name + '" is invalid: spec.template.metadata.labels: Invalid value: map[string]string{...}: `selector` does not match template `labels`');
        if (o.kind === 'Deployment' && !s.strategy) s.strategy = { type: 'RollingUpdate', rollingUpdate: { maxSurge: '25%', maxUnavailable: '25%' } };
        break;
      case 'DaemonSet': if (!s.selector || !s.template) throw new KErr('The daemonset "' + m.name + '" is invalid: spec.selector: Required value'); break;
      case 'Job': if (s.completions === undefined) s.completions = 1; if (s.parallelism === undefined) s.parallelism = 1; if (s.template && s.template.spec && !s.template.spec.restartPolicy) throw new KErr('The Job "' + m.name + '" is invalid: spec.template.spec.restartPolicy: Required value: valid values: "OnFailure", "Never"'); break;
      case 'Service':
        s.type = s.type || 'ClusterIP';
        if (!s.ports || !s.ports.length) { if (s.clusterIP !== 'None' && s.type !== 'ExternalName') throw new KErr('The Service "' + m.name + '" is invalid: spec.ports: Required value'); }
        (s.ports || []).forEach(function (p) { p.protocol = p.protocol || 'TCP'; if (p.targetPort === undefined) p.targetPort = p.port; });
        if (!s.clusterIP && s.type !== 'ExternalName') s.clusterIP = '10.96.' + Math.floor(this.cipN / 250) + '.' + (this.cipN++ % 250 + 2);
        if ((s.type === 'NodePort' || s.type === 'LoadBalancer')) (s.ports || []).forEach(function (p, i) { if (!p.nodePort) p.nodePort = 30000 + (this.npN++ % 2000) + i; }, this);
        break;
      case 'PersistentVolumeClaim': if (!s.accessModes) throw new KErr('The PersistentVolumeClaim "' + m.name + '" is invalid: spec.accessModes: Required value: at least 1 access mode is required'); o.status = o.status || { phase: 'Pending' }; break;
      case 'PersistentVolume': o.status = o.status || { phase: 'Available' }; s.persistentVolumeReclaimPolicy = s.persistentVolumeReclaimPolicy || 'Retain'; break;
      case 'Pod': this.defaultPod(o); break;
      case 'Namespace': o.status = { phase: 'Active' }; break;
      case 'HorizontalPodAutoscaler': s.minReplicas = s.minReplicas || 1; break;
      case 'CronJob': if (!s.schedule) throw new KErr('The CronJob "' + m.name + '" is invalid: spec.schedule: Required value'); break;
      case 'Secret':
        o.type = o.type || 'Opaque'; o.data = o.data || {};
        if (o.stringData) { for (var k in o.stringData) o.data[k] = (typeof Buffer !== 'undefined' ? Buffer.from(String(o.stringData[k])).toString('base64') : btoa(unescape(encodeURIComponent(String(o.stringData[k]))))); delete o.stringData; }
        break;
      case 'RoleBinding': case 'ClusterRoleBinding':
        if (!o.roleRef) throw new KErr('The ' + d.singular + ' "' + m.name + '" is invalid: roleRef: Required value');
        break;
    }
    if (o.kind === 'Pod') return o;
    return o;
  };
  P.defaultPod = function (o) {
    var s = o.spec;
    if (!s.containers || !s.containers.length) throw new KErr('The Pod "' + o.metadata.name + '" is invalid: spec.containers: Required value');
    s.restartPolicy = s.restartPolicy || 'Always'; s.dnsPolicy = s.dnsPolicy || 'ClusterFirst'; s.serviceAccountName = s.serviceAccountName || 'default';
    s.containers.forEach(function (c) { if (!c.name) throw new KErr('The Pod "' + o.metadata.name + '" is invalid: spec.containers[0].name: Required value'); c.imagePullPolicy = c.imagePullPolicy || (/:latest$|^[^:]+$/.test(c.image || '') ? 'Always' : 'IfNotPresent'); });
    o.status = o.status || { phase: 'Pending' };
  };

  P.admitPod = function (o) {
    var ns = o.metadata.namespace, nso = this.get('Namespace', '', ns), s = o.spec, self = this;
    if (!nso) throw new KErr('Error from server (NotFound): namespaces "' + ns + '" not found');
    // LimitRange defaults + max
    this.list('LimitRange', ns).forEach(function (lr) {
      (lr.spec.limits || []).forEach(function (l) {
        if (l.type !== 'Container') return;
        s.containers.forEach(function (c) {
          c.resources = c.resources || {}; c.resources.limits = c.resources.limits || {}; c.resources.requests = c.resources.requests || {};
          if (l.default) for (var k in l.default) if (c.resources.limits[k] === undefined) c.resources.limits[k] = l.default[k];
          if (l.defaultRequest) for (var k2 in l.defaultRequest) if (c.resources.requests[k2] === undefined) c.resources.requests[k2] = l.defaultRequest[k2];
          if (l.max) for (var k3 in l.max) {
            var lim = c.resources.limits[k3];
            var over = lim !== undefined && (k3 === 'cpu' ? parseCpu(lim) > parseCpu(l.max[k3]) : parseMem(lim) > parseMem(l.max[k3]));
            if (over) throw new KErr('Error from server (Forbidden): pods "' + o.metadata.name + '" is forbidden: maximum ' + k3 + ' usage per Container is ' + l.max[k3] + ', but limit is ' + lim);
          }
        });
      });
    });
    // ResourceQuota
    this.list('ResourceQuota', ns).forEach(function (q) {
      var hard = q.spec.hard || {}, used = self.quotaUsed(ns, o);
      ['requests.cpu', 'limits.cpu', 'requests.memory', 'limits.memory'].forEach(function (k) {
        if (hard[k] === undefined) return;
        var kind = k.split('.')[0], res = k.split('.')[1], miss = s.containers.filter(function (c) { return !(c.resources && c.resources[kind] && c.resources[kind][res] !== undefined); });
        if (miss.length) throw new KErr('Error from server (Forbidden): pods "' + o.metadata.name + '" is forbidden: failed quota: ' + q.metadata.name + ': must specify ' + k.replace('requests.', 'requests.').replace(/^(requests|limits)\./, '$1.') + ' for: ' + miss.map(function (c) { return c.name; }).join(','));
      });
      var np = 1, curPods = used.pods;
      if (hard.pods !== undefined && curPods + np > parseInt(hard.pods, 10)) throw new KErr('Error from server (Forbidden): pods "' + o.metadata.name + '" is forbidden: exceeded quota: ' + q.metadata.name + ', requested: pods=1, used: pods=' + curPods + ', limited: pods=' + hard.pods);
      [['requests.cpu', 'cpu', parseCpu, fmtCpu], ['limits.cpu', 'cpu', parseCpu, fmtCpu], ['requests.memory', 'mem', parseMem, function (v) { return Math.round(v) + 'Mi'; }], ['limits.memory', 'mem', parseMem, function (v) { return Math.round(v) + 'Mi'; }]].forEach(function (r) {
        if (hard[r[0]] === undefined) return;
        var part = r[0].split('.')[0], res = r[0].split('.')[1], add = 0;
        s.containers.forEach(function (c) { var v = c.resources && c.resources[part] && c.resources[part][res]; if (v !== undefined) add += r[2](v); });
        if (used[r[0]] + add > r[2](hard[r[0]])) throw new KErr('Error from server (Forbidden): pods "' + o.metadata.name + '" is forbidden: exceeded quota: ' + q.metadata.name + ', requested: ' + r[0] + '=' + r[3](add) + ', used: ' + r[0] + '=' + r[3](used[r[0]]) + ', limited: ' + r[0] + '=' + hard[r[0]]);
      });
    });
    // Pod Security Admission
    var lvl = nso.metadata.labels && nso.metadata.labels['pod-security.kubernetes.io/enforce'];
    if (lvl && lvl !== 'privileged') {
      var v = this.psaViolations(o, lvl);
      if (v.length) throw new KErr('Error from server (Forbidden): pods "' + o.metadata.name + '" is forbidden: violates PodSecurity "' + lvl + ':latest": ' + v.join(', '));
    }
  };
  P.psaViolations = function (o, lvl) {
    var s = o.spec, v = [], cs = (s.containers || []).concat(s.initContainers || []), psc = s.securityContext || {};
    function names(f) { return cs.filter(f).map(function (c) { return '"' + c.name + '"'; }).join(', '); }
    var n;
    if (s.hostNetwork) v.push('host namespaces (hostNetwork=true)'); if (s.hostPID) v.push('host namespaces (hostPID=true)'); if (s.hostIPC) v.push('host namespaces (hostIPC=true)');
    if ((n = names(function (c) { return c.securityContext && c.securityContext.privileged; }))) v.push('privileged (container ' + n + ' must not set securityContext.privileged=true)');
    if ((s.volumes || []).some(function (x) { return x.hostPath; })) v.push('hostPath volumes (volume "' + (s.volumes.filter(function (x) { return x.hostPath; })[0].name) + '")');
    if (lvl === 'restricted') {
      if ((n = names(function (c) { return !(c.securityContext && c.securityContext.allowPrivilegeEscalation === false); }))) v.push('allowPrivilegeEscalation != false (container ' + n + ' must set securityContext.allowPrivilegeEscalation=false)');
      if ((n = names(function (c) { var d = c.securityContext && c.securityContext.capabilities && c.securityContext.capabilities.drop; return !(d && d.indexOf('ALL') >= 0); }))) v.push('unrestricted capabilities (container ' + n + ' must set securityContext.capabilities.drop=["ALL"])');
      if ((n = names(function (c) { var r = c.securityContext && c.securityContext.runAsNonRoot !== undefined ? c.securityContext.runAsNonRoot : psc.runAsNonRoot; return r !== true; }))) v.push('runAsNonRoot != true (pod or container ' + n + ' must set securityContext.runAsNonRoot=true)');
      if ((n = names(function (c) { var sp = (c.securityContext && c.securityContext.seccompProfile) || psc.seccompProfile; return !(sp && (sp.type === 'RuntimeDefault' || sp.type === 'Localhost')); }))) v.push('seccompProfile (pod or container ' + n + ' must set securityContext.seccompProfile.type to "RuntimeDefault" or "Localhost")');
    }
    return v;
  };
  P.quotaUsed = function (ns, extra) {
    var u = { pods: 0, 'requests.cpu': 0, 'limits.cpu': 0, 'requests.memory': 0, 'limits.memory': 0 };
    this.list('Pod', ns).forEach(function (p) {
      if (p.status.phase === 'Succeeded' || p.status.phase === 'Failed') return; u.pods++;
      p.spec.containers.forEach(function (c) { var r = c.resources || {}; if (r.requests) { u['requests.cpu'] += parseCpu(r.requests.cpu); u['requests.memory'] += parseMem(r.requests.memory); } if (r.limits) { u['limits.cpu'] += parseCpu(r.limits.cpu); u['limits.memory'] += parseMem(r.limits.memory); } });
    });
    void extra; return u;
  };

  // low-level create (no kubectl semantics)
  P.createRaw = function (obj) {
    var d = this.kindOf(obj); if (!d) throw new KErr('error: no matches for kind "' + obj.kind + '" in version "' + obj.apiVersion + '"');
    this.defaults(obj);
    var existing = this.objs[this.key(obj.kind, d.ns ? obj.metadata.namespace : '', obj.metadata.name)];
    if (existing) throw new KErr('Error from server (AlreadyExists): ' + d.plural + (d.group ? '.' + d.group : '') + ' "' + obj.metadata.name + '" already exists');
    if (d.ns && !this.get('Namespace', '', obj.metadata.namespace) && obj.metadata.namespace) throw new KErr('Error from server (NotFound): namespaces "' + obj.metadata.namespace + '" not found');
    if (obj.kind === 'Pod' && !(obj.metadata.ownerReferences && obj.metadata.ownerReferences.length && obj._skipAdmit)) this.admitPod(obj);
    delete obj._skipAdmit;
    this.put(obj);
    if (obj.kind === 'Namespace') this.createRaw({ apiVersion: 'v1', kind: 'ServiceAccount', metadata: { name: 'default', namespace: obj.metadata.name } });
    if (obj.kind === 'CustomResourceDefinition') this.registerCrd(obj);
    return obj;
  };
  P.registerCrd = function (crd) {
    var sp = crd.spec || {}, n = sp.names || {};
    if (!n.plural || !n.kind || !sp.group) throw new KErr('The CustomResourceDefinition "' + crd.metadata.name + '" is invalid: spec.names: Required value');
    if (crd.metadata.name !== n.plural + '.' + sp.group) throw new KErr('The CustomResourceDefinition "' + crd.metadata.name + '" is invalid: metadata.name: Invalid value: "' + crd.metadata.name + '": must be spec.names.plural+"."+spec.group');
    var ver = ((sp.versions || [])[0] || {}).name || 'v1';
    this.kinds.push({ kind: n.kind, plural: n.plural, singular: n.singular || n.kind.toLowerCase(), shorts: n.shortNames || [], group: sp.group, api: sp.group + '/' + ver, ns: sp.scope !== 'Cluster', custom: true });
    crd.status = { acceptedNames: n, conditions: [{ type: 'Established', status: 'True' }] };
  };
  P.dropCrd = function (crd) {
    var n = (crd.spec && crd.spec.names) || {}, self = this;
    Object.keys(this.objs).forEach(function (k) { if (k.indexOf(n.kind + '/') === 0) delete self.objs[k]; });
    this.kinds = this.kinds.filter(function (d) { return !(d.custom && d.kind === n.kind); });
  };

  // ─── controllers & kubelet ───
  P.fastForward = function () { this.settle(25); };
  P.tick = function () { this.t++; this.reconcile(); };
  P.settle = function (n) { for (var i = 0; i < (n || 20); i++) { this.t++; this.reconcile(); } };
  P.reconcile = function () {
    var self = this;
    this.lc('Deployment', function (d) { self.recDeployment(d); });
    this.lc('ReplicaSet', function (r) { self.recReplicaSet(r); });
    this.lc('StatefulSet', function (s) { self.recStatefulSet(s); });
    this.lc('DaemonSet', function (s) { self.recDaemonSet(s); });
    this.lc('Job', function (j) { self.recJob(j); });
    this.lc('PersistentVolumeClaim', function (c) { self.recPvc(c); });
    this.lc('Pod', function (p) { self.stepPod(p); });
    this.lc('Service', function (s) { self.recService(s); });
    this.lc('HorizontalPodAutoscaler', function (h) { self.recHpa(h); });
    this.lc('ReplicaSet', function (r) { self.statusRs(r); });
    this.lc('Deployment', function (d) { self.statusDeployment(d); });
    this.lc('PodDisruptionBudget', function (b) { self.statusPdb(b); });
    this.evictTaints();
  };
  P.lc = function (kind, fn) { var arr = this.list(kind); for (var i = 0; i < arr.length; i++) { var o = arr[i]; if (this.objs[this.key(o.kind, o.metadata.namespace || '', o.metadata.name)] === o) fn(o); } };
  function owner(o, kind) { var r = (o.metadata.ownerReferences || []).filter(function (x) { return x.kind === kind; })[0]; return r; }
  function ownerRef(o) { return [{ apiVersion: o.apiVersion, kind: o.kind, name: o.metadata.name, uid: o.metadata.uid, controller: true }]; }
  P.podsOf = function (o) { return this.list('Pod', o.metadata.namespace).filter(function (p) { return (p.metadata.ownerReferences || []).some(function (r) { return r.uid === o.metadata.uid; }); }); };
  function podTemplateHash(tpl) { return alnum(10, hash(JSON.stringify(tpl))); }
  function intOrPct(v, total, up) { if (typeof v === 'string' && /%$/.test(v)) { var x = total * parseFloat(v) / 100; return up ? Math.ceil(x) : Math.floor(x); } return parseInt(v, 10) || 0; }

  P.recDeployment = function (d) {
    var s = d.spec, hsh = podTemplateHash(s.template), ns = d.metadata.namespace, self = this;
    var all = this.list('ReplicaSet', ns).filter(function (r) { return (r.metadata.ownerReferences || []).some(function (x) { return x.uid === d.metadata.uid; }); });
    var cur = all.filter(function (r) { return r.metadata.labels['pod-template-hash'] === hsh; })[0];
    var maxRev = all.reduce(function (m, r) { return Math.max(m, parseInt(r.metadata.annotations['deployment.kubernetes.io/revision'] || 0, 10)); }, 0);
    if (!cur) {
      var tpl = clone(s.template); tpl.metadata = tpl.metadata || {}; tpl.metadata.labels = Object.assign({}, tpl.metadata.labels, { 'pod-template-hash': hsh });
      var sel = clone(s.selector); sel.matchLabels = Object.assign({}, sel.matchLabels, { 'pod-template-hash': hsh });
      cur = this.createRaw({ apiVersion: 'apps/v1', kind: 'ReplicaSet', metadata: { name: d.metadata.name + '-' + hsh, namespace: ns, labels: Object.assign({}, tpl.metadata.labels), annotations: { 'deployment.kubernetes.io/desired-replicas': String(s.replicas), 'deployment.kubernetes.io/revision': String(maxRev + 1) }, ownerReferences: ownerRef(d) }, spec: { replicas: 0, selector: sel, template: tpl } });
      all.push(cur); this.ev(d, 'Normal', 'ScalingReplicaSet', 'Scaled up replica set ' + cur.metadata.name + ' from 0 to ' + 0);
    } else if (parseInt(cur.metadata.annotations['deployment.kubernetes.io/revision'], 10) < maxRev) {
      cur.metadata.annotations['deployment.kubernetes.io/revision'] = String(maxRev + 1); // rollback → becomes newest revision
    }
    if (s.paused) return;
    var old = all.filter(function (r) { return r !== cur; });
    var oldTotal = old.reduce(function (a, r) { return a + r.spec.replicas; }, 0);
    var strat = s.strategy || {}, ru = strat.rollingUpdate || {};
    if (strat.type === 'Recreate') {
      if (oldTotal > 0) { old.forEach(function (r) { if (r.spec.replicas) { r.spec.replicas = 0; self.changed(); } }); return; }
      if (cur.spec.replicas !== s.replicas) { cur.spec.replicas = s.replicas; this.changed(); }
      return;
    }
    var surge = intOrPct(ru.maxSurge !== undefined ? ru.maxSurge : '25%', s.replicas, true), unav = intOrPct(ru.maxUnavailable !== undefined ? ru.maxUnavailable : '25%', s.replicas, false);
    if (surge === 0 && unav === 0) unav = 1;
    var total = cur.spec.replicas + oldTotal, maxTotal = s.replicas + surge;
    if (!old.some(function (r) { return r.spec.replicas > 0; })) { // pure scaling
      if (cur.spec.replicas !== s.replicas) { this.ev(d, 'Normal', 'ScalingReplicaSet', 'Scaled ' + (s.replicas > cur.spec.replicas ? 'up' : 'down') + ' replica set ' + cur.metadata.name + ' from ' + cur.spec.replicas + ' to ' + s.replicas); cur.spec.replicas = s.replicas; this.changed(); }
      return;
    }
    var up = Math.max(0, Math.min(maxTotal - total, s.replicas - cur.spec.replicas));
    if (up > 0) { this.ev(d, 'Normal', 'ScalingReplicaSet', 'Scaled up replica set ' + cur.metadata.name + ' from ' + cur.spec.replicas + ' to ' + (cur.spec.replicas + up)); cur.spec.replicas += up; this.changed(); }
    var avail = this.availableOf(cur) + old.reduce(function (a, r) { return a + self.availableOf(r); }, 0), minAvail = s.replicas - unav;
    var down = Math.max(0, avail - minAvail);
    old.forEach(function (r) {
      if (r.spec.replicas <= 0) return;
      var unready = r.spec.replicas - self.availableOf(r), kill = Math.min(r.spec.replicas, unready + down);
      if (kill > 0) { down = Math.max(0, down - Math.max(0, kill - unready)); self.ev(d, 'Normal', 'ScalingReplicaSet', 'Scaled down replica set ' + r.metadata.name + ' from ' + r.spec.replicas + ' to ' + (r.spec.replicas - kill)); r.spec.replicas -= kill; self.changed(); }
    });
    // prune history
    var hist = all.filter(function (r) { return r.spec.replicas === 0 && r !== cur; }).sort(function (a, b) { return parseInt(a.metadata.annotations['deployment.kubernetes.io/revision'], 10) - parseInt(b.metadata.annotations['deployment.kubernetes.io/revision'], 10); });
    while (hist.length > (s.revisionHistoryLimit === undefined ? 10 : s.revisionHistoryLimit)) this.remove(hist.shift());
  };
  P.availableOf = function (rs) { return this.podsOf(rs).filter(function (p) { return !p.metadata.deletionTimestamp && (p.status.conditions || []).some(function (c) { return c.type === 'Ready' && c.status === 'True'; }); }).length; };
  P.statusRs = function (r) {
    var ps = this.podsOf(r).filter(function (p) { return !p.metadata.deletionTimestamp; });
    r.status = { replicas: ps.length, readyReplicas: this.availableOf(r), availableReplicas: this.availableOf(r), observedGeneration: r.metadata.generation };
  };
  P.statusDeployment = function (d) {
    var self = this, rss = this.list('ReplicaSet', d.metadata.namespace).filter(function (r) { return (r.metadata.ownerReferences || []).some(function (x) { return x.uid === d.metadata.uid; }); });
    var hsh = podTemplateHash(d.spec.template), cur = rss.filter(function (r) { return r.metadata.labels['pod-template-hash'] === hsh; })[0];
    var repl = 0, ready = 0; rss.forEach(function (r) { repl += (r.status && r.status.replicas) || 0; ready += self.availableOf(r); });
    var upd = cur ? (cur.status && cur.status.replicas) || 0 : 0;
    d.status = { observedGeneration: d.metadata.generation, replicas: repl, updatedReplicas: upd, readyReplicas: ready, availableReplicas: ready, unavailableReplicas: Math.max(0, d.spec.replicas - ready), conditions: [{ type: 'Available', status: ready >= d.spec.replicas - 0 && ready > 0 || d.spec.replicas === 0 ? 'True' : 'False' }] };
    d.status._complete = (upd === d.spec.replicas && repl === d.spec.replicas && ready === d.spec.replicas);
  };
  P.recReplicaSet = function (r) {
    var self = this, ns = r.metadata.namespace, ps = this.podsOf(r).filter(function (p) { return !p.metadata.deletionTimestamp && p.status.phase !== 'Failed' && p.status.phase !== 'Succeeded'; }), want = r.spec.replicas;
    var n = 0;
    while (ps.length < want && n++ < 20) {
      var tpl = clone(r.spec.template), md = tpl.metadata || {}, name = r.metadata.name + '-' + alnum(5, this.rnd());
      var pod = { apiVersion: 'v1', kind: 'Pod', metadata: { name: name, namespace: ns, labels: md.labels || {}, annotations: md.annotations || {}, ownerReferences: ownerRef(r) }, spec: tpl.spec };
      try { pod._skipAdmit = false; this.createRaw(pod); ps.push(pod); this.ev(r, 'Normal', 'SuccessfulCreate', 'Created pod: ' + name); }
      catch (e) { this.ev(r, 'Warning', 'FailedCreate', 'Error creating: ' + String(e.message).replace(/^Error from server \(Forbidden\): /, '')); this.failedCreate = this.failedCreate || {}; this.failedCreate[r.metadata.uid] = String(e.message); break; }
    }
    if (ps.length >= want && this.failedCreate) delete this.failedCreate[r.metadata.uid];
    if (ps.length > want) {
      ps.sort(function (a, b) { var ra = self.podReady(a) ? 1 : 0, rb = self.podReady(b) ? 1 : 0; return ra - rb || (b.metadata.creationTimestamp - a.metadata.creationTimestamp); });
      for (var i = 0; i < ps.length - want; i++) { ps[i].metadata.deletionTimestamp = this.t; this.ev(r, 'Normal', 'SuccessfulDelete', 'Deleted pod: ' + ps[i].metadata.name); }
      this.changed();
    }
  };
  P.podReady = function (p) { return !p.metadata.deletionTimestamp && (p.status.conditions || []).some(function (c) { return c.type === 'Ready' && c.status === 'True'; }); };
  P.recStatefulSet = function (s) {
    var ns = s.metadata.namespace, want = s.spec.replicas, self = this, ps = this.podsOf(s);
    for (var i = 0; i < want; i++) {
      var name = s.metadata.name + '-' + i, p = this.objs[this.key('Pod', ns, name)];
      if (p) { if (!this.podReady(p)) break; else continue; }
      var tpl = clone(s.spec.template);
      (s.spec.volumeClaimTemplates || []).forEach(function (vct) {
        var cn = vct.metadata.name + '-' + name;
        if (!self.objs[self.key('PersistentVolumeClaim', ns, cn)]) self.createRaw({ apiVersion: 'v1', kind: 'PersistentVolumeClaim', metadata: { name: cn, namespace: ns, labels: (tpl.metadata || {}).labels || {} }, spec: clone(vct.spec) });
        tpl.spec.volumes = (tpl.spec.volumes || []).concat([{ name: vct.metadata.name, persistentVolumeClaim: { claimName: cn } }]);
      });
      var pod = { apiVersion: 'v1', kind: 'Pod', metadata: { name: name, namespace: ns, labels: Object.assign({}, (tpl.metadata || {}).labels, { 'statefulset.kubernetes.io/pod-name': name }), ownerReferences: ownerRef(s) }, spec: tpl.spec };
      pod.spec.hostname = name; pod.spec.subdomain = s.spec.serviceName;
      try { this.createRaw(pod); this.ev(s, 'Normal', 'SuccessfulCreate', 'create Pod ' + name + ' in StatefulSet ' + s.metadata.name + ' successful'); } catch (e) { this.ev(s, 'Warning', 'FailedCreate', String(e.message)); }
      break;
    }
    ps.forEach(function (p) { var idx = parseInt(p.metadata.name.split('-').pop(), 10); if (idx >= want && !p.metadata.deletionTimestamp) { p.metadata.deletionTimestamp = self.t; } });
    var ready = this.podsOf(s).filter(function (p) { return self.podReady(p); }).length;
    s.status = { replicas: this.podsOf(s).length, readyReplicas: ready, availableReplicas: ready, currentReplicas: this.podsOf(s).length };
  };
  P.recDaemonSet = function (s) {
    var self = this, ns = s.metadata.namespace, ps = this.podsOf(s), nodes = this.list('Node');
    nodes.forEach(function (n) {
      var tol = (s.spec.template.spec.tolerations || []);
      if (!self.taintsOk(n, tol, true)) return;
      if (ps.some(function (p) { return p.spec.nodeName === n.metadata.name; })) return;
      var tpl = clone(s.spec.template);
      var pod = { apiVersion: 'v1', kind: 'Pod', metadata: { name: s.metadata.name + '-' + alnum(5, self.rnd()), namespace: ns, labels: (tpl.metadata || {}).labels || {}, ownerReferences: ownerRef(s) }, spec: Object.assign(tpl.spec, { nodeName: n.metadata.name }) };
      try { self.createRaw(pod); } catch (e) { /* ignore */ }
    });
    var ready = this.podsOf(s).filter(function (p) { return self.podReady(p); }).length;
    s.status = { desiredNumberScheduled: nodes.filter(function (n) { return self.taintsOk(n, s.spec.template.spec.tolerations || [], true); }).length, currentNumberScheduled: this.podsOf(s).length, numberReady: ready };
  };
  P.recJob = function (j) {
    var ns = j.metadata.namespace, ps = this.podsOf(j), done = ps.filter(function (p) { return p.status.phase === 'Succeeded'; }).length, failed = ps.filter(function (p) { return p.status.phase === 'Failed'; }).length;
    var active = ps.filter(function (p) { return p.status.phase !== 'Succeeded' && p.status.phase !== 'Failed' && !p.metadata.deletionTimestamp; }).length;
    var st = j.status = j.status || {};
    if (st.complete) return;
    if (failed > (j.spec.backoffLimit === undefined ? 6 : j.spec.backoffLimit)) { st.failed = failed; st.conditions = [{ type: 'Failed', status: 'True', reason: 'BackoffLimitExceeded' }]; st.complete = false; st.finished = true; return; }
    if (done >= j.spec.completions) { st.succeeded = done; st.complete = true; st.completionTime = this.t; st.conditions = [{ type: 'Complete', status: 'True' }]; return; }
    var need = Math.min(j.spec.parallelism, j.spec.completions - done) - active;
    for (var i = 0; i < need; i++) {
      var tpl = clone(j.spec.template), pod = { apiVersion: 'v1', kind: 'Pod', metadata: { name: j.metadata.name + '-' + alnum(5, this.rnd()), namespace: ns, labels: Object.assign({}, (tpl.metadata || {}).labels, { 'job-name': j.metadata.name }), ownerReferences: ownerRef(j) }, spec: tpl.spec };
      try { this.createRaw(pod); } catch (e) { this.ev(j, 'Warning', 'FailedCreate', e.message); break; }
    }
    st.active = active; st.succeeded = done; st.failed = failed; st.startTime = st.startTime || j.metadata.creationTimestamp;
  };
  P.recPvc = function (c) {
    var ns = c.metadata.namespace, self = this, st = c.status;
    if (st.phase === 'Bound') { var pv = this.get('PersistentVolume', '', c.spec.volumeName); if (!pv) st.phase = 'Lost'; return; }
    var sc = c.spec.storageClassName, want = parseStorage((c.spec.resources.requests || {}).storage);
    var pvs = this.list('PersistentVolume').filter(function (v) { return v.status.phase === 'Available' && !(v.spec.claimRef) && (v.spec.storageClassName || '') === (sc === undefined ? '' : sc) && parseStorage(v.spec.capacity.storage) >= want && (c.spec.accessModes || []).every(function (m) { return (v.spec.accessModes || []).indexOf(m) >= 0; }) && (!c.spec.volumeName || c.spec.volumeName === v.metadata.name); });
    if (pvs.length) { var pv2 = pvs.sort(function (a, b) { return parseStorage(a.spec.capacity.storage) - parseStorage(b.spec.capacity.storage); })[0]; this.bindPv(pv2, c); return; }
    var scName = sc === undefined ? (this.list('StorageClass').filter(function (x) { return (x.metadata.annotations || {})['storageclass.kubernetes.io/is-default-class'] === 'true'; })[0] || {}).metadata : (sc === '' ? null : { name: sc });
    scName = scName && scName.name;
    if (sc === '' || !scName) { st.msg = 'no persistent volumes available for this claim and no storage class is set'; this.ev(c, 'Normal', 'FailedBinding', st.msg); return; }
    var scObj = this.get('StorageClass', '', scName);
    if (!scObj) { st.msg = 'storageclass.storage.k8s.io "' + scName + '" not found'; this.ev(c, 'Warning', 'ProvisioningFailed', st.msg); return; }
    if (scObj.volumeBindingMode === 'WaitForFirstConsumer' && !c._consumer) {
      var users = this.list('Pod', ns).filter(function (p) { return p.spec.nodeName && (p.spec.volumes || []).some(function (v) { return v.persistentVolumeClaim && v.persistentVolumeClaim.claimName === c.metadata.name; }); });
      if (!users.length) { st.msg = 'waiting for first consumer to be created before binding'; this.ev(c, 'Normal', 'WaitForFirstConsumer', st.msg); return; }
    }
    var pvn = 'pvc-' + c.metadata.uid; this.pvN++;
    var npv = this.createRaw({ apiVersion: 'v1', kind: 'PersistentVolume', metadata: { name: pvn }, spec: { capacity: { storage: (c.spec.resources.requests || {}).storage }, accessModes: c.spec.accessModes, persistentVolumeReclaimPolicy: scObj.reclaimPolicy || 'Delete', storageClassName: scName, hostPath: { path: '/var/local-path-provisioner/' + pvn } } });
    this.bindPv(npv, c); void self;
  };
  P.bindPv = function (pv, c) { pv.spec.claimRef = { kind: 'PersistentVolumeClaim', namespace: c.metadata.namespace, name: c.metadata.name, uid: c.metadata.uid }; pv.status.phase = 'Bound'; c.spec.volumeName = pv.metadata.name; c.status = { phase: 'Bound', capacity: { storage: pv.spec.capacity.storage }, accessModes: c.spec.accessModes }; this.ev(c, 'Normal', 'ProvisioningSucceeded', 'Successfully bound volume ' + pv.metadata.name); this.changed(); };

  // services/endpoints
  P.targetPortOf = function (svc, sp, pod) {
    var tp = sp.targetPort; if (typeof tp === 'number') return tp;
    if (/^\d+$/.test(String(tp))) return parseInt(tp, 10);
    var found = null; pod.spec.containers.forEach(function (c) { (c.ports || []).forEach(function (p) { if (p.name === tp) found = p.containerPort; }); });
    return found;
  };
  P.endpointsFor = function (svc) {
    var self = this, sel = svc.spec.selector; if (!sel || !Object.keys(sel).length) return [];
    return this.list('Pod', svc.metadata.namespace).filter(function (p) { return matchSel({ matchLabels: sel }, p.metadata.labels) && self.podReady(p) && p.status.podIP; });
  };
  P.recService = function (s) {
    if (s.spec.type === 'ExternalName' || !s.spec.selector) return;
    var self = this, pods = this.endpointsFor(s), key = this.key('Endpoints', s.metadata.namespace, s.metadata.name);
    var subsets = pods.length ? [{ addresses: pods.map(function (p) { return { ip: p.status.podIP, nodeName: p.spec.nodeName, targetRef: { kind: 'Pod', name: p.metadata.name } }; }), ports: s.spec.ports.map(function (sp) { return { name: sp.name, port: self.targetPortOf(s, sp, pods[0]) || sp.port, protocol: sp.protocol }; }) }] : [];
    var ep = this.objs[key];
    if (!ep) { ep = { apiVersion: 'v1', kind: 'Endpoints', metadata: { name: s.metadata.name, namespace: s.metadata.namespace, uid: this.newUid(), creationTimestamp: this.t, labels: s.metadata.labels || {} }, subsets: subsets }; this.objs[key] = ep; }
    else ep.subsets = subsets;
  };
  P.recHpa = function (h) {
    var ref = h.spec.scaleTargetRef, ns = h.metadata.namespace, tgt = this.get(ref.kind, ns, ref.name);
    if (!tgt) { h.status = { currentReplicas: 0, desiredReplicas: 0 }; return; }
    var pods = this.podsOf(tgt); if (tgt.kind === 'Deployment') { pods = []; var self = this; this.list('ReplicaSet', ns).forEach(function (r) { if (owner(r, 'Deployment') && owner(r, 'Deployment').uid === tgt.metadata.uid) pods = pods.concat(self.podsOf(r)); }); }
    pods = pods.filter(function (p) { return this.podReady(p); }, this);
    var metric = ((h.spec.metrics || [])[0] || {}).resource, targetUtil = metric && metric.target && metric.target.averageUtilization || h.spec.targetCPUUtilizationPercentage || 80;
    if (!pods.length) { h.status = { currentReplicas: tgt.spec.replicas, desiredReplicas: tgt.spec.replicas, currentUtil: undefined }; return; }
    var cpu = 0, req = 0; pods.forEach(function (p) { cpu += this.podCpu(p); req += p.spec.containers.reduce(function (a, c) { return a + parseCpu(c.resources && c.resources.requests && c.resources.requests.cpu); }, 0); }, this);
    if (!req) { h.status = { currentReplicas: tgt.spec.replicas, desiredReplicas: tgt.spec.replicas, currentUtil: null }; return; }
    var util = Math.round(cpu / req * 100), desired = Math.ceil(pods.length * util / targetUtil);
    if (Math.abs(util / targetUtil - 1) < 0.1) desired = pods.length;
    desired = Math.max(h.spec.minReplicas || 1, Math.min(h.spec.maxReplicas || 1, desired));
    if (desired !== tgt.spec.replicas && this.t % 3 === 0) { this.ev(h, 'Normal', 'SuccessfulRescale', 'New size: ' + desired + '; reason: cpu resource utilization (percentage of request) ' + (desired > tgt.spec.replicas ? 'above' : 'below') + ' target'); tgt.spec.replicas = desired; tgt.metadata.generation++; this.changed(); }
    h.status = { currentReplicas: tgt.spec.replicas, desiredReplicas: desired, currentUtil: util };
  };
  P.podCpu = function (p) { // millicores (simulated)
    var base = 3, ns = p.metadata.namespace, self = this, load = 0;
    this.list('Pod', ns).forEach(function (g) {
      if (g.status.phase !== 'Running') return; var cmd = (g.spec.containers[0].command || []).concat(g.spec.containers[0].args || []).join(' ');
      var m = cmd.match(/(?:wget|curl)[^;|]*?(?:https?:\/\/)?([a-z0-9-]+)(?:[.:\/ ]|$)/);
      if (!m || !/while|loop|true/.test(cmd)) return;
      var svc = self.get('Service', ns, m[1]); if (!svc) return;
      var eps = self.endpointsFor(svc); if (eps.some(function (e) { return e.metadata.uid === p.metadata.uid; })) load += 900 / eps.length;
    });
    return Math.round(base + load);
  };
  P.podMem = function (p) { return p.spec.containers.reduce(function (a, c) { return a + (c.image && /nginx|httpd/.test(c.image) ? 9 : 14); }, 0); };
  P.statusPdb = function (b) {
    var ns = b.metadata.namespace, pods = this.list('Pod', ns).filter(function (p) { return matchSel(b.spec.selector, p.metadata.labels); }), healthy = pods.filter(function (p) { return this.podReady(p); }, this).length, exp = pods.length;
    var min = b.spec.minAvailable !== undefined ? intOrPct(b.spec.minAvailable, exp, true) : exp - intOrPct(b.spec.maxUnavailable || 0, exp, false);
    b.status = { currentHealthy: healthy, desiredHealthy: min, expectedPods: exp, disruptionsAllowed: Math.max(0, healthy - min) };
  };

  // ─── scheduler ───
  P.taintsOk = function (node, tolerations, noExecuteToo) {
    var taints = (node.spec.taints || []).filter(function (t) { return t.effect === 'NoSchedule' || (noExecuteToo && t.effect === 'NoExecute') || t.effect === 'NoExecute'; });
    return taints.every(function (t) { return (tolerations || []).some(function (tl) { return (!tl.effect || tl.effect === t.effect) && (tl.operator === 'Exists' ? (!tl.key || tl.key === t.key) : (tl.key === t.key && (tl.value || '') === (t.value || ''))); }); });
  };
  P.nodeUsed = function (name) {
    var u = { cpu: 0, mem: 0, pods: 0 };
    this.list('Pod').forEach(function (p) { if (p.spec.nodeName !== name || p.status.phase === 'Succeeded' || p.status.phase === 'Failed') return; u.pods++; p.spec.containers.forEach(function (c) { var r = c.resources && c.resources.requests; if (r) { u.cpu += parseCpu(r.cpu); u.mem += parseMem(r.memory); } }); });
    return u;
  };
  P.schedule = function (pod) {
    var self = this, s = pod.spec, reasons = {}, cands = [], nodes = this.list('Node'), n = nodes.length;
    function why(r) { reasons[r] = (reasons[r] || 0) + 1; }
    var reqCpu = 0, reqMem = 0; s.containers.forEach(function (c) { var r = c.resources && c.resources.requests; if (r) { reqCpu += parseCpu(r.cpu); reqMem += parseMem(r.memory); } });
    // unbound PVC
    var unbound = [];
    (s.volumes || []).forEach(function (v) {
      if (!v.persistentVolumeClaim) return; var c = self.get('PersistentVolumeClaim', pod.metadata.namespace, v.persistentVolumeClaim.claimName);
      if (!c) unbound.push('persistentvolumeclaim "' + v.persistentVolumeClaim.claimName + '" not found');
      else if (c.status.phase !== 'Bound') { var sc = self.get('StorageClass', '', c.spec.storageClassName === undefined ? ((self.list('StorageClass').filter(function (x) { return (x.metadata.annotations || {})['storageclass.kubernetes.io/is-default-class'] === 'true'; })[0] || { metadata: {} }).metadata.name) : c.spec.storageClassName);
        if (!(sc && sc.volumeBindingMode === 'WaitForFirstConsumer')) unbound.push('pod has unbound immediate PersistentVolumeClaims');
      }
    });
    if (unbound.length) return { fail: '0/' + n + ' nodes are available: ' + unbound[0] + '. preemption: 0/' + n + ' nodes are available: ' + n + ' Preemption is not helpful for scheduling.' };
    nodes.forEach(function (nd) {
      var nm = nd.metadata.name;
      if (s.nodeName && s.nodeName !== nm) { why("node(s) didn't match the requested node name"); return; }
      if (nd.spec.unschedulable) { why('node(s) were unschedulable'); return; }
      var ns = s.nodeSelector; if (ns) for (var k in ns) if ((nd.metadata.labels || {})[k] !== ns[k]) { why("node(s) didn't match Pod's node affinity/selector"); return; }
      var na = s.affinity && s.affinity.nodeAffinity && s.affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution;
      if (na && !(na.nodeSelectorTerms || []).some(function (t) { return (t.matchExpressions || []).every(function (e) { var v = (nd.metadata.labels || {})[e.key]; return e.operator === 'In' ? (e.values || []).indexOf(v) >= 0 : e.operator === 'NotIn' ? (e.values || []).indexOf(v) < 0 : e.operator === 'Exists' ? v !== undefined : v === undefined; }); }))
      { why("node(s) didn't match Pod's node affinity/selector"); return; }
      if (!self.taintsOk(nd, s.tolerations)) { var t = (nd.spec.taints || [])[0]; why('node(s) had untolerated taint {' + t.key + ': ' + (t.value || '') + '}'); return; }
      var used = self.nodeUsed(nm), al = nd.status.allocatable;
      if (reqCpu + used.cpu > parseCpu(al.cpu)) { why('Insufficient cpu'); return; }
      if (reqMem + used.mem > parseMem(al.memory)) { why('Insufficient memory'); return; }
      var paa = s.affinity && s.affinity.podAntiAffinity && s.affinity.podAntiAffinity.requiredDuringSchedulingIgnoredDuringExecution;
      if (paa && paa.some(function (term) { return self.list('Pod', pod.metadata.namespace).some(function (o) { return o !== pod && o.spec.nodeName === nm && matchSel(term.labelSelector, o.metadata.labels); }); })) { why("node(s) didn't match pod anti-affinity rules"); return; }
      var tsc = (s.topologySpreadConstraints || [])[0];
      if (tsc && tsc.whenUnsatisfiable === 'DoNotSchedule') {
        var counts = {}; nodes.forEach(function (x) { counts[x.metadata.name] = 0; }); self.list('Pod', pod.metadata.namespace).forEach(function (o) { if (o !== pod && o.spec.nodeName && matchSel(tsc.labelSelector, o.metadata.labels)) counts[o.spec.nodeName] = (counts[o.spec.nodeName] || 0) + 1; });
        var elig = nodes.filter(function (x) { return self.taintsOk(x, s.tolerations) && !x.spec.unschedulable; }).map(function (x) { return counts[x.metadata.name]; }), mn = Math.min.apply(null, elig);
        if (counts[nm] + 1 - mn > (tsc.maxSkew || 1)) { why("node(s) didn't match pod topology spread constraints"); return; }
      }
      cands.push({ name: nm, free: (parseCpu(al.cpu) - used.cpu - reqCpu) + (parseMem(al.memory) - used.mem - reqMem), pods: used.pods });
    });
    if (!cands.length) {
      var parts = Object.keys(reasons).map(function (r) { return reasons[r] + (/^(Insufficient|pod has)/.test(r) ? ' ' : ' ') + r; }).sort(function (a, b) { return parseInt(b, 10) - parseInt(a, 10); });
      parts = Object.keys(reasons).map(function (r) { return reasons[r] + ' ' + r; });
      return { fail: '0/' + n + ' nodes are available: ' + parts.join(', ') + '. preemption: 0/' + n + ' nodes are available: ' + parts.map(function (p) { return /Insufficient/.test(p) ? p.replace(/^(\d+) (Insufficient \w+)$/, '$1 No preemption victims found for incoming pod') : p; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(', ') + '.' };
    }
    cands.sort(function (a, b) { return b.free - a.free || a.pods - b.pods || (a.name < b.name ? -1 : 1); });
    return { node: cands[0].name };
  };

  // ─── kubelet: pod lifecycle ───
  P.portsOf = function (c) {
    var repo = imageRepo(c.image || ''), base = { nginx: [80], httpd: [80], redis: [6379], postgres: [5432], mysql: [3306], mongo: [27017], memcached: [11211], 'nginxinc/nginx-unprivileged': [8080], 'registry.k8s.io/coredns/coredns': [53, 9153] }[repo];
    if (base) return base;
    return (c.ports || []).map(function (p) { return p.containerPort; });
  };
  P.containerPlan = function (pod, c) {
    var repo = imageRepo(c.image || ''), cmd = (c.command || []).concat(c.args || []).join(' '), env = {};
    (c.env || []).forEach(function (e) { env[e.name] = e.value !== undefined ? e.value : '(ref)'; });
    var plan = { exit: null, mem: this.podMemOf(c), logs: [] }, m;
    var longRun = /sleep\s+(\d{3,}|infinity)|tail\s+-f|while\s+true|nginx|httpd|redis-server|sleep\s+\d+\s*;?\s*(?:&&|;)?\s*$/i;
    var echoes = []; var re = /echo\s+(?:-n\s+)?(?:"([^"]*)"|'([^']*)'|([^\s;&|]+))/g, em; while ((em = re.exec(cmd))) echoes.push(em[1] || em[2] || em[3]);
    if (cmd) {
      var ex = cmd.match(/exit\s+(\d+)/);
      if (/\b(false)\b/.test(cmd) && !/while|sleep/.test(cmd)) plan.exit = { code: 1, reason: 'Error' };
      else if (ex && !/\bsleep\s+\d{3,}/.test(cmd)) plan.exit = { code: parseInt(ex[1], 10), reason: parseInt(ex[1], 10) ? 'Error' : 'Completed' };
      else if (!longRun.test(cmd) && /^(sh|bash|\/bin\/sh|\/bin\/bash)?\s*(-c)?\s*['"]?\s*(echo|date|ls|cat|hostname|printenv|env|wget|curl|nslookup|ping -c|touch|mkdir|true)\b/i.test(cmd)) plan.exit = { code: 0, reason: 'Completed' };
      else if (/^(echo|date|ls|true|pwd|hostname|printenv)\b/.test(cmd) && !longRun.test(cmd)) plan.exit = { code: 0, reason: 'Completed' };
      else if (!longRun.test(cmd) && /^(sh|bash|\/bin\/sh)\s+-c\s+['"]?\s*(perl|php|python\d?)\b/.test(cmd) && /print|echo|-e|-r/.test(cmd)) plan.exit = { code: 0, reason: 'Completed' };
      plan.logs = echoes.length ? echoes : [];
    } else if (/^(busybox|alpine|ubuntu|debian|curlimages\/curl|centos)$/.test(repo)) plan.exit = { code: 0, reason: 'Completed' };
    if (repo === 'postgres' && !env.POSTGRES_PASSWORD && !env.POSTGRES_HOST_AUTH_METHOD && !(c.envFrom || []).length) { plan.exit = { code: 1, reason: 'Error' }; plan.logs = ['Error: Database is uninitialized and superuser password is not specified.', '       You must specify POSTGRES_PASSWORD to a non-empty value for the superuser.']; }
    if (repo === 'mysql' && !env.MYSQL_ROOT_PASSWORD && !env.MYSQL_ALLOW_EMPTY_PASSWORD && !env.MYSQL_RANDOM_ROOT_PASSWORD && !(c.envFrom || []).length) { plan.exit = { code: 1, reason: 'Error' }; plan.logs = ['[ERROR] [Entrypoint]: Database is uninitialized and password option is not specified', '    You need to specify one of the following as an environment variable:', '    - MYSQL_ROOT_PASSWORD', '    - MYSQL_ALLOW_EMPTY_PASSWORD', '    - MYSQL_RANDOM_ROOT_PASSWORD']; }
    if ((m = cmd.match(/--vm-bytes\s+(\d+[KMG]?)/i))) plan.mem = parseMem(m[1].replace(/([KMG])$/i, function (x) { return x.toUpperCase() + 'i'; }));
    if (env.MEM_MB) plan.mem = parseFloat(env.MEM_MB);
    var lim = c.resources && c.resources.limits && c.resources.limits.memory;
    if (lim && plan.mem > parseMem(lim) && !plan.exit) plan.exit = { code: 137, reason: 'OOMKilled', oom: true };
    if (!plan.logs.length) plan.logs = repo === 'nginx' ? ['/docker-entrypoint.sh: Configuration complete; ready for start up', '2024/01/01 00:00:00 [notice] 1#1: nginx/1.25 worker processes started'] : [];
    if (plan.exit && plan.exit.oom) plan.logs = plan.logs.length ? plan.logs : ['stress: info: [1] dispatching hogs: 0 cpu, 0 io, 1 vm, 0 hdd'];
    plan.ports = this.portsOf(c);
    return plan;
  };
  P.podMemOf = function (c) { return /nginx|httpd/.test(c.image || '') ? 9 : /redis/.test(c.image || '') ? 12 : 20; };
  P.probeFail = function (pod, c, kind, plan) {
    var pr = c[kind + 'Probe']; if (!pr) return null; var repo = imageRepo(c.image || '');
    if (pr.httpGet) {
      var port = pr.httpGet.port, num = typeof port === 'number' ? port : (/^\d+$/.test(port) ? parseInt(port, 10) : ((c.ports || []).filter(function (p) { return p.name === port; })[0] || {}).containerPort);
      if (plan.ports.indexOf(num) < 0) return (kind === 'liveness' ? 'Liveness' : 'Readiness') + ' probe failed: Get "http://' + (pod.status.podIP || '10.244.1.5') + ':' + num + (pr.httpGet.path || '/') + '": dial tcp ' + (pod.status.podIP || '10.244.1.5') + ':' + num + ': connect: connection refused';
      var path = pr.httpGet.path || '/';
      if (/^(nginx|httpd|nginxinc\/nginx-unprivileged)$/.test(repo) && ['/', '/index.html'].indexOf(path) < 0) return (kind === 'liveness' ? 'Liveness' : 'Readiness') + ' probe failed: HTTP probe failed with statuscode: 404';
    }
    if (pr.tcpSocket) { var tp = pr.tcpSocket.port; if (plan.ports.indexOf(typeof tp === 'number' ? tp : parseInt(tp, 10)) < 0) return (kind === 'liveness' ? 'Liveness' : 'Readiness') + ' probe failed: dial tcp ' + (pod.status.podIP || '10.244.1.5') + ':' + tp + ': connect: connection refused'; }
    if (pr.exec && /\b(false|exit 1)\b/.test((pr.exec.command || []).join(' '))) return (kind === 'liveness' ? 'Liveness' : 'Readiness') + ' probe failed: command "' + (pr.exec.command || []).join(' ') + '" exited with 1';
    return null;
  };
  P.cfgProblem = function (pod, c) {
    var ns = pod.metadata.namespace, self = this;
    var envs = c.env || [];
    for (var i = 0; i < envs.length; i++) {
      var vf = envs[i].valueFrom; if (!vf) continue;
      if (vf.configMapKeyRef) { var cm = this.get('ConfigMap', ns, vf.configMapKeyRef.name); if (!cm) { if (!vf.configMapKeyRef.optional) return 'configmap "' + vf.configMapKeyRef.name + '" not found'; } else if (!vf.configMapKeyRef.optional && !((cm.data || {}).hasOwnProperty(vf.configMapKeyRef.key))) return 'couldn\'t find key ' + vf.configMapKeyRef.key + ' in ConfigMap ' + ns + '/' + vf.configMapKeyRef.name; }
      if (vf.secretKeyRef) { var sc = this.get('Secret', ns, vf.secretKeyRef.name); if (!sc) { if (!vf.secretKeyRef.optional) return 'secret "' + vf.secretKeyRef.name + '" not found'; } else if (!vf.secretKeyRef.optional && !((sc.data || {}).hasOwnProperty(vf.secretKeyRef.key))) return 'couldn\'t find key ' + vf.secretKeyRef.key + ' in Secret ' + ns + '/' + vf.secretKeyRef.name; }
    }
    var ef = c.envFrom || [];
    for (var j = 0; j < ef.length; j++) {
      if (ef[j].configMapRef && !this.get('ConfigMap', ns, ef[j].configMapRef.name) && !ef[j].configMapRef.optional) return 'configmap "' + ef[j].configMapRef.name + '" not found';
      if (ef[j].secretRef && !this.get('Secret', ns, ef[j].secretRef.name) && !ef[j].secretRef.optional) return 'secret "' + ef[j].secretRef.name + '" not found';
    }
    var sec = Object.assign({}, pod.spec.securityContext || {}, c.securityContext || {});
    if (sec.runAsNonRoot && !(sec.runAsUser > 0) && ROOT_IMAGES.test(imageRepo(c.image || ''))) return 'container has runAsNonRoot and image will run as root (pod: "' + pod.metadata.name + '_' + ns + '(' + pod.metadata.uid + ')", container: ' + c.name + ')';
    void self; return null;
  };
  P.volProblem = function (pod) {
    var ns = pod.metadata.namespace, vols = pod.spec.volumes || [];
    for (var i = 0; i < vols.length; i++) {
      var v = vols[i];
      if (v.configMap && !v.configMap.optional && !this.get('ConfigMap', ns, v.configMap.name)) return 'MountVolume.SetUp failed for volume "' + v.name + '" : configmap "' + v.configMap.name + '" not found';
      if (v.secret && !v.secret.optional && !this.get('Secret', ns, v.secret.secretName)) return 'MountVolume.SetUp failed for volume "' + v.name + '" : secret "' + v.secret.secretName + '" not found';
      if (v.persistentVolumeClaim) { var c = this.get('PersistentVolumeClaim', ns, v.persistentVolumeClaim.claimName); if (!c || c.status.phase !== 'Bound') return 'persistentvolumeclaim "' + v.persistentVolumeClaim.claimName + '" ' + (c ? 'is not bound' : 'not found'); }
    }
    return null;
  };
  function setCond(pod, type, status, reason) {
    var cs = pod.status.conditions = pod.status.conditions || [], c = cs.filter(function (x) { return x.type === type; })[0];
    if (!c) cs.push({ type: type, status: status, reason: reason }); else { c.status = status; c.reason = reason; }
  }
  P.stepPod = function (pod) {
    var self = this, m = pod.metadata, s = pod.spec, st = pod.status, pi = this.pi[m.uid] = this.pi[m.uid] || { c: {}, init: {}, born: this.t };
    if (m.deletionTimestamp) { if (this.t - m.deletionTimestamp >= 1) this.remove(pod, true); return; }
    if (st.phase === 'Succeeded' || st.phase === 'Failed') return;
    if (!s.nodeName) {
      var r = this.schedule(pod);
      if (r.node) { s.nodeName = r.node; st.hostIP = this.get('Node', '', r.node).status.addresses[0].address; this.ev(pod, 'Normal', 'Scheduled', 'Successfully assigned ' + m.namespace + '/' + m.name + ' to ' + r.node); setCond(pod, 'PodScheduled', 'True'); pi.scheduledAt = this.t; this.changed(); }
      else { setCond(pod, 'PodScheduled', 'False', 'Unschedulable'); st.unsched = r.fail; this.ev(pod, 'Warning', 'FailedScheduling', r.fail); return; }
    }
    var node = this.get('Node', '', s.nodeName);
    if (!node) { st.phase = 'Failed'; st.reason = 'NodeLost'; return; }
    if (this.flags && this.flags.kubeletDown && this.flags.kubeletDown[s.nodeName]) { (st.conditions || []).forEach(function (c) { if (c.type === 'Ready' || c.type === 'ContainersReady') { c.status = 'False'; c.reason = 'NodeNotReady'; } }); (st.containerStatuses || []).forEach(function (c) { c.ready = false; }); return; }
    st.hostIP = node.status.addresses[0].address;
    if (!pi.volsDone) { var vp = this.volProblem(pod); if (vp) { this.ev(pod, 'Warning', 'FailedMount', vp); st.volWait = vp; setCond(pod, 'Initialized', 'True'); pi.stuck = 'ContainerCreating'; pi.cs = {}; this.buildStatuses(pod, pi); return; } pi.volsDone = true; st.volWait = null; }
    if (!st.podIP && this.t - pi.scheduledAt >= 1) { var ni = this.list('Node').map(function (x) { return x.metadata.name; }).indexOf(s.nodeName); this.ipN[s.nodeName] = (this.ipN[s.nodeName] || 4) + 1; st.podIP = '10.244.' + ni + '.' + this.ipN[s.nodeName]; st.podIPs = [{ ip: st.podIP }]; st.startTime = this.t; }
    // init containers
    var inits = s.initContainers || [], initDone = true;
    for (var i = 0; i < inits.length; i++) {
      var ic = inits[i], ist = pi.init[ic.name] = pi.init[ic.name] || { st: 'creating', since: this.t, rc: 0 };
      if (ist.st === 'done') continue; initDone = false;
      var ip = imageProblem(ic.image, s.imagePullSecrets); if (ip) { ist.st = 'pullerr'; ist.msg = ip; break; }
      var plan = this.containerPlan(pod, ic);
      if (ist.st === 'creating') { if (this.t - ist.since >= 1) { ist.st = 'running'; ist.start = this.t; } break; }
      if (ist.st === 'pullerr') { ist.st = 'creating'; ist.since = this.t; break; }
      if (ist.st === 'running') { if (this.t - ist.start < 1) break; if (plan.exit && plan.exit.code !== 0) { ist.st = 'backoff'; ist.exit = plan.exit; ist.bo = this.t + Math.min(Math.pow(2, ist.rc + 1), 10); ist.rc++; this.ev(pod, 'Warning', 'BackOff', 'Back-off restarting failed container ' + ic.name + ' in pod ' + m.name); } else ist.st = 'done'; break; }
      if (ist.st === 'backoff') { if (this.t >= ist.bo) { ist.st = 'creating'; ist.since = this.t; } break; }
    }
    this.buildInitStatuses(pod, pi);
    if (!initDone) { this.finishStatus(pod, pi); return; }
    setCond(pod, 'Initialized', 'True');
    // main containers
    var allExited = true, anyFail = false;
    s.containers.forEach(function (c) {
      var cs = pi.c[c.name] = pi.c[c.name] || { st: 'creating', since: self.t, rc: 0 };
      var plan = self.containerPlan(pod, c);
      if (cs.st === 'creating' || cs.st === 'pullerr' || cs.st === 'cfgerr') {
        var ip = imageProblem(c.image, s.imagePullSecrets);
        if (ip) { if (cs.st !== 'pullerr') { cs.st = 'pullerr'; cs.since = self.t; self.ev(pod, 'Normal', 'Pulling', 'Pulling image "' + c.image + '"'); self.ev(pod, 'Warning', 'Failed', 'Failed to pull image "' + c.image + '": ' + ip); } else { self.ev(pod, 'Normal', 'BackOff', 'Back-off pulling image "' + c.image + '"'); self.ev(pod, 'Warning', 'Failed', 'Error: ImagePullBackOff'); } cs.msg = ip; return; }
        var cp = self.cfgProblem(pod, c);
        if (cp) { if (cs.st !== 'cfgerr') { cs.st = 'cfgerr'; } cs.msg = cp; self.ev(pod, 'Warning', 'Failed', 'Error: ' + cp); return; }
        if (cs.st !== 'creating') { cs.st = 'creating'; cs.since = self.t; }
        if (self.t - cs.since >= 1) { cs.st = 'running'; cs.start = self.t; self.ev(pod, 'Normal', 'Pulled', 'Successfully pulled image "' + c.image + '"'); self.ev(pod, 'Normal', 'Created', 'Created container ' + c.name); self.ev(pod, 'Normal', 'Started', 'Started container ' + c.name); if (!pi.firstRun) pi.firstRun = self.t; }
        return;
      }
      if (cs.st === 'running') {
        var age = self.t - cs.start;
        if (plan.exit && age >= 1) { cs.st = 'term'; cs.exit = plan.exit; cs.at = self.t; cs.last = { exitCode: plan.exit.code, reason: plan.exit.reason }; if (plan.exit.oom) self.ev(pod, 'Warning', 'OOMKilling', 'Memory cgroup out of memory: Killed process (' + c.name + ')'); return; }
        var lf = self.probeFail(pod, c, 'liveness', plan);
        if (lf && age >= Math.min(3, ((c.livenessProbe || {}).initialDelaySeconds || 0) + 3)) { self.ev(pod, 'Warning', 'Unhealthy', lf); self.ev(pod, 'Normal', 'Killing', 'Container ' + c.name + ' failed liveness probe, will be restarted'); cs.st = 'term'; cs.exit = { code: 137, reason: 'Error' }; cs.at = self.t; cs.last = { exitCode: 137, reason: 'Error' }; return; }
        var rf = self.probeFail(pod, c, 'readiness', plan); cs.ready = !rf && age >= 1; if (rf) self.ev(pod, 'Warning', 'Unhealthy', rf);
        allExited = false; return;
      }
      if (cs.st === 'term') {
        var pol = s.restartPolicy, code = cs.exit.code;
        if (pol === 'Never' || (pol === 'OnFailure' && code === 0)) { return; }
        cs.st = 'backoff'; cs.bo = self.t + Math.min(Math.pow(2, cs.rc + 1), 10); cs.rc++; self.ev(pod, 'Warning', 'BackOff', 'Back-off restarting failed container ' + c.name + ' in pod ' + m.name); return;
      }
      if (cs.st === 'backoff') { if (self.t >= cs.bo) { cs.st = 'creating'; cs.since = self.t; } return; }
    });
    s.containers.forEach(function (c) { var cs = pi.c[c.name]; if (cs.st !== 'term') allExited = false; else if (s.restartPolicy === 'Always') allExited = false; else if (cs.exit.code !== 0 && s.restartPolicy === 'OnFailure') allExited = false; else if (cs.exit.code !== 0) anyFail = true; });
    this.finishStatus(pod, pi);
    if (allExited && s.restartPolicy !== 'Always') { st.phase = anyFail ? 'Failed' : 'Succeeded'; setCond(pod, 'Ready', 'False', 'PodCompleted'); this.changed(); }
  };
  P.buildInitStatuses = function (pod, pi) {
    var self = this; pod.status.initContainerStatuses = (pod.spec.initContainers || []).map(function (c) {
      var x = pi.init[c.name] || { st: 'creating', rc: 0 }, o = { name: c.name, image: c.image, restartCount: x.rc || 0, ready: x.st === 'done' };
      if (x.st === 'done') o.state = { terminated: { exitCode: 0, reason: 'Completed' } };
      else if (x.st === 'running') o.state = { running: {} };
      else if (x.st === 'backoff') { o.state = { waiting: { reason: 'CrashLoopBackOff', message: 'back-off restarting failed container' } }; o.lastState = { terminated: { exitCode: x.exit.code, reason: x.exit.reason } }; }
      else if (x.st === 'pullerr') o.state = { waiting: { reason: 'ImagePullBackOff', message: x.msg } };
      else o.state = { waiting: { reason: 'PodInitializing' } };
      return o;
    }); void self;
  };
  P.buildStatuses = function (pod, pi) {
    pod.status.containerStatuses = pod.spec.containers.map(function (c) { return { name: c.name, image: c.image, ready: false, restartCount: 0, started: false, state: { waiting: { reason: 'ContainerCreating' } } }; });
    setCond(pod, 'Ready', 'False', 'ContainersNotReady'); void pi;
  };
  P.finishStatus = function (pod, pi) {
    var s = pod.spec, st = pod.status, self = this;
    st.containerStatuses = s.containers.map(function (c) {
      var x = pi.c[c.name] || { st: 'creating', rc: 0 }, o = { name: c.name, image: c.image, imageID: '', restartCount: x.rc || 0, ready: false, started: false };
      if (x.st === 'running') { o.state = { running: { startedAt: x.start } }; o.ready = !!x.ready; o.started = true; }
      else if (x.st === 'term') { o.state = { terminated: { exitCode: x.exit.code, reason: x.exit.reason, finishedAt: x.at } }; }
      else if (x.st === 'backoff') { o.state = { waiting: { reason: 'CrashLoopBackOff', message: 'back-off ' + Math.min(Math.pow(2, x.rc), 300) * 10 + 's restarting failed container=' + c.name + ' pod=' + pod.metadata.name } }; }
      else if (x.st === 'pullerr') o.state = { waiting: { reason: (self.t - x.since) < 1 ? 'ErrImagePull' : 'ImagePullBackOff', message: x.msg } };
      else if (x.st === 'cfgerr') o.state = { waiting: { reason: 'CreateContainerConfigError', message: x.msg } };
      else o.state = { waiting: { reason: 'ContainerCreating' } };
      if (x.last) o.lastState = { terminated: { exitCode: x.last.exitCode, reason: x.last.reason } };
      return o;
    });
    var allReady = st.containerStatuses.every(function (c) { return c.ready; }), allRunning = st.containerStatuses.every(function (c) { return c.state.running; });
    var inits = (s.initContainers || []).every(function (c) { return (pi.init[c.name] || {}).st === 'done'; });
    st.phase = 'Pending'; if (inits && st.containerStatuses.some(function (c) { return c.state.running || c.state.terminated; })) st.phase = 'Running';
    setCond(pod, 'ContainersReady', allReady ? 'True' : 'False'); setCond(pod, 'Ready', allReady && inits ? 'True' : 'False', allReady ? undefined : 'ContainersNotReady');
    var req = s.containers.every(function (c) { return c.resources && c.resources.requests && c.resources.limits && c.resources.requests.cpu === c.resources.limits.cpu && c.resources.requests.memory === c.resources.limits.memory && c.resources.requests.cpu; });
    st.qosClass = req ? 'Guaranteed' : s.containers.some(function (c) { return c.resources && (c.resources.requests || c.resources.limits); }) ? 'Burstable' : 'BestEffort'; void allRunning;
  };
  P.evictTaints = function () {
    var self = this;
    this.list('Node').forEach(function (n) {
      (n.spec.taints || []).filter(function (t) { return t.effect === 'NoExecute'; }).forEach(function (t) {
        self.list('Pod').forEach(function (p) { if (p.spec.nodeName === n.metadata.name && !p.metadata.deletionTimestamp && !(p.spec.tolerations || []).some(function (tl) { return tl.operator === 'Exists' && !tl.key || tl.key === t.key; })) { p.metadata.deletionTimestamp = self.t; self.ev(p, 'Normal', 'TaintManagerEviction', 'Marking for deletion Pod ' + p.metadata.namespace + '/' + p.metadata.name); } });
      });
    });
  };

  // pod "STATUS" column, like kubectl
  P.podStatus = function (p) {
    if (p.metadata.deletionTimestamp) return 'Terminating';
    var st = p.status, inits = st.initContainerStatuses || [];
    for (var i = 0; i < inits.length; i++) {
      var c = inits[i];
      if (c.state.terminated && c.state.terminated.exitCode === 0) continue;
      if (c.state.waiting && c.state.waiting.reason && c.state.waiting.reason !== 'PodInitializing') return 'Init:' + c.state.waiting.reason;
      if (c.state.terminated) return 'Init:' + c.state.terminated.reason;
      return 'Init:' + i + '/' + inits.length;
    }
    if (!p.spec.nodeName) return 'Pending';
    var cs = st.containerStatuses || [];
    for (var j = 0; j < cs.length; j++) { if (cs[j].state.waiting && cs[j].state.waiting.reason) return cs[j].state.waiting.reason; }
    for (var k = 0; k < cs.length; k++) { if (cs[k].state.terminated) return cs[k].state.terminated.reason || 'Error'; }
    if (st.phase === 'Succeeded') return 'Completed';
    return st.phase || 'Pending';
  };
  P.fmtAge = function (ts) { var d = Math.max(0, this.t - ts); if (d < 120) return d + 's'; if (d < 7200) return Math.floor(d / 60) + 'm' + (d % 60 ? Math.floor(d % 60) + 's' : ''); if (d < 172800) return Math.floor(d / 3600) + 'h'; return Math.floor(d / 86400) + 'd'; };

  // ─── network policy + connectivity ───
  P.resolveTarget = function (fromPod, host, port) {
    // returns {ok, pod, msg}
    var ns = fromPod ? fromPod.metadata.namespace : 'default', m, svc = null, targetPods = [];
    host = host.replace(/\.$/, '');
    var ip = host.match(/^\d+\.\d+\.\d+\.\d+$/);
    if (ip) {
      var p = this.list('Pod').filter(function (x) { return x.status.podIP === host; })[0];
      if (p) return { pods: [p], port: port };
      svc = this.list('Service').filter(function (x) { return x.spec.clusterIP === host; })[0];
    } else {
      var parts = host.split('.');
      if ((m = host.match(/^([a-z0-9-]+)(?:\.([a-z0-9-]+))?(?:\.svc)?(?:\.cluster\.local)?$/)) && (parts.length <= 5)) {
        var sn = parts[0], sns = parts[1] && parts[1] !== 'svc' ? parts[1] : ns;
        svc = this.get('Service', sns, sn);
        if (!svc && /^[a-z0-9-]+$/.test(host)) svc = null;
      }
      if (!svc) return { dns: false, msg: 'bad address \'' + host + '\'' };
    }
    if (!svc) return { dns: false, msg: 'bad address \'' + host + '\'' };
    var sp = (svc.spec.ports || []).filter(function (x) { return x.port === port; })[0] || (!port ? svc.spec.ports[0] : null);
    if (!sp) return { svc: svc, refused: true };
    var eps = this.endpointsFor(svc);
    if (!eps.length) return { svc: svc, refused: true, noep: true };
    return { svc: svc, pods: eps, port: this.targetPortOf(svc, sp, eps[0]), svcPort: sp.port };
  };
  P.netpolAllows = function (from, to, port) {
    var self = this, pols = this.list('NetworkPolicy', to.metadata.namespace).filter(function (np) { return (np.spec.policyTypes || ['Ingress']).indexOf('Ingress') >= 0 && matchSel(np.spec.podSelector, to.metadata.labels); });
    if (!pols.length) return true;
    return pols.some(function (np) {
      return (np.spec.ingress || []).some(function (rule) {
        var portOk = !rule.ports || !rule.ports.length || rule.ports.some(function (p) { return (p.port === undefined || p.port === port || String(p.port) === String(port)); });
        if (!portOk) return false;
        if (!rule.from || !rule.from.length) return true;
        return rule.from.some(function (f) {
          if (f.ipBlock) return false;
          var nsOk = true, podOk = true;
          if (f.namespaceSelector !== undefined) { var fn = self.get('Namespace', '', from.metadata.namespace); nsOk = matchSel(f.namespaceSelector, fn.metadata.labels || {}); }
          else nsOk = from.metadata.namespace === to.metadata.namespace;
          if (f.podSelector !== undefined) podOk = matchSel(f.podSelector, from.metadata.labels);
          return nsOk && podOk;
        });
      });
    });
  };
  P.egressAllows = function (from, to, port) {
    var self = this, pols = this.list('NetworkPolicy', from.metadata.namespace).filter(function (np) { return (np.spec.policyTypes || []).indexOf('Egress') >= 0 && matchSel(np.spec.podSelector, from.metadata.labels); });
    if (!pols.length) return true;
    return pols.some(function (np) {
      return (np.spec.egress || []).some(function (rule) {
        var portOk = !rule.ports || !rule.ports.length || rule.ports.some(function (p) { return p.port === undefined || p.port === port; });
        if (!portOk) return false; if (!rule.to || !rule.to.length) return true;
        return rule.to.some(function (f) { var nsOk = f.namespaceSelector !== undefined ? matchSel(f.namespaceSelector, self.get('Namespace', '', to.metadata.namespace).metadata.labels || {}) : from.metadata.namespace === to.metadata.namespace; var podOk = f.podSelector !== undefined ? matchSel(f.podSelector, to.metadata.labels) : true; return nsOk && podOk; });
      });
    });
  };
  // returns {code, out}
  P.connect = function (fromPod, host, port) {
    var r = this.resolveTarget(fromPod, host, port || 80);
    if (r.dns === false) return { code: 6, out: "wget: bad address '" + host + "'", curl: 'curl: (6) Could not resolve host: ' + host };
    if (r.refused) return { code: 1, out: 'wget: can\'t connect to remote host (' + (r.svc.spec.clusterIP) + '): Connection refused', curl: 'curl: (7) Failed to connect to ' + host + ' port ' + (port || 80) + ' after 1 ms: Couldn\'t connect to server' };
    var self = this, pod = r.pods.filter(function (p) { return self.netpolAllows(fromPod, p, r.port) && self.egressAllows(fromPod, p, r.port); })[0];
    if (!pod) return { code: 1, out: 'wget: download timed out', curl: 'curl: (28) Connection timed out after 2001 milliseconds' };
    var repo = imageRepo(pod.spec.containers[0].image);
    var body = /nginx/.test(repo) ? '<!DOCTYPE html>\n<html>\n<head>\n<title>Welcome to nginx!</title>' : /httpd/.test(repo) ? '<html><body><h1>It works!</h1></body></html>' : 'OK from ' + pod.metadata.name;
    return { code: 0, out: body, curl: body, pod: pod };
  };

  // ─── RBAC ───
  P.canI = function (subject, verb, resource, ns, resName) {
    var self = this, d = this.findKind(resource.split('/')[0]), res = d ? d.plural : resource.split('/')[0], sub = resource.indexOf('/') > 0 ? resource.split('/')[1] : null;
    if (sub) res = res + '/' + sub;
    var grp = d ? d.group : '';
    function ruleOk(r) { return (r.apiGroups || ['']).some(function (g) { return g === '*' || g === grp; }) && (r.resources || []).some(function (x) { return x === '*' || x === res; }) && (r.verbs || []).some(function (v) { return v === '*' || v === verb; }) && (!r.resourceNames || !resName || r.resourceNames.indexOf(resName) >= 0); }
    function subMatch(sj) {
      var m;
      if (subject.indexOf('system:serviceaccount:') === 0) { m = subject.split(':'); return (sj.kind === 'ServiceAccount' && sj.name === m[3] && (sj.namespace || '') === m[2]) || (sj.kind === 'Group' && (sj.name === 'system:serviceaccounts' || sj.name === 'system:serviceaccounts:' + m[2] || sj.name === 'system:authenticated')); }
      return (sj.kind === 'User' && sj.name === subject) || (sj.kind === 'Group' && sj.name === 'system:authenticated' && subject !== 'system:anonymous');
    }
    if (!subject || subject === 'kubernetes-admin') return true;
    var ok = false;
    this.list('ClusterRoleBinding').forEach(function (b) { if ((b.subjects || []).some(subMatch)) { var cr = self.get('ClusterRole', '', b.roleRef.name); if (cr && (cr.rules || []).some(ruleOk)) ok = true; } });
    if (ns || (d && !d.ns)) this.list('RoleBinding', ns).forEach(function (b) {
      if (!(b.subjects || []).some(function (sj) { return subMatch(Object.assign({ namespace: b.metadata.namespace }, sj)); })) return;
      var role = b.roleRef.kind === 'ClusterRole' ? self.get('ClusterRole', '', b.roleRef.name) : self.get('Role', b.metadata.namespace, b.roleRef.name);
      if (role && (role.rules || []).some(ruleOk) && (d ? d.ns : true)) ok = true;
    });
    return ok;
  };

  // ─── virtual filesystem ───
  P.abs = function (p) { if (!p) return this.cwd; if (p[0] === '~') p = '/home/student' + p.slice(1); if (p[0] !== '/') p = this.cwd + '/' + p; var out = []; p.split('/').forEach(function (s) { if (!s || s === '.') return; if (s === '..') out.pop(); else out.push(s); }); return '/' + out.join('/'); };
  P.readFile = function (p) { var a = this.abs(p); if (!(a in this.fs)) return null; return this.fs[a]; };
  P.writeFile = function (p, c, append) { var a = this.abs(p); this.fs[a] = append && a in this.fs ? this.fs[a] + c : c; this.changed(); };
  P.isDir = function (p) { var a = this.abs(p); if (a === '/') return true; var pre = a + '/'; return Object.keys(this.fs).some(function (k) { return k.indexOf(pre) === 0; }); };

  // ─── state export (for labs/UI) ───
  // full serialisable state (for session persistence); load() is its inverse
  var STATE_KEYS = ['t', 'seed', 'objs', 'pi', 'events', 'fs', 'cwd', 'env', 'ctxNs', 'uidN', 'ipN', 'cipN', 'npN', 'crds', 'dirty', 'loadgen', 'history', 'pvN', 'kinds', 'failedCreate', 'flags'];
  P.dump = function () { var o = { v: 1 }, self = this; STATE_KEYS.forEach(function (k) { if (self[k] !== undefined) o[k] = self[k]; }); return JSON.parse(JSON.stringify(o)); };
  P.load = function (st) { var self = this; if (!st || st.v !== 1) throw new Error('bad simulator state'); this.reset(); STATE_KEYS.forEach(function (k) { if (st[k] !== undefined) self[k] = clone(st[k]); }); if (!this.failedCreate) this.failedCreate = {}; return this; };
  P.snapshot = function () { return { objs: clone(this.objs), t: this.t, fs: clone(this.fs), ctxNs: this.ctxNs, kinds: clone(this.kinds), uidN: this.uidN, seed: this.seed }; };

  root.KL = root.KL || {}; root.KL.Sim = Sim;
  if (typeof module !== 'undefined' && module.exports) module.exports = Sim;
})(typeof window !== 'undefined' ? window : globalThis);
