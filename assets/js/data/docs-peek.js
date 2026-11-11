/* Docs peek: related cheatsheet commands + official kubernetes.io pages for a lab. */
(function (root) {
  var KL = root.KL = root.KL || {}, K = 'https://kubernetes.io/docs/';
  var LINKS = [
    [/pod(?!disruption)|probe|init|sidecar|crash|oom|restart/i, 'Pods', K + 'concepts/workloads/pods/'],
    [/probe|liveness|readiness/i, 'Liveness, readiness & startup probes', K + 'tasks/configure-pod-container/configure-liveness-readiness-startup-probes/'],
    [/init-container|init container/i, 'Init containers', K + 'concepts/workloads/pods/init-containers/'],
    [/deploy|rollout|rollback|revision|image|canary|blue/i, 'Deployments', K + 'concepts/workloads/controllers/deployment/'],
    [/service|endpoint|targetport|nodeport|externalname|headless|selector/i, 'Services', K + 'concepts/services-networking/service/'],
    [/ingress|tls|gateway/i, 'Ingress', K + 'concepts/services-networking/ingress/'],
    [/gateway/i, 'Gateway API', 'https://gateway-api.sigs.k8s.io/'],
    [/netpol|network ?policy|egress/i, 'Network policies', K + 'concepts/services-networking/network-policies/'],
    [/taint|toleration/i, 'Taints and tolerations', K + 'concepts/scheduling-eviction/taint-and-toleration/'],
    [/affinity|nodeselector|schedul|spread|pending/i, 'Assigning pods to nodes', K + 'concepts/scheduling-eviction/assign-pod-node/'],
    [/quota|resourcequota/i, 'Resource quotas', K + 'concepts/policy/resource-quotas/'],
    [/limitrange|limit-range|limitrange/i, 'Limit ranges', K + 'concepts/policy/limit-range/'],
    [/hpa|autoscal/i, 'Horizontal Pod Autoscaling', K + 'tasks/run-application/horizontal-pod-autoscale/'],
    [/pvc|pv\b|storage|volume|statefulset/i, 'Persistent volumes', K + 'concepts/storage/persistent-volumes/'],
    [/statefulset|headless/i, 'StatefulSets', K + 'concepts/workloads/controllers/statefulset/'],
    [/daemonset/i, 'DaemonSet', K + 'concepts/workloads/controllers/daemonset/'],
    [/job|cron/i, 'Jobs & CronJobs', K + 'concepts/workloads/controllers/job/'],
    [/configmap|cm-|config-error/i, 'ConfigMaps', K + 'concepts/configuration/configmap/'],
    [/secret|pull-secret|creds|tls/i, 'Secrets', K + 'concepts/configuration/secret/'],
    [/pull-secret|imagepull|private/i, 'Pull an image from a private registry', K + 'tasks/configure-pod-container/pull-image-private-registry/'],
    [/rbac|role|clusterrole|binding|sa-token|serviceaccount/i, 'Using RBAC authorization', K + 'reference/access-authn-authz/rbac/'],
    [/sa-token|serviceaccount/i, 'Configure service accounts', K + 'tasks/configure-pod-container/configure-service-account/'],
    [/psa|pod ?security|baseline|restricted|hostpath/i, 'Pod Security Admission', K + 'concepts/security/pod-security-admission/'],
    [/pdb|drain|cordon|disruption/i, 'Safely drain a node', K + 'tasks/administer-cluster/safely-drain-node/'],
    [/pdb|disruption/i, 'Pod disruption budgets', K + 'tasks/run-application/configure-pdb/'],
    [/crd|custom/i, 'Custom resources (CRD)', K + 'tasks/extend-kubernetes/custom-resources/custom-resource-definitions/'],
    [/kustomize/i, 'Kustomize', K + 'tasks/manage-kubernetes-objects/kustomization/'],
    [/etcd|backup/i, 'Back up and restore etcd', K + 'tasks/administer-cluster/configure-upgrade-etcd/'],
    [/jsonpath|custom-columns|sort/i, 'JSONPath support', K + 'reference/kubectl/jsonpath/'],
    [/imperative|speedrun|jsonpath|custom|sort|find/i, 'kubectl quick reference', K + 'reference/kubectl/quick-reference/']
  ];
  function words(t) { return (t.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) || []).filter(function (w) { return ['kubectl', 'with', 'that', 'this', 'from', 'your', 'then', 'name', 'pods', 'what'].indexOf(w) < 0; }); }
  function flat() { var out = []; try { if (typeof CHEATSHEET !== 'undefined') CHEATSHEET.forEach(function (g) { g.cmds.forEach(function (c) { out.push({ cmd: c.cmd, exp: c.exp, g: g.title }); }); }); } catch (e) { /* ignore */ } return out; }
  KL.docs = {
    view: function (lab, q, real) {
      var db = (KL.debrief || {})[lab.id] || [], text = lab.id + ' ' + lab.title + ' ' + lab.domain + ' ' + (db[3] || ''), links = [], seen = {};
      LINKS.forEach(function (l) { if (l[0].test(text) && !seen[l[2]]) { seen[l[2]] = 1; links.push({ t: l[1], u: l[2] }); } });
      if (!seen[K + 'reference/kubectl/quick-reference/']) links.push({ t: 'kubectl quick reference', u: K + 'reference/kubectl/quick-reference/' });
      links = links.slice(0, 7);
      if (real) return { cmds: [], links: links };
      var all = flat(), cmds;
      if (q && q.trim()) { var ql = q.toLowerCase(); cmds = all.filter(function (c) { return (c.cmd + ' ' + c.exp).toLowerCase().indexOf(ql) >= 0; }).slice(0, 20); }
      else {
        var ws = words(text); cmds = all.map(function (c) { var t = (c.cmd + ' ' + c.exp + ' ' + c.g).toLowerCase(), n = 0; ws.forEach(function (w) { if (t.indexOf(w) >= 0) n++; }); return { c: c, n: n }; }).filter(function (x) { return x.n > 0; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 10).map(function (x) { return x.c; });
        if (cmds.length < 4) cmds = cmds.concat(all.slice(0, 6 - cmds.length));
      }
      return { cmds: cmds, links: links };
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
