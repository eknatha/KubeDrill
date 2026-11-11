/* KubeLab simulator — kubectl part 3: create/apply/delete/run/expose/scale/set/label/taint/drain/rollout/patch/kustomize */
(function (root) {
  'use strict';
  var Sim = root.KL ? root.KL.Sim : require('./sim.js');
  var P = Sim.prototype, KErr = Sim.KErr, U = Sim.util, Y = Sim.Y, clone = U.clone;
  function arr(v) { return v === undefined ? [] : Array.isArray(v) ? v : [v]; }
  function b64(s) { return typeof Buffer !== 'undefined' ? Buffer.from(String(s)).toString('base64') : btoa(unescape(encodeURIComponent(String(s)))); }

  // ─── manifests ───
  P.loadManifests = function (file, stdin) {
    var self = this, files = arr(file), docs = [];
    files.forEach(function (f) {
      var txt;
      if (f === '-') txt = stdin || '';
      else if (/^https?:\/\//.test(f)) throw new KErr('error: unable to read URL "' + f + '", the simulator is offline — save the manifest to a file first');
      else {
        var ab = self.abs(f); txt = self.readFile(f);
        if (txt === null && self.isDir(ab)) { var pre = ab + '/'; Object.keys(self.fs).filter(function (k) { return k.indexOf(pre) === 0 && /\.ya?ml$|\.json$/.test(k); }).sort().forEach(function (k) { docs = docs.concat(self.parseDocs(self.fs[k], k)); }); return; }
        if (txt === null) throw new KErr('error: the path "' + f + '" does not exist');
      }
      docs = docs.concat(self.parseDocs(txt, f));
    });
    return docs;
  };
  P.parseDocs = function (txt, name) {
    var out = [];
    try { Y.loadAll(txt, function (d) { if (d && typeof d === 'object') out.push(d); }); }
    catch (e) { throw new KErr('error: error parsing ' + name + ': ' + String(e.reason || e.message).split('\n')[0] + (e.mark ? ' at line ' + (e.mark.line + 1) : '')); }
    var flat = []; out.forEach(function (d) { if (d.kind === 'List' && d.items) flat = flat.concat(d.items); else flat.push(d); });
    flat.forEach(function (d) { if (!d.kind) throw new KErr('error: error validating "' + name + '": error validating data: kind not set'); if (!d.apiVersion) throw new KErr('error: error validating "' + name + '": error validating data: apiVersion not set'); });
    return flat;
  };
  P.resName = function (o) { var d = this.kindOf(o); return this.disp(d) + '/' + o.metadata.name; };

  P.applyObj = function (obj, mode, flags) {
    var d = this.kindOf(obj); if (!d) throw new KErr('error: resource mapping not found for name: "' + (obj.metadata && obj.metadata.name) + '" namespace: "" from "' + 'file' + '": no matches for kind "' + obj.kind + '" in version "' + obj.apiVersion + '"\nensure CRDs are installed first');
    obj = clone(obj); obj.metadata = obj.metadata || {};
    if (d.ns && !obj.metadata.namespace) obj.metadata.namespace = (flags && flags.n) || this.ctxNs;
    var key = this.key(d.kind, d.ns ? obj.metadata.namespace : '', obj.metadata.name), ex = this.objs[key];
    if (!ex) { if (flags && flags['dry-run'] && flags['dry-run'] !== 'none') { this.defaults(obj); return { name: this.resName(obj), action: 'created (dry run)' }; } var c = this.createRaw(obj); return { obj: c, name: this.resName(c), action: 'created' }; }
    if (mode === 'create') throw new KErr('Error from server (AlreadyExists): ' + d.plural + (d.group ? '.' + d.group : '') + ' "' + obj.metadata.name + '" already exists');
    var before = JSON.stringify([ex.spec, ex.data, ex.rules, ex.subjects, ex.metadata.labels, ex.metadata.annotations]);
    var nu = clone(obj);
    if (d.kind === 'Pod') { // pods are mostly immutable
      var allowed = ['image'], a1 = clone(ex.spec), b1 = clone(nu.spec || {});
      a1.containers.forEach(function (c) { delete c.image; }); (b1.containers || []).forEach(function (c) { delete c.image; });
      ['nodeName', 'serviceAccountName', 'restartPolicy', 'dnsPolicy', 'tolerations', 'enableServiceLinks', 'preemptionPolicy', 'priority', 'schedulerName', 'terminationGracePeriodSeconds'].forEach(function (k) { delete a1[k]; delete b1[k]; });
      void allowed;
      if (JSON.stringify(Object.keys(b1.containers || [])) !== JSON.stringify(Object.keys(a1.containers)) || JSON.stringify(a1.containers.map(function (c) { return JSON.stringify(Object.assign({}, c, { imagePullPolicy: undefined, terminationMessagePath: undefined })); })) !== JSON.stringify((b1.containers || []).map(function (c) { return JSON.stringify(Object.assign({}, c, { imagePullPolicy: undefined })); })) && JSON.stringify(a1) !== JSON.stringify(b1))
        throw new KErr('The Pod "' + ex.metadata.name + '" is invalid: spec: Forbidden: pod updates may not change fields other than `spec.containers[*].image`, `spec.initContainers[*].image`, `spec.activeDeadlineSeconds`, `spec.tolerations` (only additions to existing tolerations) or `spec.terminationGracePeriodSeconds` (allow it to be set to 1 if it was previously negative)');
      ex.spec.containers.forEach(function (c, i) { if (nu.spec.containers[i]) c.image = nu.spec.containers[i].image; }); this.changed();
      return { obj: ex, name: this.resName(ex), action: 'configured' };
    }
    if (d.kind === 'Service' && nu.spec) { nu.spec.clusterIP = nu.spec.clusterIP || ex.spec.clusterIP; (nu.spec.ports || []).forEach(function (p, i) { var op = (ex.spec.ports || [])[i]; if (!p.nodePort && op && op.nodePort && nu.spec.type !== 'ClusterIP') p.nodePort = op.nodePort; }); }
    if (nu.spec !== undefined) { var tmp = { apiVersion: nu.apiVersion, kind: nu.kind, metadata: Object.assign({}, nu.metadata, { uid: ex.metadata.uid, creationTimestamp: ex.metadata.creationTimestamp, generation: ex.metadata.generation, resourceVersion: ex.metadata.resourceVersion }), spec: nu.spec }; if (flags && flags['dry-run'] && flags['dry-run'] !== 'none') { return { name: this.resName(ex), action: 'configured (dry run)' }; } this.defaults(tmp); ex.spec = tmp.spec; }
    if (nu.data !== undefined || d.kind === 'ConfigMap' || d.kind === 'Secret') { if (d.kind === 'Secret') { var tm = { apiVersion: 'v1', kind: 'Secret', metadata: { name: 'x', namespace: ex.metadata.namespace }, data: nu.data, stringData: nu.stringData, type: nu.type }; this.defaults(tm); ex.data = tm.data; } else ex.data = nu.data; if (nu.binaryData) ex.binaryData = nu.binaryData; }
    if (nu.rules) ex.rules = nu.rules; if (nu.subjects) ex.subjects = nu.subjects;
    if (nu.metadata.labels) ex.metadata.labels = nu.metadata.labels; if (nu.metadata.annotations) ex.metadata.annotations = Object.assign({}, ex.metadata.annotations, nu.metadata.annotations);
    var after = JSON.stringify([ex.spec, ex.data, ex.rules, ex.subjects, ex.metadata.labels, ex.metadata.annotations]);
    if (before === after) return { obj: ex, name: this.resName(ex), action: 'unchanged' };
    ex.metadata.generation++; this.changed();
    return { obj: ex, name: this.resName(ex), action: 'configured' };
  };

  P.kMutate = function (verb, a, stdin) {
    var self = this, f = a.flags;
    switch (verb) {
      case 'apply': case 'create': case 'replace': {
        if (verb === 'create' && !f.f && !f.k && a.pos.length) return this.kCreateGen(a);
        if (verb === 'create' && !f.f && !a.pos.length) throw new KErr('error: Must specify one of -f and -k\n\nCreate a resource from a file or from stdin.');
        var docs;
        if (f.k) docs = this.kustomizeBuild(f.k); else if (f.f) docs = this.loadManifests(f.f, stdin); else throw new KErr('error: must specify one of -f and -k');
        if (!docs.length) throw new KErr('error: no objects passed to ' + verb);
        var out = [];
        if (verb === 'replace' && f.force) docs.forEach(function (o) { var d = self.kindOf(o); var ex = d && self.objs[self.key(d.kind, d.ns ? (o.metadata.namespace || self.ctxNs) : '', o.metadata.name)]; if (ex) { self.remove(ex); out.push(self.resName(ex) + ' deleted'); } });
        docs.forEach(function (o) {
          if (verb === 'replace' && !f.force) { var d = self.kindOf(o), ex = d && self.objs[self.key(d.kind, d.ns ? (o.metadata.namespace || self.ctxNs) : '', o.metadata.name)]; if (!ex) throw self.notFound(d, o.metadata.name); }
          var r = self.applyObj(o, verb === 'create' ? 'create' : 'apply', f); out.push(r.name + ' ' + (verb === 'replace' ? (r.action === 'created' ? 'replaced' : 'replaced') : r.action));
        });
        if (f.o === 'yaml' && docs.length) return Y.dump(docs[0]);
        return out.join('\n') + '\n';
      }
      case 'delete': return this.kDelete(a);
      case 'run': return this.kRun(a);
      case 'expose': return this.kExpose(a);
      case 'scale': return this.kScale(a);
      case 'autoscale': return this.kAutoscale(a);
      case 'set': return this.kSet(a);
      case 'label': return this.kLabel(a, 'labels');
      case 'annotate': return this.kLabel(a, 'annotations');
      case 'taint': return this.kTaint(a);
      case 'cordon': case 'uncordon': return this.kCordon(a, verb);
      case 'drain': return this.kDrain(a);
      case 'rollout': return this.kRollout(a);
      case 'patch': return this.kPatch(a);
      case 'edit': return this.kEdit(a);
      case 'kustomize': return this.kustomizeBuild(a.pos[0] || '.').map(function (d) { return Y.dump(d, { lineWidth: -1, noRefs: true }); }).join('---\n');
      case 'debug': throw new KErr('error: kubectl debug is not available in the simulator');
      case 'cp': throw new KErr('error: kubectl cp is not available in the simulator');
      case 'diff': return '';
    }
    throw new KErr('error: unknown command "' + verb + '" for "kubectl"\n\nDid you mean this?\n\tget');
  };

  // ─── kubectl create <thing> ───
  P.kCreateGen = function (a) {
    var f = a.flags, sub = a.pos[0], name = a.pos[1], ns = f.n || this.ctxNs, dry = f['dry-run'] && f['dry-run'] !== 'none', self = this, o;
    function finish(obj) { if (dry) return f.o === 'yaml' ? Y.dump(strip(obj), { lineWidth: -1 }) : f.o === 'json' ? JSON.stringify(strip(obj), null, 2) + '\n' : self.resName(self.mk(obj)) + ' created (dry run)\n'; var r = self.applyObj(obj, 'create', f); return f.o === 'yaml' ? Y.dump(strip(r.obj)) : r.name + ' created\n'; }
    function strip(ob) { var c = clone(ob); if (c.metadata) { delete c.metadata.uid; delete c.metadata.creationTimestamp; delete c.metadata.generation; delete c.metadata.resourceVersion; if (!c.metadata.namespace || dry) delete c.metadata.namespace; } delete c.status; return c; }
    function labelsOf(n) { return { app: n }; }
    switch (sub) {
      case 'namespace': case 'ns': if (!name) throw new KErr('error: exactly one NAME is required, got 0'); return finish({ apiVersion: 'v1', kind: 'Namespace', metadata: { name: name } });
      case 'deployment': case 'deploy': {
        if (!f.image) throw new KErr('error: required flag(s) "image" not set');
        var imgs = arr(f.image); o = { apiVersion: 'apps/v1', kind: 'Deployment', metadata: { name: name, namespace: ns, labels: labelsOf(name) }, spec: { replicas: f.replicas !== undefined ? parseInt(f.replicas, 10) : 1, selector: { matchLabels: labelsOf(name) }, template: { metadata: { labels: labelsOf(name) }, spec: { containers: imgs.map(function (im, i) { var c = { name: imgs.length === 1 ? (im.split('/').pop().split(':')[0]) : 'c' + i, image: im }; if (f.port) c.ports = [{ containerPort: parseInt(f.port, 10) }]; return c; }) } } } };
        if (a.rest) o.spec.template.spec.containers[0].command = a.rest;
        return finish(o);
      }
      case 'configmap': case 'cm': {
        o = { apiVersion: 'v1', kind: 'ConfigMap', metadata: { name: name, namespace: ns }, data: {} };
        arr(f['from-literal']).forEach(function (l) { var i = l.indexOf('='); o.data[l.slice(0, i)] = l.slice(i + 1); });
        arr(f['from-file']).forEach(function (ff) { var parts = ff.split('='), path = parts[1] || parts[0], txt = self.readFile(path); if (txt === null) throw new KErr('error: error reading ' + path + ': no such file or directory'); o.data[parts[1] ? parts[0] : path.split('/').pop()] = txt; });
        return finish(o);
      }
      case 'secret': {
        var kind = a.pos[1], sname = a.pos[2];
        if (kind === 'docker-registry') { o = { apiVersion: 'v1', kind: 'Secret', metadata: { name: sname, namespace: ns }, type: 'kubernetes.io/dockerconfigjson', data: { '.dockerconfigjson': b64(JSON.stringify({ auths: {} })) } }; return finish(o); }
        if (kind === 'tls') { o = { apiVersion: 'v1', kind: 'Secret', metadata: { name: sname, namespace: ns }, type: 'kubernetes.io/tls', data: { 'tls.crt': b64('CERT'), 'tls.key': b64('KEY') } }; return finish(o); }
        if (kind !== 'generic') throw new KErr('error: unknown secret type "' + kind + '"');
        o = { apiVersion: 'v1', kind: 'Secret', metadata: { name: sname, namespace: ns }, type: 'Opaque', data: {} };
        arr(f['from-literal']).forEach(function (l) { var i = l.indexOf('='); o.data[l.slice(0, i)] = b64(l.slice(i + 1)); });
        arr(f['from-file']).forEach(function (ff) { var parts = ff.split('='), path = parts[1] || parts[0], txt = self.readFile(path); if (txt === null) throw new KErr('error: error reading ' + path + ': no such file or directory'); o.data[parts[1] ? parts[0] : path.split('/').pop()] = b64(txt); });
        return finish(o);
      }
      case 'serviceaccount': case 'sa': return finish({ apiVersion: 'v1', kind: 'ServiceAccount', metadata: { name: name, namespace: ns } });
      case 'role': case 'clusterrole': {
        var verbs = String(f.verb || '').split(','), ress = arr(f.resource).join(',').split(',').filter(Boolean);
        var rule = { apiGroups: [''], resources: [], verbs: verbs }, groups = {}; ress.forEach(function (r0) { var rr = r0.split('/')[0], d = self.findKind(rr); var g = d ? d.group : ''; (groups[g] = groups[g] || []).push(d ? d.plural + (r0.indexOf('/') > 0 ? '/' + r0.split('/')[1] : '') : r0); });
        var rules = Object.keys(groups).map(function (g) { return { apiGroups: [g], resources: groups[g], verbs: verbs }; }); void rule;
        if (f['resource-name']) rules.forEach(function (r1) { r1.resourceNames = arr(f['resource-name']); });
        o = { apiVersion: 'rbac.authorization.k8s.io/v1', kind: sub === 'role' ? 'Role' : 'ClusterRole', metadata: { name: name, namespace: sub === 'role' ? ns : undefined }, rules: rules }; if (sub === 'clusterrole') delete o.metadata.namespace; return finish(o);
      }
      case 'rolebinding': case 'clusterrolebinding': {
        var subjects = [];
        arr(f.user).forEach(function (u) { subjects.push({ apiGroup: 'rbac.authorization.k8s.io', kind: 'User', name: u }); });
        arr(f.group).forEach(function (g) { subjects.push({ apiGroup: 'rbac.authorization.k8s.io', kind: 'Group', name: g }); });
        arr(f.serviceaccount).forEach(function (sa) { var p = sa.split(':'); subjects.push({ kind: 'ServiceAccount', name: p[1], namespace: p[0] }); });
        var rr = f.clusterrole ? { kind: 'ClusterRole', name: f.clusterrole } : { kind: 'Role', name: f.role };
        if (!rr.name) throw new KErr('error: exactly one of clusterrole or role must be specified');
        o = { apiVersion: 'rbac.authorization.k8s.io/v1', kind: sub === 'rolebinding' ? 'RoleBinding' : 'ClusterRoleBinding', metadata: { name: name, namespace: sub === 'rolebinding' ? ns : undefined }, roleRef: { apiGroup: 'rbac.authorization.k8s.io', kind: rr.kind, name: rr.name }, subjects: subjects };
        if (sub === 'clusterrolebinding') delete o.metadata.namespace; return finish(o);
      }
      case 'quota': case 'resourcequota': { var hard = {}; String(f.hard || '').split(',').forEach(function (p) { var kv = p.split('='); if (kv[0]) hard[kv[0]] = kv[1]; }); return finish({ apiVersion: 'v1', kind: 'ResourceQuota', metadata: { name: name, namespace: ns }, spec: { hard: hard } }); }
      case 'poddisruptionbudget': case 'pdb': { var sel = {}; String(f.selector || '').split(',').forEach(function (p) { var kv = p.split('='); if (kv[0]) sel[kv[0]] = kv[1]; }); var sp = { selector: { matchLabels: sel } }; if (f['min-available']) sp.minAvailable = /^\d+$/.test(f['min-available']) ? parseInt(f['min-available'], 10) : f['min-available']; if (f['max-unavailable']) sp.maxUnavailable = /^\d+$/.test(f['max-unavailable']) ? parseInt(f['max-unavailable'], 10) : f['max-unavailable']; return finish({ apiVersion: 'policy/v1', kind: 'PodDisruptionBudget', metadata: { name: name, namespace: ns }, spec: sp }); }
      case 'job': {
        if (f.from) { var cj = this.get('CronJob', ns, String(f.from).split('/')[1]); if (!cj) throw new KErr('Error from server (NotFound): cronjobs.batch "' + String(f.from).split('/')[1] + '" not found'); var jt = clone(cj.spec.jobTemplate); o = { apiVersion: 'batch/v1', kind: 'Job', metadata: { name: name, namespace: ns }, spec: jt.spec }; return finish(o); }
        if (!f.image) throw new KErr('error: required flag(s) "image" not set');
        o = { apiVersion: 'batch/v1', kind: 'Job', metadata: { name: name, namespace: ns }, spec: { template: { spec: { restartPolicy: 'Never', containers: [{ name: name, image: f.image }] } } } }; if (a.rest) o.spec.template.spec.containers[0].command = a.rest; return finish(o);
      }
      case 'cronjob': case 'cj': {
        if (!f.image || !f.schedule) throw new KErr('error: required flag(s) "image", "schedule" not set');
        o = { apiVersion: 'batch/v1', kind: 'CronJob', metadata: { name: name, namespace: ns }, spec: { schedule: f.schedule, jobTemplate: { spec: { template: { spec: { restartPolicy: f.restart || 'OnFailure', containers: [{ name: name, image: f.image }] } } } } } }; if (a.rest) o.spec.jobTemplate.spec.template.spec.containers[0].command = a.rest; return finish(o);
      }
      case 'service': {
        var st = name, sname2 = a.pos[2] || a.pos[1]; var type = { clusterip: 'ClusterIP', nodeport: 'NodePort', loadbalancer: 'LoadBalancer', externalname: 'ExternalName' }[String(st).toLowerCase()]; if (!type) throw new KErr('error: unknown service type ' + st);
        var ports = arr(f.tcp).map(function (t) { var p = t.split(':'); return { port: parseInt(p[0], 10), targetPort: parseInt(p[1] || p[0], 10), protocol: 'TCP' }; });
        if (type === 'ExternalName') { if (!f['external-name']) throw new KErr('error: --external-name is required'); return finish({ apiVersion: 'v1', kind: 'Service', metadata: { name: sname2, namespace: ns, labels: { app: sname2 } }, spec: { type: type, externalName: f['external-name'] } }); }
        return finish({ apiVersion: 'v1', kind: 'Service', metadata: { name: sname2, namespace: ns, labels: { app: sname2 } }, spec: { type: type, selector: { app: sname2 }, ports: ports } });
      }
      case 'ingress': case 'ing': {
        var rules2 = {}; arr(f.rule).forEach(function (r) { var m = r.match(/^([^\/]*)(\/[^=]*)=([^:]+):(\d+)/); if (!m) return; var host = m[1]; rules2[host] = rules2[host] || []; rules2[host].push({ path: m[2].replace(/\*$/, ''), pathType: /\*$/.test(m[2]) ? 'Prefix' : 'Exact', backend: { service: { name: m[3], port: { number: parseInt(m[4], 10) } } } }); });
        return finish({ apiVersion: 'networking.k8s.io/v1', kind: 'Ingress', metadata: { name: name, namespace: ns }, spec: { ingressClassName: f['class'], rules: Object.keys(rules2).map(function (h) { var r = { http: { paths: rules2[h] } }; if (h) r.host = h; return r; }) } });
      }
      case 'priorityclass': case 'pc': return finish({ apiVersion: 'scheduling.k8s.io/v1', kind: 'PriorityClass', metadata: { name: name } });
    }
    throw new KErr('error: unknown resource type "' + sub + '" for "kubectl create"');
  };
  P.mk = function (o) { return o; };

  // ─── run / expose / scale / autoscale ───
  P.kRun = function (a) {
    var f = a.flags, name = a.pos[0], ns = f.n || this.ctxNs, dry = f['dry-run'] && f['dry-run'] !== 'none';
    if (!name) throw new KErr('error: NAME is required for run'); if (!f.image) throw new KErr('error: required flag(s) "image" not set');
    var c = { name: name, image: f.image }; if (f.port) c.ports = [{ containerPort: parseInt(f.port, 10) }];
    var env = arr(f.env); if (env.length) c.env = env.map(function (e) { var i = e.indexOf('='); return { name: e.slice(0, i), value: e.slice(i + 1) }; });
    if (a.rest) c.command = a.rest; if (f.requests) { c.resources = c.resources || {}; c.resources.requests = {}; String(f.requests).split(',').forEach(function (p) { var kv = p.split('='); c.resources.requests[kv[0]] = kv[1]; }); }
    if (f.limits) { c.resources = c.resources || {}; c.resources.limits = {}; String(f.limits).split(',').forEach(function (p) { var kv = p.split('='); c.resources.limits[kv[0]] = kv[1]; }); }
    var labels = { run: name }; String(f.labels || '').split(',').filter(Boolean).forEach(function (p) { var kv = p.split('='); labels[kv[0]] = kv[1]; }); if (f.labels) delete labels.run;
    var o = { apiVersion: 'v1', kind: 'Pod', metadata: { name: name, namespace: ns, labels: labels }, spec: { containers: [c], restartPolicy: f.restart || 'Always' } };
    if (dry) { var cl = clone(o); delete cl.metadata.namespace; cl.metadata.creationTimestamp = null; cl.spec.dnsPolicy = 'ClusterFirst'; cl.status = {}; return f.o === 'yaml' ? Y.dump(cl, { lineWidth: -1 }) : f.o === 'json' ? JSON.stringify(cl, null, 2) + '\n' : 'pod/' + name + ' created (dry run)\n'; }
    var r = this.applyObj(o, 'create', f); return 'pod/' + name + ' created\n';
  };
  P.kExpose = function (a) {
    var refs = this.parseRefs(a), r = refs[0], f = a.flags, ns = f.n || this.ctxNs;
    if (!r || !r.name) throw new KErr('error: you must provide one or more resources by argument or filename'); var src = this.get(r.d.kind, ns, r.name); if (!src) throw this.notFound(r.d, r.name);
    var sel = r.d.kind === 'Pod' ? src.metadata.labels : (src.spec.selector.matchLabels || src.spec.selector); if (!sel || !Object.keys(sel).length) throw new KErr('error: couldn\'t find port via --port flag or introspection');
    var port = f.port ? parseInt(f.port, 10) : (((src.spec.template ? src.spec.template.spec : src.spec).containers[0].ports || [])[0] || {}).containerPort;
    if (!port) throw new KErr('error: couldn\'t find port via --port flag or introspection');
    var name = f.name || r.name, o = { apiVersion: 'v1', kind: 'Service', metadata: { name: name, namespace: ns, labels: src.metadata.labels || {} }, spec: { type: f.type || 'ClusterIP', selector: clone(sel), ports: [{ port: port, targetPort: f['target-port'] ? (/^\d+$/.test(f['target-port']) ? parseInt(f['target-port'], 10) : f['target-port']) : port, protocol: 'TCP' }] } };
    if (f['dry-run'] && f['dry-run'] !== 'none') return f.o === 'yaml' ? Y.dump(o) : 'service/' + name + ' exposed (dry run)\n';
    this.applyObj(o, 'create', f); return 'service/' + name + ' exposed\n';
  };
  P.kScale = function (a) {
    var refs = this.parseRefs(a), f = a.flags, ns = f.n || this.ctxNs, n = f.replicas; if (n === undefined) throw new KErr('error: required flag(s) "replicas" not set'); n = parseInt(n, 10);
    var out = []; var self = this;
    refs.forEach(function (r) { var o = self.get(r.d.kind, ns, r.name); if (!o) throw self.notFound(r.d, r.name); if (['Deployment', 'ReplicaSet', 'StatefulSet'].indexOf(r.d.kind) < 0) throw new KErr('error: cannot scale ' + r.d.singular); o.spec.replicas = n; o.metadata.generation++; self.changed(); out.push(self.disp(r.d) + '/' + r.name + ' scaled'); });
    return out.join('\n') + '\n';
  };
  P.kAutoscale = function (a) {
    var refs = this.parseRefs(a), f = a.flags, r = refs[0], ns = f.n || this.ctxNs; var tgt = this.get(r.d.kind, ns, r.name); if (!tgt) throw this.notFound(r.d, r.name);
    if (!f.max) throw new KErr('error: required flag(s) "max" not set');
    var o = { apiVersion: 'autoscaling/v2', kind: 'HorizontalPodAutoscaler', metadata: { name: r.name, namespace: ns }, spec: { scaleTargetRef: { apiVersion: tgt.apiVersion, kind: r.d.kind, name: r.name }, minReplicas: parseInt(f.min || 1, 10), maxReplicas: parseInt(f.max, 10), metrics: [{ type: 'Resource', resource: { name: 'cpu', target: { type: 'Utilization', averageUtilization: parseInt(f['cpu-percent'] || 80, 10) } } }] } };
    this.applyObj(o, 'create', f); return 'horizontalpodautoscaler.autoscaling/' + r.name + ' autoscaled\n';
  };

  // ─── set image|env|resources|serviceaccount ───
  P.kSet = function (a) {
    var self = this, sub = a.pos.shift(), f = a.flags, ns = f.n || this.ctxNs, slash = a.pos[0] && a.pos[0].indexOf('/') > 0, nref = slash ? 1 : 2, refs = this.parseRefs({ pos: a.pos.slice(0, nref), flags: f }), r = refs[0]; if (!r) throw new KErr('error: resource required');
    var o = this.get(r.d.kind, ns, r.name); if (!o) throw this.notFound(r.d, r.name);
    var spec = o.kind === 'Pod' ? o.spec : (o.spec.template ? o.spec.template.spec : (o.spec.jobTemplate ? o.spec.jobTemplate.spec.template.spec : null)); if (!spec) throw new KErr('error: cannot set on ' + r.d.singular);
    var rest = a.pos.slice(nref);
    function targets(cn) { var all = spec.containers.concat(spec.initContainers || []); if (!cn || cn === '*') return all; var t = all.filter(function (c) { return c.name === cn; }); if (!t.length) throw new KErr('error: unable to find container named "' + cn + '"'); return t; }
    if (sub === 'image') {
      var pairs = rest.filter(function (x) { return x.indexOf('=') > 0; }); if (!pairs.length) throw new KErr('error: at least one image update is required');
      pairs.forEach(function (p) { var kv = p.split('='); targets(kv[0]).forEach(function (c) { c.image = kv[1]; }); });
    } else if (sub === 'env') {
      var ct = targets(f.c); rest.forEach(function (p) { var i = p.indexOf('='); if (i < 0) { if (/-$/.test(p)) ct.forEach(function (c) { c.env = (c.env || []).filter(function (e) { return e.name !== p.slice(0, -1); }); }); return; } ct.forEach(function (c) { c.env = c.env || []; var e = c.env.filter(function (x) { return x.name === p.slice(0, i); })[0]; if (e) { e.value = p.slice(i + 1); delete e.valueFrom; } else c.env.push({ name: p.slice(0, i), value: p.slice(i + 1) }); }); });
      arr(f.env).forEach(function (p) { var i = p.indexOf('='); ct.forEach(function (c) { c.env = c.env || []; c.env.push({ name: p.slice(0, i), value: p.slice(i + 1) }); }); });
      if (f.from) { var fr = String(f.from).split('/'); ct.forEach(function (c) { c.envFrom = c.envFrom || []; c.envFrom.push(fr[0] === 'configmap' || fr[0] === 'cm' ? { configMapRef: { name: fr[1] } } : { secretRef: { name: fr[1] } }); }); }
    } else if (sub === 'resources') {
      targets(f.c).forEach(function (c) { c.resources = c.resources || {}; ['limits', 'requests'].forEach(function (k) { if (f[k]) { c.resources[k] = c.resources[k] || {}; String(f[k]).split(',').forEach(function (p) { var kv = p.split('='); c.resources[k][kv[0]] = kv[1]; }); } }); });
    } else if (sub === 'serviceaccount') { spec.serviceAccountName = rest[0]; }
    else throw new KErr('error: unknown set subcommand "' + sub + '"');
    if (o.kind !== 'Pod') o.metadata.generation++; this.changed();
    return self.disp(r.d) + '/' + r.name + ' ' + (sub === 'serviceaccount' ? 'serviceaccount updated' : 'image updated').replace('image updated', sub === 'image' ? 'image updated' : sub === 'env' ? 'env updated' : 'resource requirements updated') + '\n';
  };

  P.kLabel = function (a, field) {
    var f = a.flags, ns = f.n || this.ctxNs, self = this, out = [], refs, rest = [];
    var pos = a.pos.slice(), kvs = pos.filter(function (p) { return p.indexOf('=') > 0 || /^[\w.\/-]+-$/.test(p) && pos.indexOf(p) > 1; }); var other = pos.filter(function (p) { return kvs.indexOf(p) < 0; });
    refs = this.parseRefs({ pos: other, flags: f }); void rest;
    refs.forEach(function (r) {
      var list = r.name ? [self.get(r.d.kind, ns, r.name)] : self.list(r.d, f['all'] ? null : ns, f.l); if (r.name && !list[0]) throw self.notFound(r.d, r.name);
      list.forEach(function (o) {
        o.metadata[field] = o.metadata[field] || {};
        kvs.forEach(function (kv) {
          if (/-$/.test(kv) && kv.indexOf('=') < 0) delete o.metadata[field][kv.slice(0, -1)];
          else { var i = kv.indexOf('='), k = kv.slice(0, i); if (o.metadata[field][k] !== undefined && !f.overwrite) throw new KErr('error: \'' + k + '\' already has a value (' + o.metadata[field][k] + '), and --overwrite is false'); o.metadata[field][k] = kv.slice(i + 1); }
        });
        self.changed(); out.push(self.disp(r.d) + '/' + o.metadata.name + (field === 'labels' ? ' labeled' : ' annotated'));
      });
    });
    return out.join('\n') + '\n';
  };
  P.kTaint = function (a) {
    var refs = this.parseRefs({ pos: a.pos.slice(0, 2), flags: a.flags }), rest = a.pos.slice(2), self = this, out = [];
    var r = refs[0]; var n = this.get('Node', '', r.name); if (!n) throw this.notFound(r.d, r.name);
    rest.forEach(function (t) {
      var rm = /-$/.test(t); if (rm) t = t.slice(0, -1);
      var m = t.match(/^([^=:]+)(?:=([^:]*))?(?::(\w+))?$/); if (!m) throw new KErr('error: invalid taint spec: ' + t);
      n.spec.taints = n.spec.taints || [];
      if (rm) { var before = n.spec.taints.length; n.spec.taints = n.spec.taints.filter(function (x) { return !(x.key === m[1] && (!m[3] || x.effect === m[3])); }); if (before === n.spec.taints.length) throw new KErr('error: taint "' + t + '" not found'); out.push('node/' + r.name + ' untainted'); }
      else { if (!m[3]) throw new KErr('error: invalid taint effect: , unsupported taint effect'); if (n.spec.taints.some(function (x) { return x.key === m[1] && x.effect === m[3]; })) { out.push('node/' + r.name + ' modified'); } else { n.spec.taints.push({ key: m[1], value: m[2] || undefined, effect: m[3] }); out.push('node/' + r.name + ' tainted'); } }
    }); this.changed(); void self; return out.join('\n') + '\n';
  };
  P.kCordon = function (a, verb) { var n = this.get('Node', '', a.pos[0]); if (!n) throw new KErr('Error from server (NotFound): nodes "' + a.pos[0] + '" not found'); var was = !!n.spec.unschedulable; n.spec.unschedulable = verb === 'cordon'; this.changed(); return 'node/' + n.metadata.name + (was === n.spec.unschedulable ? ' already ' + (verb === 'cordon' ? 'cordoned' : 'uncordoned') : ' ' + (verb === 'cordon' ? 'cordoned' : 'uncordoned')) + '\n'; };
  P.kDrain = function (a) {
    var f = a.flags, n = this.get('Node', '', a.pos[0]), self = this; if (!n) throw new KErr('Error from server (NotFound): nodes "' + a.pos[0] + '" not found');
    n.spec.unschedulable = true; var out = 'node/' + n.metadata.name + ' cordoned\n', errs = [], evicted = [];
    var pods = this.list('Pod').filter(function (p) { return p.spec.nodeName === n.metadata.name && !p.metadata.deletionTimestamp; });
    var ds = pods.filter(function (p) { return (p.metadata.ownerReferences || []).some(function (o) { return o.kind === 'DaemonSet'; }); });
    if (ds.length && !f['ignore-daemonsets']) throw new KErr('error: cannot delete DaemonSet-managed Pods (use --ignore-daemonsets to ignore): ' + ds.map(function (p) { return p.metadata.namespace + '/' + p.metadata.name; }).join(', '));
    if (ds.length) out += 'Warning: ignoring DaemonSet-managed Pods: ' + ds.map(function (p) { return p.metadata.namespace + '/' + p.metadata.name; }).join(', ') + '\n';
    pods.forEach(function (p) {
      if (ds.indexOf(p) >= 0) return;
      if (p.metadata.namespace === 'kube-system' && /^(etcd|kube-)/.test(p.metadata.name)) return;
      var ctl = (p.metadata.ownerReferences || []).length > 0;
      if (!ctl && !f.force) { errs.push('cannot delete Pods declare no controller (use --force): ' + p.metadata.namespace + '/' + p.metadata.name); return; }
      if ((p.spec.volumes || []).some(function (v) { return v.emptyDir; }) && !f['delete-emptydir-data']) { errs.push('cannot delete Pods with local storage (use --delete-emptydir-data to override): ' + p.metadata.namespace + '/' + p.metadata.name); return; }
      var blocked = self.list('PodDisruptionBudget', p.metadata.namespace).filter(function (b) { return U.matchSel(b.spec.selector, p.metadata.labels); }).some(function (b) { return (b.status || {}).disruptionsAllowed < 1; });
      if (blocked) { errs.push('Cannot evict pod as it would violate the pod\'s disruption budget.: ' + p.metadata.namespace + '/' + p.metadata.name); return; }
      p.metadata.deletionTimestamp = self.t; evicted.push(p); out += 'evicting pod ' + p.metadata.namespace + '/' + p.metadata.name + '\n';
    });
    if (errs.length) throw new KErr(out + 'error: unable to drain node "' + n.metadata.name + '" due to error: ' + errs.join(', ') + ', continuing command...\nThere are pending pods in node "' + n.metadata.name + '" when an error occurred');
    this.settle(4); this.changed(); return out + 'node/' + n.metadata.name + ' drained\n';
  };

  P.kDelete = function (a) {
    var f = a.flags, self = this, out = [], ns = f.n || this.ctxNs;
    var targets = [];
    if (f.f) { this.loadManifests(f.f, null).forEach(function (o) { var d = self.kindOf(o); if (!d) throw new KErr('error: unable to recognize: no matches for kind "' + o.kind + '"'); var g = self.objs[self.key(d.kind, d.ns ? (o.metadata.namespace || ns) : '', o.metadata.name)]; if (g) targets.push({ d: d, o: g }); else if (!f['ignore-not-found']) throw self.notFound(d, o.metadata.name); }); }
    else {
      var refs = this.parseRefs(a); if (!refs.length) throw new KErr('error: You must provide one or more resources by argument or filename.\nExample resource specifications include:\n   \'-f rsrc.yaml\'\n   \'--filename=rsrc.json\'\n   \'<resource> <name>\'\n   \'<resource>\'');
      refs.forEach(function (r) { if (r.name) { var o = self.objs[self.key(r.d.kind, r.d.ns ? ns : '', r.name)]; if (!o) { if (f['ignore-not-found']) return; throw self.notFound(r.d, r.name); } targets.push({ d: r.d, o: o }); } else { if (!f.all && !f.l && !f['all-namespaces']) { if (r.d.kind === 'Namespace' || true) throw new KErr('error: resource(s) were provided, but no name was specified'); } self.list(r.d, f['all-namespaces'] ? null : ns, f.l).forEach(function (o) { targets.push({ d: r.d, o: o }); }); } });
    }
    if (!targets.length) return 'No resources found\n';
    targets.forEach(function (t) {
      var o = t.o;
      if (o.kind === 'Namespace' && ['default', 'kube-system', 'kube-public', 'kube-node-lease'].indexOf(o.metadata.name) >= 0) throw new KErr('Error from server (Forbidden): namespaces "' + o.metadata.name + '" is forbidden: this namespace may not be deleted');
      if (o.kind === 'Pod' && o.spec.nodeName && !f.force && f['grace-period'] !== '0') { o.metadata.deletionTimestamp = self.t; self.changed(); }
      else if (o.kind === 'Pod' && o.spec.nodeName) { self.remove(o); }
      else self.remove(o);
      out.push((t.d.kind === 'Pod' ? 'pod' : self.disp(t.d)) + ' "' + o.metadata.name + '" deleted');
    });
    this.settle(1); return out.join('\n') + '\n';
  };

  P.kRollout = function (a) {
    var sub = a.pos.shift(), f = a.flags, ns = f.n || this.ctxNs, refs = this.parseRefs(a), r = refs[0], self = this;
    if (!r || !r.name) throw new KErr('error: required resource not specified');
    var o = this.get(r.d.kind, ns, r.name); if (!o) throw this.notFound(r.d, r.name); var disp = this.disp(r.d) + '/' + r.name;
    if (['Deployment', 'StatefulSet', 'DaemonSet'].indexOf(r.d.kind) < 0) throw new KErr('error: ' + r.d.singular + ' is not rollout-able');
    var rss = this.list('ReplicaSet', ns).filter(function (x) { return (x.metadata.ownerReferences || []).some(function (w) { return w.uid === o.metadata.uid; }); }).sort(function (p, q) { return parseInt(p.metadata.annotations['deployment.kubernetes.io/revision'], 10) - parseInt(q.metadata.annotations['deployment.kubernetes.io/revision'], 10); });
    switch (sub) {
      case 'status': {
        var lines = ''; for (var i = 0; i < 40; i++) {
          this.statusDeployment(o); var st = o.status || {};
          if (st._complete) return lines + 'deployment "' + r.name + '" successfully rolled out\n';
          if (i === 0 || i % 5 === 0) lines += 'Waiting for deployment "' + r.name + '" rollout to finish: ' + (st.updatedReplicas < o.spec.replicas ? st.updatedReplicas + ' out of ' + o.spec.replicas + ' new replicas have been updated...' : (st.availableReplicas || 0) + ' of ' + o.spec.replicas + ' updated replicas are available...') + '\n';
          this.settle(1);
        }
        throw new KErr(lines + 'error: deployment "' + r.name + '" exceeded its progress deadline');
      }
      case 'history': { var rows = rss.filter(function (x) { return x.metadata.annotations['deployment.kubernetes.io/revision']; }).map(function (x) { return [x.metadata.annotations['deployment.kubernetes.io/revision'], x.metadata.annotations['kubernetes.io/change-cause'] || '<none>']; }); return disp + '\nREVISION  CHANGE-CAUSE\n' + rows.map(function (rw) { return rw[0].padEnd(10) + rw[1]; }).join('\n') + '\n'; }
      case 'undo': {
        var tr = f['to-revision'] ? String(f['to-revision']) : null, cur = rss.filter(function (x) { return x.spec.replicas > 0 || x === rss[rss.length - 1]; }).pop(), prev;
        if (tr) prev = rss.filter(function (x) { return x.metadata.annotations['deployment.kubernetes.io/revision'] === tr; })[0]; else prev = rss.length >= 2 ? rss[rss.length - 2] : null;
        if (!prev) throw new KErr('error: no rollout history found for ' + disp); void cur;
        var tpl = clone(prev.spec.template); delete tpl.metadata.labels['pod-template-hash']; o.spec.template = tpl; o.metadata.generation++; this.settle(1); return disp + ' rolled back\n';
      }
      case 'restart': { o.spec.template.metadata = o.spec.template.metadata || {}; o.spec.template.metadata.annotations = Object.assign({}, o.spec.template.metadata.annotations, { 'kubectl.kubernetes.io/restartedAt': '2026-11-09T07:' + String(this.t % 60).padStart(2, '0') + ':00Z' }); o.metadata.generation++; this.changed(); return disp + ' restarted\n'; }
      case 'pause': o.spec.paused = true; this.changed(); return disp + ' paused\n';
      case 'resume': delete o.spec.paused; this.changed(); return disp + ' resumed\n';
    }
    throw new KErr('error: unknown rollout subcommand "' + sub + '"'); void self;
  };

  function mergePatch(t, p) { if (p === null || typeof p !== 'object' || Array.isArray(p)) return clone(p); t = (t && typeof t === 'object' && !Array.isArray(t)) ? t : {}; Object.keys(p).forEach(function (k) { if (p[k] === null) delete t[k]; else if (Array.isArray(p[k])) t[k] = clone(p[k]); else t[k] = mergePatch(t[k], p[k]); }); return t; }
  function strategicMerge(t, p, key) {
    if (Array.isArray(p) && Array.isArray(t) && p.length && p[0] && typeof p[0] === 'object' && p[0].name !== undefined) { var out = clone(t); p.forEach(function (pi) { var ex = out.filter(function (x) { return x.name === pi.name; })[0]; if (ex) { var m = strategicMerge(ex, pi); Object.keys(m).forEach(function (k) { ex[k] = m[k]; }); } else out.push(clone(pi)); }); return out; }
    if (p === null || typeof p !== 'object' || Array.isArray(p)) return clone(p);
    t = (t && typeof t === 'object' && !Array.isArray(t)) ? t : {}; Object.keys(p).forEach(function (k) { if (p[k] === null) delete t[k]; else t[k] = strategicMerge(t[k], p[k], k); }); return t;
  }
  P.kPatch = function (a) {
    var f = a.flags, ns = f.n || this.ctxNs, refs = this.parseRefs(a), r = refs[0], type = f.type || 'strategic'; if (!r || !r.name) throw new KErr('error: must specify resource and name'); if (!f.p) throw new KErr('error: must specify --patch or --patch-file containing the contents of the patch');
    var o = this.get(r.d.kind, ns, r.name); if (!o) throw this.notFound(r.d, r.name); var patch; try { patch = JSON.parse(f.p); } catch (e) { try { patch = Y.load(f.p); } catch (e2) { throw new KErr('error: unable to parse "' + f.p + '": ' + e.message); } }
    var before = JSON.stringify([o.spec, o.metadata.labels, o.metadata.annotations, o.data, o.automountServiceAccountToken, o.metadata.finalizers]);
    if (type === 'json') { patch.forEach(function (op) { var parts = op.path.split('/').slice(1).map(function (x) { return x.replace(/~1/g, '/').replace(/~0/g, '~'); }), cur = o, i; for (i = 0; i < parts.length - 1; i++) cur = cur[parts[i]]; var last = parts[parts.length - 1]; if (op.op === 'replace' || op.op === 'add') { if (Array.isArray(cur) && last === '-') cur.push(op.value); else if (Array.isArray(cur) && op.op === 'add') cur.splice(+last, 0, op.value); else cur[last] = op.value; } else if (op.op === 'remove') { if (Array.isArray(cur)) cur.splice(+last, 1); else delete cur[last]; } }); }
    else { var merged = type === 'merge' ? mergePatch(clone({ spec: o.spec, metadata: { labels: o.metadata.labels, annotations: o.metadata.annotations }, data: o.data }), patch) : strategicMerge(clone({ spec: o.spec, metadata: { labels: o.metadata.labels, annotations: o.metadata.annotations }, data: o.data }), patch); if (merged.spec !== undefined) o.spec = merged.spec; if (merged.metadata) { if (merged.metadata.labels) o.metadata.labels = merged.metadata.labels; if (merged.metadata.annotations) o.metadata.annotations = merged.metadata.annotations; } if (merged.data !== undefined) o.data = merged.data; if (!Array.isArray(patch)) Object.keys(patch).forEach(function (k) { if (['spec', 'metadata', 'data', 'status', 'kind', 'apiVersion'].indexOf(k) >= 0) return; var cur = {}; cur[k] = clone(o[k]); var m2 = type === 'merge' ? mergePatch(cur, patch) : strategicMerge(cur, patch); o[k] = m2[k]; }); }
    if (type !== 'json' && patch && !Array.isArray(patch) && patch.metadata && 'finalizers' in patch.metadata) { if (patch.metadata.finalizers === null || (Array.isArray(patch.metadata.finalizers) && !patch.metadata.finalizers.length)) delete o.metadata.finalizers; else if (Array.isArray(patch.metadata.finalizers)) o.metadata.finalizers = patch.metadata.finalizers.slice(); }
    var changed = before !== JSON.stringify([o.spec, o.metadata.labels, o.metadata.annotations, o.data, o.automountServiceAccountToken, o.metadata.finalizers]); if (changed && o.kind !== 'Pod') o.metadata.generation++; this.changed();
    return this.disp(r.d) + '/' + r.name + (changed ? ' patched' : ' patched (no change)') + '\n';
  };
  P.kEdit = function (a) {
    var f = a.flags, ns = f.n || this.ctxNs, refs = this.parseRefs(a), r = refs[0]; if (!r || !r.name) throw new KErr('error: must specify resource and name');
    var o = this.get(r.d.kind, ns, r.name); if (!o) throw this.notFound(r.d, r.name);
    var path = '/tmp/kubectl-edit-' + r.name + '.yaml'; this.fs[path] = Y.dump(this.exportObj(o), { lineWidth: -1, noRefs: true });
    return { stdout: 'Opening editor for ' + this.disp(r.d) + '/' + r.name + ' … save to apply (the simulator applies the buffer when you save).\n', stderr: '', code: 0, edit: path, applyOnSave: true };
  };

  // ─── kustomize (subset: resources, namespace, namePrefix/Suffix, commonLabels, images, replicas, patches(strategic inline)) ───
  P.kustomizeBuild = function (dir) {
    var self = this, base = this.abs(dir), kf = [base + '/kustomization.yaml', base + '/kustomization.yml'].filter(function (p) { return p in self.fs; })[0];
    if (!kf) throw new KErr('error: unable to find one of \'kustomization.yaml\', \'kustomization.yml\' or \'Kustomization\' in directory \'' + base + '\'');
    var k = Y.load(this.fs[kf]) || {}, docs = [];
    (k.resources || []).forEach(function (r) { var p = base + '/' + r; if (p in self.fs) docs = docs.concat(self.parseDocs(self.fs[p], r)); else if (self.isDir(p)) docs = docs.concat(self.kustomizeBuild(p)); else throw new KErr('error: accumulating resources: accumulation err=\'accumulating resources from \'' + r + '\': evalsymlink failure on \'' + p + '\' : lstat ' + p + ': no such file or directory\''); });
    docs = clone(docs);
    docs.forEach(function (d) {
      d.metadata = d.metadata || {}; var origName = d.metadata.name;
      if (k.namePrefix || k.nameSuffix) d.metadata.name = (k.namePrefix || '') + d.metadata.name + (k.nameSuffix || '');
      if (k.namespace) { var kd = self.findKind(d.kind); if (!kd || kd.ns) d.metadata.namespace = k.namespace; }
      if (k.commonLabels) { d.metadata.labels = Object.assign({}, d.metadata.labels, k.commonLabels); if (d.spec && d.spec.selector && d.spec.selector.matchLabels) d.spec.selector.matchLabels = Object.assign({}, d.spec.selector.matchLabels, k.commonLabels); else if (d.kind === 'Service' && d.spec) d.spec.selector = Object.assign({}, d.spec.selector, k.commonLabels); if (d.spec && d.spec.template) { d.spec.template.metadata = d.spec.template.metadata || {}; d.spec.template.metadata.labels = Object.assign({}, d.spec.template.metadata.labels, k.commonLabels); } }
      (k.images || []).forEach(function (im) { var specs = d.spec && d.spec.template && d.spec.template.spec; if (!specs) return; specs.containers.forEach(function (c) { if (imageRepoOf(c.image) === im.name) c.image = (im.newName || im.name) + ':' + (im.newTag || imageTagOf(c.image)); }); });
      (k.replicas || []).forEach(function (rp) { if (origName === rp.name && d.spec) d.spec.replicas = rp.count; });
    });
    (k.patches || []).concat((k.patchesStrategicMerge || []).map(function (p) { return { patch: p }; })).forEach(function (pt) {
      var patch = pt.path ? Y.load(self.fs[base + '/' + pt.path] || '') : (typeof pt.patch === 'string' && !/\n/.test(pt.patch) && (base + '/' + pt.patch) in self.fs ? Y.load(self.fs[base + '/' + pt.patch]) : Y.load(pt.patch));
      if (!patch) return;
      docs.forEach(function (d) { var pn = patch.metadata && patch.metadata.name, tn = pt.target && pt.target.name; if (d.kind === patch.kind && (d.metadata.name === pn || d.metadata.name === (k.namePrefix || '') + pn + (k.nameSuffix || '') || d.metadata.name === tn)) { var m = strategicMerge(clone(d), patch); Object.keys(m).forEach(function (kk) { if (kk !== 'metadata') d[kk] = m[kk]; }); } });
    });
    return docs;
  };
  function imageRepoOf(i) { return String(i).replace(/:[^:\/]*$/, ''); }
  function imageTagOf(i) { var m = String(i).match(/:([^:\/]+)$/); return m ? m[1] : 'latest'; }

  if (typeof module !== 'undefined' && module.exports) module.exports = Sim;
})(typeof window !== 'undefined' ? window : globalThis);
