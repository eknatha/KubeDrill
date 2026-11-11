/* Interactive labs S49–S68: RBAC, network policy, pod security, releases, kustomize, ops & CLI speed. */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {}, Labs = KL.Labs || require('../labs-engine.js'), Yh = Labs.y;
  function T(title, hints, assert, desc) { return { id: '', title: title, desc: desc || '', hints: hints, assert: assert }; }
  function L(o) { o.tasks.forEach(function (t, i) { t.id = String(i + 1); }); return o; }
  var heredoc = function (y) { return 'kubectl apply -f - <<EOF\n' + y + 'EOF'; };
  var NS = function (n, labels) { return 'apiVersion: v1\nkind: Namespace\nmetadata:\n  name: ' + n + (labels ? '\n  labels:\n' + Object.keys(labels).map(function (k) { return '    ' + k + ': ' + labels[k]; }).join('\n') : '') + '\n'; };
  // Deployment with app + track labels (canary / blue-green)
  function D(name, ns, img, rep, app, track) {
    return 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: ' + name + '\n  namespace: ' + ns + '\nspec:\n  replicas: ' + rep + '\n  selector:\n    matchLabels:\n      app: ' + app + '\n      track: ' + track + '\n  template:\n    metadata:\n      labels:\n        app: ' + app + '\n        track: ' + track + '\n    spec:\n      containers:\n      - name: ' + name + '\n        image: ' + img + '\n';
  }
  function S(name, ns, sel, port) { return 'apiVersion: v1\nkind: Service\nmetadata:\n  name: ' + name + '\n  namespace: ' + ns + '\nspec:\n  selector:\n' + Object.keys(sel).map(function (k) { return '    ' + k + ': ' + sel[k]; }).join('\n') + '\n  ports:\n  - port: ' + port + '\n    targetPort: ' + port + '\n'; }
  var SLEEP = '    command: ["sleep", "3600"]\n';
  var SAME = 'apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\n';
  Labs.register([
    L({ id: 's49-clusterrole-nodes', num: 'S49', title: 'ClusterRole: let a ServiceAccount list nodes', diff: 'Intermediate', track: ['CKA', 'CKS'], domain: 'Security', time: '12 min', ns: 'obs',
      story: 'ServiceAccount `monitor` (namespace `obs`) must be able to `get` and `list` nodes — a cluster-scoped resource — but nothing else (no delete, no secrets). A namespaced Role cannot do this.',
      setup: ['apiVersion: v1\nkind: ServiceAccount\nmetadata:\n  name: monitor\n  namespace: obs\n'],
      tasks: [T('ClusterRole `node-reader` (get,list nodes)', ['`kubectl create clusterrole --help`', '`kubectl create clusterrole node-reader --verb=get,list --resource=nodes`', 'Nodes are cluster-scoped, so a ClusterRole is required.'], [{ t: 'exists', ref: 'clusterrole/node-reader', ns: '' }]),
        T('Bind it to the ServiceAccount cluster-wide', ['A ClusterRoleBinding grants cluster-wide.', '`kubectl create clusterrolebinding monitor-nodes --clusterrole=node-reader --serviceaccount=obs:monitor`', 'Verify: `kubectl auth can-i list nodes --as=system:serviceaccount:obs:monitor`'], [{ t: 'canI', as: 'system:serviceaccount:obs:monitor', verb: 'list', res: 'nodes', ns: '' }]),
        T('Least privilege: no delete on nodes', ['Only get,list were granted.', '`kubectl auth can-i delete nodes --as=system:serviceaccount:obs:monitor`', 'Never use `*`.'], [{ t: 'canI', as: 'system:serviceaccount:obs:monitor', verb: 'delete', res: 'nodes', ns: '', expect: false }])],
      solution: ['kubectl create clusterrole node-reader --verb=get,list --resource=nodes', 'kubectl create clusterrolebinding monitor-nodes --clusterrole=node-reader --serviceaccount=obs:monitor', 'kubectl auth can-i list nodes --as=system:serviceaccount:obs:monitor'] }),

    L({ id: 's50-rolebinding-wrong-role', num: 'S50', title: 'RoleBinding points at the wrong Role', diff: 'Intermediate', track: ['CKA', 'CKS'], domain: 'Security', time: '12 min', ns: 'team',
      story: 'ServiceAccount `dev` is bound (RoleBinding `dev-bind`) to the read-only Role `viewer`, but it needs to create Deployments (Role `editor`). A binding\'s roleRef is immutable — recreate it. `dev` must still not read Secrets.',
      setup: ['apiVersion: v1\nkind: ServiceAccount\nmetadata:\n  name: dev\n  namespace: team\n',
        'apiVersion: rbac.authorization.k8s.io/v1\nkind: Role\nmetadata:\n  name: viewer\n  namespace: team\nrules:\n- apiGroups: [""]\n  resources: ["pods"]\n  verbs: ["get", "list"]\n',
        'apiVersion: rbac.authorization.k8s.io/v1\nkind: Role\nmetadata:\n  name: editor\n  namespace: team\nrules:\n- apiGroups: ["apps"]\n  resources: ["deployments"]\n  verbs: ["get", "list", "create", "update"]\n',
        'apiVersion: rbac.authorization.k8s.io/v1\nkind: RoleBinding\nmetadata:\n  name: dev-bind\n  namespace: team\nsubjects:\n- kind: ServiceAccount\n  name: dev\n  namespace: team\nroleRef:\n  kind: Role\n  name: viewer\n  apiGroup: rbac.authorization.k8s.io\n'],
      tasks: [T('Find what the binding references', ['`kubectl get rolebinding dev-bind -o yaml`', '`kubectl auth can-i create deployments --as=system:serviceaccount:team:dev -n team` → no', 'roleRef.name is viewer.'], [{ t: 'jp', ref: 'rolebinding/dev-bind', ns: 'team', path: '.roleRef.name', ne: 'viewer' }]),
        T('dev can create deployments, not read secrets', ['`kubectl delete rolebinding dev-bind`', '`kubectl create rolebinding dev-bind --role=editor --serviceaccount=team:dev`', 'roleRef cannot be patched.'], [{ t: 'canI', as: 'system:serviceaccount:team:dev', verb: 'create', res: 'deployments', ns: 'team' }, { t: 'canI', as: 'system:serviceaccount:team:dev', verb: 'get', res: 'secrets', ns: 'team', expect: false }])],
      solution: ['kubectl delete rolebinding dev-bind -n team', 'kubectl create rolebinding dev-bind --role=editor --serviceaccount=team:dev -n team', 'kubectl auth can-i create deployments --as=system:serviceaccount:team:dev -n team'] }),

    L({ id: 's51-netpol-egress', num: 'S51', title: 'NetworkPolicy egress: allow only the API', diff: 'Advanced', track: ['CKS', 'CKA'], domain: 'Networking', time: '15 min', ns: 'eg',
      story: 'Pod `client` (role=client) has a default-deny egress policy, so it cannot reach anything. It must reach Service `api` (app=api, port 80) but NOT Service `admin`. Add an egress allow policy named `client-to-api`.',
      setup: [Yh.dep('api', 'eg', 'nginx:1.25', 1), Yh.svc('api', 'eg', 'api', 80), Yh.dep('admin', 'eg', 'nginx:1.25', 1), Yh.svc('admin', 'eg', 'admin', 80), Yh.pod('client', 'eg', 'busybox:1.36', { role: 'client' }, SLEEP),
        SAME + 'metadata:\n  name: client-deny-egress\n  namespace: eg\nspec:\n  podSelector:\n    matchLabels:\n      role: client\n  policyTypes: [Egress]\n'],
      tasks: [T('Confirm client is isolated', ['`kubectl exec client -- wget -qO- -T 2 api` → times out', '`kubectl get networkpolicy`', 'An Egress policy with no rules blocks all outbound.'], [{ t: 'exists', ref: 'networkpolicy/client-to-api', ns: 'eg' }]),
        T('client → api:80 allowed', ['Create NetworkPolicy `client-to-api`: podSelector role=client, policyTypes [Egress].', 'egress[0].to[0].podSelector.matchLabels app: api; ports TCP 80', 'Policies are additive allow-lists.'], [{ t: 'curl', ns: 'eg', from: 'client', to: 'api:80' }]),
        T('client → admin:80 still blocked', ['Do not select app=admin.', '`kubectl exec client -- wget -qO- -T 2 admin` should time out.', 'Never allow `to: []` (everything).'], [{ t: 'curl', ns: 'eg', from: 'client', to: 'admin:80', ok: false }])],
      solution: [heredoc(SAME + 'metadata:\n  name: client-to-api\n  namespace: eg\nspec:\n  podSelector:\n    matchLabels:\n      role: client\n  policyTypes: [Egress]\n  egress:\n  - to:\n    - podSelector:\n        matchLabels:\n          app: api\n    ports:\n    - protocol: TCP\n      port: 80\n'), 'kubectl exec client -n eg -- wget -qO- -T 2 admin'] }),

    L({ id: 's52-netpol-namespace', num: 'S52', title: 'NetworkPolicy: allow only a labelled namespace', diff: 'Advanced', track: ['CKS', 'CKA'], domain: 'Networking', time: '15 min', ns: 'data',
      story: 'Database Service `db` in namespace `data` is open to everyone. Only namespaces labelled `env=prod` may reach it (`web-ns` is prod, `other` is not). Create NetworkPolicy `db-from-prod` using a namespaceSelector.',
      setup: [NS('data'), NS('web-ns', { env: 'prod' }), NS('other', { env: 'dev' }), Yh.dep('db', 'data', 'nginx:1.25', 1), Yh.svc('db', 'data', 'db', 80), Yh.tester('web-ns'), Yh.tester('other')],
      tasks: [T('NetworkPolicy `db-from-prod` exists', ['`kubectl get ns --show-labels`', 'podSelector app=db, policyTypes [Ingress]', 'from: namespaceSelector.matchLabels env: prod'], [{ t: 'exists', ref: 'networkpolicy/db-from-prod', ns: 'data' }]),
        T('web-ns tester can reach db', ['`kubectl exec -n web-ns tester -- wget -qO- -T 2 db.data`', 'Allowed because the namespace carries env=prod.', 'Check the label spelling.'], [{ t: 'curl', ns: 'web-ns', from: 'tester', to: 'db.data:80' }]),
        T('other tester is blocked', ['`kubectl exec -n other tester -- wget -qO- -T 2 db.data` → timeout', 'namespaceSelector only admits env=prod.', 'Do not use an empty namespaceSelector (= all).'], [{ t: 'curl', ns: 'other', from: 'tester', to: 'db.data:80', ok: false }])],
      solution: [heredoc(SAME + 'metadata:\n  name: db-from-prod\n  namespace: data\nspec:\n  podSelector:\n    matchLabels:\n      app: db\n  policyTypes: [Ingress]\n  ingress:\n  - from:\n    - namespaceSelector:\n        matchLabels:\n          env: prod\n    ports:\n    - protocol: TCP\n      port: 80\n'), 'kubectl exec -n other tester -- wget -qO- -T 2 db.data'] }),

    L({ id: 's53-psa-baseline', num: 'S53', title: 'Pod Security (baseline) rejects a privileged pod', diff: 'Intermediate', track: ['CKS'], domain: 'Security', time: '12 min', ns: 'base',
      story: 'Namespace `base` enforces the `baseline` Pod Security Standard. Deployment `agent` runs a privileged container and cannot start. Make it compliant — do not weaken the namespace label.',
      setup: [NS('base', { 'pod-security.kubernetes.io/enforce': 'baseline' }), Yh.dep('agent', 'base', 'nginx:1.25', 2, '        securityContext:\n          privileged: true\n')],
      tasks: [T('Namespace still enforces baseline', ['`kubectl get events -n base`', 'Error mentions privileged.', 'Never relax the label to `privileged`.'], [{ t: 'jp', ref: 'namespace/base', ns: '', path: '.metadata.labels.pod-security\\.kubernetes\\.io/enforce', eq: 'baseline' }]),
        T('agent runs 2 pods, not privileged', ['Remove `privileged: true` from the container securityContext.', 'Re-apply the Deployment (or `kubectl edit`).', 'Baseline allows root but not privileged/hostPath/hostNetwork.'], [{ t: 'podsReady', ns: 'base', sel: 'app=agent', min: 2 }, { t: 'jp', ref: 'deploy/agent', ns: 'base', path: '.spec.template.spec.containers[0].securityContext.privileged', eq: '' }])],
      solution: [heredoc(Yh.dep('agent', 'base', 'nginx:1.25', 2)), 'kubectl get pods -n base'] }),

    L({ id: 's54-hostpath-baseline', num: 'S54', title: 'hostPath volume blocked by Pod Security', diff: 'Intermediate', track: ['CKS'], domain: 'Security', time: '12 min', ns: 'hp',
      story: 'Namespace `hp` enforces `baseline`. Deployment `logger` mounts a hostPath volume (`/var/log`) and is rejected. Replace it with an emptyDir volume.',
      setup: [NS('hp', { 'pod-security.kubernetes.io/enforce': 'baseline' }), Yh.dep('logger', 'hp', 'nginx:1.25', 1, '        volumeMounts:\n        - {name: logs, mountPath: /logs}\n', '      volumes:\n      - name: logs\n        hostPath:\n          path: /var/log\n')],
      tasks: [T('Understand why pods fail', ['`kubectl get events -n hp`', 'violates PodSecurity "baseline:latest": hostPath volumes', 'The cure is a different volume type.'], [{ t: 'jp', ref: 'deploy/logger', ns: 'hp', path: '.spec.template.spec.volumes[0].hostPath.path', eq: '' }]),
        T('logger Ready with emptyDir', ['Rewrite volumes: [{name: logs, emptyDir: {}}].', 'Apply the manifest again.', '`kubectl get pods -n hp`'], [{ t: 'podsReady', ns: 'hp', sel: 'app=logger', min: 1 }])],
      solution: [heredoc(Yh.dep('logger', 'hp', 'nginx:1.25', 1, '        volumeMounts:\n        - {name: logs, mountPath: /logs}\n', '      volumes:\n      - name: logs\n        emptyDir: {}\n')), 'kubectl get pods -n hp'] }),

    L({ id: 's55-image-pull-secret', num: 'S55', title: 'ImagePullBackOff from a private registry', diff: 'Intermediate', track: ['CKAD', 'CKA'], domain: 'Configuration', time: '12 min', ns: 'priv',
      story: 'Deployment `billing` uses `private.registry.io/billing:1.0` and fails with an authorization error. Create a docker-registry Secret `regcred` and reference it from the Deployment.',
      setup: [Yh.dep('billing', 'priv', 'private.registry.io/billing:1.0', 1)],
      tasks: [T('Secret `regcred` (docker-registry) exists', ['`kubectl describe pod` → no basic auth credentials', '`kubectl create secret docker-registry regcred --docker-server=private.registry.io --docker-username=ci --docker-password=s3cret`', 'Namespace `priv`.'], [{ t: 'jp', ref: 'secret/regcred', ns: 'priv', path: '.type', eq: 'kubernetes.io/dockerconfigjson' }]),
        T('Deployment uses it and pods are Ready', ['spec.template.spec.imagePullSecrets: [{name: regcred}]', '`kubectl patch deployment billing -p ...`', '`kubectl rollout status deployment/billing`'], [{ t: 'jp', ref: 'deploy/billing', ns: 'priv', path: '.spec.template.spec.imagePullSecrets[0].name', eq: 'regcred' }, { t: 'podsReady', ns: 'priv', sel: 'app=billing', min: 1 }])],
      solution: ['kubectl create secret docker-registry regcred --docker-server=private.registry.io --docker-username=ci --docker-password=s3cret -n priv', 'kubectl patch deployment billing -n priv -p \'{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"regcred"}]}}}}\'', 'kubectl rollout status deployment/billing -n priv'] }),

    L({ id: 's56-rollout-restart-secret', num: 'S56', title: 'Rotate a Secret and restart the workload', diff: 'Beginner', track: ['CKAD'], domain: 'Configuration', time: '10 min', ns: 'rot',
      story: 'Secret `db-creds` holds the old password. Rotate it to `rotated`, then make Deployment `app` pick it up — env vars are read only at pod start, so the pods must be restarted (without editing the Deployment spec by hand).',
      setup: ['apiVersion: v1\nkind: Secret\nmetadata:\n  name: db-creds\n  namespace: rot\nstringData:\n  password: old\n', Yh.dep('app', 'rot', 'nginx:1.25', 2, '        env:\n        - name: DB_PASSWORD\n          valueFrom:\n            secretKeyRef:\n              name: db-creds\n              key: password\n')],
      tasks: [T('Secret password is `rotated`', ['`kubectl create secret generic db-creds --from-literal=password=rotated` (delete the old one first, or use `--dry-run=client -o yaml | kubectl apply -f -`)', '`kubectl get secret db-creds -o jsonpath=\'{.data.password}\' | base64 -d`', 'Namespace `rot`.'], [{ t: 'jp', ref: 'secret/db-creds', ns: 'rot', path: '.data.password', eq: 'cm90YXRlZA==' }]),
        T('Deployment restarted; 2 pods Ready', ['`kubectl rollout restart deployment/app`', '`kubectl rollout status deployment/app`', 'Stamps a restartedAt annotation on the pod template.'], [{ t: 'jp', ref: 'deploy/app', ns: 'rot', path: '.spec.template.metadata.annotations.kubectl\\.kubernetes\\.io/restartedAt' }, { t: 'podsReady', ns: 'rot', sel: 'app=app', min: 2 }])],
      solution: ['kubectl delete secret db-creds -n rot', 'kubectl create secret generic db-creds --from-literal=password=rotated -n rot', 'kubectl rollout restart deployment/app -n rot', 'kubectl rollout status deployment/app -n rot'] }),

    L({ id: 's57-ingress-tls', num: 'S57', title: 'Ingress with TLS termination', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Networking', time: '15 min', ns: 'sec',
      story: 'Service `web` is exposed by Ingress `web` over plain HTTP. Terminate TLS for host `secure.local` using a TLS Secret `web-tls` (create it from the provided `tls.crt` and `tls.key`) and reference it in the Ingress.',
      setup: [Yh.dep('web', 'sec', 'nginx:1.25', 1), Yh.svc('web', 'sec', 'web', 80), 'apiVersion: networking.k8s.io/v1\nkind: Ingress\nmetadata:\n  name: web\n  namespace: sec\nspec:\n  ingressClassName: nginx\n  rules:\n  - host: secure.local\n    http:\n      paths:\n      - path: /\n        pathType: Prefix\n        backend:\n          service:\n            name: web\n            port:\n              number: 80\n'],
      setupCmds: ['echo "-----BEGIN CERTIFICATE-----" > tls.crt', 'echo "-----BEGIN PRIVATE KEY-----" > tls.key'],
      tasks: [T('TLS Secret `web-tls` exists', ['`kubectl create secret tls --help`', '`kubectl create secret tls web-tls --cert=tls.crt --key=tls.key -n sec`', 'Type must be kubernetes.io/tls.'], [{ t: 'jp', ref: 'secret/web-tls', ns: 'sec', path: '.type', eq: 'kubernetes.io/tls' }]),
        T('Ingress references the secret for secure.local', ['spec.tls: [{hosts: [secure.local], secretName: web-tls}]', '`kubectl edit ingress web` or re-apply the manifest.', '`kubectl describe ingress web`'], [{ t: 'jp', ref: 'ingress/web', ns: 'sec', path: '.spec.tls[0].secretName', eq: 'web-tls' }])],
      solution: ['kubectl create secret tls web-tls --cert=tls.crt --key=tls.key -n sec', 'kubectl patch ingress web -n sec -p \'{"spec":{"tls":[{"hosts":["secure.local"],"secretName":"web-tls"}]}}\'', 'kubectl describe ingress web -n sec'] }),

    L({ id: 's58-nodeport-fixed', num: 'S58', title: 'Expose a Service on a fixed NodePort', diff: 'Beginner', track: ['CKA', 'CKAD'], domain: 'Networking', time: '10 min', ns: 'np',
      story: 'Service `site` is ClusterIP. Make it a NodePort reachable on port 30080 (port 80 → targetPort 80).',
      setup: [Yh.dep('site', 'np', 'nginx:1.25', 2), Yh.svc('site', 'np', 'site', 80)],
      tasks: [T('Service type NodePort', ['`kubectl get svc site`', '`kubectl patch svc site -p \'{"spec":{"type":"NodePort"}}\'`', 'Or edit/apply a full manifest.'], [{ t: 'jp', ref: 'svc/site', ns: 'np', path: '.spec.type', eq: 'NodePort' }]),
        T('nodePort is exactly 30080', ['Range is 30000–32767.', 'ports: [{port: 80, targetPort: 80, nodePort: 30080}]', '`kubectl get svc site` → 80:30080/TCP'], [{ t: 'jp', ref: 'svc/site', ns: 'np', path: '.spec.ports[0].nodePort', eq: '30080' }, { t: 'endpoints', ns: 'np', svc: 'site', min: 2 }])],
      solution: ['kubectl patch svc site -n np -p \'{"spec":{"type":"NodePort","ports":[{"port":80,"targetPort":80,"nodePort":30080}]}}\'', 'kubectl get svc site -n np'] }),

    L({ id: 's59-externalname', num: 'S59', title: 'ExternalName Service for an outside database', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Networking', time: '10 min', ns: 'ext',
      story: 'Apps call `legacy-db` inside the cluster, but the database lives at `db.example.com`. `legacy-db` is currently a useless ClusterIP Service. Replace it with an ExternalName Service pointing at db.example.com.',
      setup: [Yh.svc('legacy-db', 'ext', 'nothing', 5432)],
      tasks: [T('Remove the wrong Service', ['`kubectl get svc legacy-db -o yaml`', 'Changing the type in place is awkward; recreate it.', '`kubectl delete svc legacy-db`'], [{ t: 'jp', ref: 'svc/legacy-db', ns: 'ext', path: '.spec.type', eq: 'ExternalName' }]),
        T('ExternalName → db.example.com', ['`kubectl create service externalname legacy-db --external-name db.example.com`', 'It returns a DNS CNAME, no proxying, no ports needed.', '`kubectl get svc legacy-db`'], [{ t: 'jp', ref: 'svc/legacy-db', ns: 'ext', path: '.spec.externalName', eq: 'db.example.com' }])],
      solution: ['kubectl delete svc legacy-db -n ext', 'kubectl create service externalname legacy-db --external-name db.example.com -n ext', 'kubectl get svc legacy-db -n ext'] }),

    L({ id: 's60-canary-weights', num: 'S60', title: 'Canary release: 20% of traffic via replica ratio', diff: 'Intermediate', track: ['CKAD'], domain: 'Workloads', time: '12 min', ns: 'can',
      story: 'Service `shop` fronts Deployments `stable` (v1) and `canary` (v2), which currently run 3 replicas each (50% canary). Target ~20%: 4 stable + 1 canary.',
      setup: [D('stable', 'can', 'nginx:1.24', 3, 'shop', 'stable'), D('canary', 'can', 'nginx:1.25', 3, 'shop', 'canary'), S('shop', 'can', { app: 'shop' }, 80)],
      tasks: [T('Scale the canary down to 1', ['Traffic splits roughly by endpoint count.', '`kubectl scale deployment canary --replicas=1`', '`kubectl get endpoints shop`'], [{ t: 'jp', ref: 'deploy/canary', ns: 'can', path: '.spec.replicas', eq: '1' }]),
        T('Scale stable up to 4 — 5 Ready pods total', ['`kubectl scale deployment stable --replicas=4`', '4 + 1 = 5 endpoints → canary gets 1/5 = 20%.', 'Verify with `kubectl get endpoints shop`.'], [{ t: 'jp', ref: 'deploy/stable', ns: 'can', path: '.spec.replicas', eq: '4' }, { t: 'podsReady', ns: 'can', sel: 'app=shop', min: 5, max: 5 }])],
      solution: ['kubectl scale deployment canary --replicas=1 -n can', 'kubectl scale deployment stable --replicas=4 -n can', 'kubectl get endpoints shop -n can'] }),

    L({ id: 's61-blue-green', num: 'S61', title: 'Blue/green switch by Service selector', diff: 'Intermediate', track: ['CKAD'], domain: 'Workloads', time: '12 min', ns: 'bg',
      story: 'Service `live` sends traffic to Deployment `blue` (v1). Deployment `green` (v2) is ready. Cut over to green and then scale blue to 0 (keep it for rollback).',
      setup: [D('blue', 'bg', 'nginx:1.24', 2, 'web', 'blue'), D('green', 'bg', 'nginx:1.25', 2, 'web', 'green'), S('live', 'bg', { app: 'web', track: 'blue' }, 80)],
      tasks: [T('Switch the selector to green', ['`kubectl get svc live -o yaml`', '`kubectl patch svc live -p \'{"spec":{"selector":{"track":"green"}}}\'`', 'Verify `kubectl get endpoints live`.'], [{ t: 'jp', ref: 'svc/live', ns: 'bg', path: '.spec.selector.track', eq: 'green' }, { t: 'endpoints', ns: 'bg', svc: 'live', min: 2 }]),
        T('Scale blue to 0 (kept for rollback)', ['`kubectl scale deployment blue --replicas=0`', 'Do not delete it.', 'Rollback = switch the selector back and scale up.'], [{ t: 'jp', ref: 'deploy/blue', ns: 'bg', path: '.spec.replicas', eq: '0' }])],
      solution: ['kubectl patch svc live -n bg -p \'{"spec":{"selector":{"track":"green"}}}\'', 'kubectl scale deployment blue --replicas=0 -n bg', 'kubectl get endpoints live -n bg'] }),

    L({ id: 's62-kustomize-images', num: 'S62', title: 'Kustomize: override the image tag', diff: 'Intermediate', track: ['CKAD'], domain: 'Configuration', time: '12 min', ns: 'img',
      story: 'The `base/` Deployment `web` uses `nginx:1.24`. Create `overlays/prod/` that keeps the base but sets the image tag to `1.25` using the kustomize `images:` transformer, then deploy it into namespace `img`.',
      setup: [],
      setupCmds: ['mkdir -p base', 'cat > base/deployment.yaml <<EOF\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: web\nspec:\n  replicas: 2\n  selector:\n    matchLabels:\n      app: web\n  template:\n    metadata:\n      labels:\n        app: web\n    spec:\n      containers:\n      - name: web\n        image: nginx:1.24\nEOF', 'cat > base/kustomization.yaml <<EOF\nresources:\n- deployment.yaml\nEOF'],
      tasks: [T('overlays/prod/kustomization.yaml uses `images`', ['`mkdir -p overlays/prod`', 'resources: [../../base]; namespace: img', 'images: [{name: nginx, newTag: "1.25"}]'], [{ t: 'file', path: '/home/student/overlays/prod/kustomization.yaml', has: 'newTag' }]),
        T('Deployed: web runs nginx:1.25', ['`kubectl kustomize overlays/prod` to preview.', '`kubectl apply -k overlays/prod`', '`kubectl get deploy web -n img -o wide`'], [{ t: 'jp', ref: 'deploy/web', ns: 'img', path: '.spec.template.spec.containers[0].image', eq: 'nginx:1.25' }, { t: 'podsReady', ns: 'img', sel: 'app=web', min: 2 }])],
      solution: ['mkdir -p overlays/prod', 'cat > overlays/prod/kustomization.yaml <<EOF\nresources:\n- ../../base\nnamespace: img\nimages:\n- name: nginx\n  newTag: "1.25"\nEOF', 'kubectl kustomize overlays/prod', 'kubectl apply -k overlays/prod'] }),

    L({ id: 's63-etcd-backup', num: 'S63', title: 'Back up etcd with a snapshot', diff: 'Advanced', track: ['CKA'], domain: 'Cluster', time: '10 min', ns: 'kube-system',
      story: 'Before upgrading the control plane, take an etcd snapshot to `/home/student/etcd-backup.db` and verify it. (The simulator supports `etcdctl snapshot save|status`; on a real cluster add the --endpoints/--cacert/--cert/--key flags.)',
      setup: [],
      tasks: [T('Snapshot saved', ['`etcdctl snapshot save /home/student/etcd-backup.db`', 'Real clusters: `ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 --cacert=... --cert=... --key=... snapshot save <file>`', 'Certificates live in /etc/kubernetes/pki/etcd.'], [{ t: 'file', path: '/home/student/etcd-backup.db' }]),
        T('Snapshot verified', ['`etcdctl snapshot status /home/student/etcd-backup.db`', 'It prints hash, revision, total keys and size.', 'Always verify a backup before relying on it.'], [{ t: 'file', path: '/home/student/etcd-backup.db', has: 'etcd' }])],
      solution: ['etcdctl snapshot save /home/student/etcd-backup.db', 'etcdctl snapshot status /home/student/etcd-backup.db'] }),

    L({ id: 's64-jsonpath-nodes', num: 'S64', title: 'JSONPath: extract node names and images', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Basics', time: '10 min', ns: 'jp',
      story: 'Exam-style extraction. Save all node names (space-separated) to `nodes.txt`, and the container images of every pod in namespace `jp` to `images.txt`, using `-o jsonpath`.',
      setup: [Yh.dep('web', 'jp', 'nginx:1.25', 1)],
      tasks: [T('nodes.txt contains the node names', ['`kubectl get nodes -o jsonpath=\'{.items[*].metadata.name}\' > nodes.txt`', '`cat nodes.txt`', 'Quote the JSONPath expression.'], [{ t: 'file', path: '/home/student/nodes.txt', has: 'worker1' }]),
        T('images.txt contains the pod images', ['`kubectl get pods -n jp -o jsonpath=\'{.items[*].spec.containers[*].image}\' > images.txt`', 'Or use `range` for one per line.', '`cat images.txt`'], [{ t: 'file', path: '/home/student/images.txt', has: 'nginx:1.25' }])],
      solution: ['kubectl get nodes -o jsonpath=\'{.items[*].metadata.name}\' > nodes.txt', 'kubectl get pods -n jp -o jsonpath=\'{.items[*].spec.containers[*].image}\' > images.txt', 'cat nodes.txt'] }),

    L({ id: 's65-custom-columns', num: 'S65', title: 'custom-columns and --sort-by', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Basics', time: '10 min', ns: 'cc',
      story: 'Write `pods.txt` with a table of pod name and node (columns `NAME` and `NODE`) for namespace `cc`, and `sorted.txt` with pod names sorted by creation time (`-o name`).',
      setup: [Yh.dep('a', 'cc', 'nginx:1.25', 2), Yh.dep('b', 'cc', 'nginx:1.25', 1)],
      tasks: [T('pods.txt has NAME and NODE columns', ['`kubectl get pods -n cc -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName > pods.txt`', 'custom-columns=HEADER:.json.path,...', '`cat pods.txt`'], [{ t: 'file', path: '/home/student/pods.txt', has: 'NODE' }]),
        T('sorted.txt sorted by creation time', ['`kubectl get pods -n cc --sort-by=.metadata.creationTimestamp -o name > sorted.txt`', '--sort-by takes a JSONPath without braces.', '`cat sorted.txt`'], [{ t: 'file', path: '/home/student/sorted.txt', has: 'pod/' }])],
      solution: ['kubectl get pods -n cc -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName > pods.txt', 'kubectl get pods -n cc --sort-by=.metadata.creationTimestamp -o name > sorted.txt', 'cat pods.txt'] }),

    L({ id: 's66-imperative-speedrun', num: 'S66', title: 'Imperative speed run (CKAD style)', diff: 'Beginner', track: ['CKAD', 'CKA'], domain: 'Basics', time: '8 min', ns: 'fast',
      story: 'No YAML, no editor — only imperative commands, as fast as you can. In namespace `fast`: pod `p1` (nginx:1.25, label tier=web); Deployment `api` (httpd:2.4, 3 replicas); Service `api-svc` exposing it on port 80; Job `once` (busybox:1.36, runs `echo hi`).',
      setupNs: ['fast'], setup: [],
      tasks: [T('Pod p1 with label tier=web', ['`kubectl run p1 --image=nginx:1.25 --labels=tier=web -n fast`', '`kubectl get pods -n fast --show-labels`', 'Use `-n fast` or `kubectl config set-context --current --namespace=fast`.'], [{ t: 'jp', ref: 'pod/p1', ns: 'fast', path: '.metadata.labels.tier', eq: 'web' }]),
        T('Deployment api: httpd:2.4 × 3', ['`kubectl create deployment api --image=httpd:2.4 --replicas=3 -n fast`', '`kubectl get deploy -n fast`', 'Add `--dry-run=client -o yaml` to preview.'], [{ t: 'podsReady', ns: 'fast', sel: 'app=api', min: 3 }]),
        T('Service api-svc on port 80', ['`kubectl expose deployment api --name=api-svc --port=80 -n fast`', 'Selector is copied from the Deployment.', '`kubectl get endpoints api-svc -n fast`'], [{ t: 'endpoints', ns: 'fast', svc: 'api-svc', min: 3 }]),
        T('Job once completes', ['`kubectl create job once --image=busybox:1.36 -n fast -- echo hi`', 'Everything after `--` is the command.', '`kubectl get job -n fast`'], [{ t: 'jp', ref: 'job/once', ns: 'fast', path: '.status.succeeded', eq: '1' }])],
      solution: ['kubectl run p1 --image=nginx:1.25 --labels=tier=web -n fast', 'kubectl create deployment api --image=httpd:2.4 --replicas=3 -n fast', 'kubectl expose deployment api --name=api-svc --port=80 -n fast', 'kubectl create job once --image=busybox:1.36 -n fast -- echo hi'] }),

    L({ id: 's67-find-restarts', num: 'S67', title: 'Find the pod that keeps restarting', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Troubleshooting', time: '10 min', ns: 'rs',
      story: 'Several pods run in namespace `rs`, but one keeps crashing. Find it using `--sort-by` on the restart count and write its name to `answer.txt` (e.g. `pod/xyz` or just `xyz`).',
      setup: [Yh.pod('steady', 'rs', 'nginx:1.25', { app: 'steady' }), Yh.pod('flaky', 'rs', 'busybox:1.36', { app: 'flaky' }, '    command: ["sh", "-c", "exit 1"]\n'), Yh.pod('calm', 'rs', 'nginx:1.25', { app: 'calm' })],
      tasks: [T('answer.txt names the crashing pod', ['`kubectl get pods -n rs`', '`kubectl get pods -n rs --sort-by=.status.containerStatuses[0].restartCount -o name | tail -1 > answer.txt`', 'Look at RESTARTS and STATUS columns.'], [{ t: 'file', path: '/home/student/answer.txt', has: 'flaky' }])],
      solution: ['kubectl get pods -n rs', 'kubectl get pods -n rs --sort-by=.status.containerStatuses[0].restartCount -o name | tail -1 > answer.txt'] }),

    L({ id: 's68-multi-ns-cleanup', num: 'S68', title: 'Clean up temporary namespaces by label', diff: 'Beginner', track: ['CKA'], domain: 'Cluster', time: '8 min', ns: 'prod',
      story: 'CI created namespaces `tmp-1`, `tmp-2`, `tmp-3` (all labelled `env=temp`). Delete them in one command using a label selector — `prod` (env=prod) must survive.',
      setup: [NS('tmp-1', { env: 'temp' }), NS('tmp-2', { env: 'temp' }), NS('tmp-3', { env: 'temp' }), NS('prod', { env: 'prod' }), Yh.dep('core', 'prod', 'nginx:1.25', 1)],
      tasks: [T('List namespaces by label', ['`kubectl get ns -l env=temp`', '`kubectl get ns --show-labels`', 'Check the selector before deleting!'], [{ t: 'exists', ref: 'namespace/prod', ns: '' }]),
        T('All tmp-* namespaces deleted', ['`kubectl delete ns -l env=temp`', 'Deleting a namespace deletes everything in it.', '`kubectl get ns`'], [{ t: 'absent', ref: 'namespace/tmp-1', ns: '' }, { t: 'absent', ref: 'namespace/tmp-2', ns: '' }, { t: 'absent', ref: 'namespace/tmp-3', ns: '' }]),
        T('prod and its Deployment still intact', ['Only env=temp was selected.', '`kubectl get deploy -n prod`', 'Never use `--all` on namespaces.'], [{ t: 'podsReady', ns: 'prod', sel: 'app=core', min: 1 }])],
      solution: ['kubectl get ns -l env=temp', 'kubectl delete ns -l env=temp', 'kubectl get deploy -n prod'] })
  ]);
})(typeof window !== 'undefined' ? window : globalThis);
