/* Interactive labs S21–S28 (advanced / CKS / incident). */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {}, Labs = KL.Labs || require('../labs-engine.js'), Yh = Labs.y;
  function H(a, b, c) { return [a, b, c]; }
  Labs.register([
    { id: 's21-psa-restricted', num: 'S21', title: 'Pod Security Admission: restricted namespace', diff: 'Advanced', track: ['CKS'], domain: 'Security', time: '20 min', ns: 'secure',
      story: 'Namespace `secure` enforces the `restricted` Pod Security Standard. Deployment `app` (plain nginx, root) cannot create pods. Make it compliant — do not weaken the namespace label.',
      setup: ['apiVersion: v1\nkind: Namespace\nmetadata:\n  name: secure\n  labels:\n    pod-security.kubernetes.io/enforce: restricted\n', Yh.dep('app', 'secure', 'nginx:1.25', 2)],
      tasks: [
        { id: '1', title: 'Read the admission error', desc: '`kubectl describe rs -n secure` / `kubectl get events`', hints: H('`kubectl get events -n secure`', 'The message lists every violated control: allowPrivilegeEscalation, capabilities, runAsNonRoot, seccompProfile.', 'Fix all of them in the container/pod securityContext.'), assert: [{ t: 'jp', ref: 'namespace/secure', ns: '', path: '.metadata.labels.pod-security\\.kubernetes\\.io/enforce', eq: 'restricted' }] },
        { id: '2', title: 'Make the Deployment compliant: 2 Ready pods', desc: 'Use an unprivileged image (nginxinc/nginx-unprivileged:1.25).', hints: H('Rewrite the manifest with a heredoc.', 'securityContext: runAsNonRoot: true, seccompProfile.type: RuntimeDefault (pod level); allowPrivilegeEscalation: false, capabilities.drop: [ALL] (container level).', 'nginx as root fails runAsNonRoot — switch to the unprivileged image.'), assert: [{ t: 'podsReady', ns: 'secure', sel: 'app=app', min: 2 }, { t: 'jp', ref: 'deploy/app', ns: 'secure', path: '.spec.template.spec.containers[0].securityContext.allowPrivilegeEscalation', eq: 'false' }] }
      ],
      solution: ['kubectl apply -f - <<EOF\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: app\n  namespace: secure\nspec:\n  replicas: 2\n  selector:\n    matchLabels:\n      app: app\n  template:\n    metadata:\n      labels:\n        app: app\n    spec:\n      securityContext:\n        runAsNonRoot: true\n        seccompProfile:\n          type: RuntimeDefault\n      containers:\n      - name: app\n        image: nginxinc/nginx-unprivileged:1.25\n        securityContext:\n          allowPrivilegeEscalation: false\n          capabilities:\n            drop: ["ALL"]\nEOF', 'kubectl rollout status deployment/app -n secure'] },

    { id: 's22-sa-token', num: 'S22', title: 'Harden ServiceAccount token mounting', diff: 'Advanced', track: ['CKS'], domain: 'Security', time: '15 min', ns: 'hardening',
      story: 'Deployment `web` runs as the `default` ServiceAccount with an auto-mounted API token — it never talks to the API. Create ServiceAccount `web-sa` with token automount disabled and run the Deployment as it, also disabling automount on the pod spec.',
      setup: [Yh.dep('web', 'hardening', 'nginx:1.25', 2)],
      tasks: [
        { id: '1', title: 'ServiceAccount `web-sa` with automountServiceAccountToken: false', desc: '', hints: H('`kubectl create serviceaccount web-sa`', 'Then `kubectl patch sa web-sa -p \'{"automountServiceAccountToken":false}\'`', 'Or apply a manifest.'), assert: [{ t: 'jp', ref: 'sa/web-sa', ns: 'hardening', path: '.automountServiceAccountToken', eq: 'false' }] },
        { id: '2', title: 'Deployment uses web-sa and automount false', desc: '', hints: H('Patch spec.template.spec.', 'Fields: `serviceAccountName: web-sa`, `automountServiceAccountToken: false`.', '`kubectl patch deployment web -p ...`'), assert: [{ t: 'jp', ref: 'deploy/web', ns: 'hardening', path: '.spec.template.spec.serviceAccountName', eq: 'web-sa' }, { t: 'jp', ref: 'deploy/web', ns: 'hardening', path: '.spec.template.spec.automountServiceAccountToken', eq: 'false' }] },
        { id: '3', title: 'Pods Ready after the change', desc: '', hints: H('`kubectl rollout status deployment/web`', '`kubectl get pods`', 'Old pods are replaced.'), assert: [{ t: 'podsReady', ns: 'hardening', sel: 'app=web', min: 2 }] }
      ],
      solution: ['kubectl create serviceaccount web-sa', 'kubectl patch sa web-sa -p \'{"automountServiceAccountToken":false}\'', 'kubectl patch deployment web -p \'{"spec":{"template":{"spec":{"serviceAccountName":"web-sa","automountServiceAccountToken":false}}}}\'', 'kubectl rollout status deployment/web'] },

    { id: 's23-gateway-api', num: 'S23', title: 'Gateway API: Gateway + HTTPRoute', diff: 'Advanced', track: ['CKA'], domain: 'Networking', time: '15 min', ns: 'gw',
      story: 'The successor to Ingress. Expose Service `web` through a Gateway `public` (class `nginx`, HTTP listener on 80) and an HTTPRoute `web-route` for host `app.local`.',
      setup: [Yh.dep('web', 'gw', 'nginx:1.25', 2), Yh.svc('web', 'gw', 'web', 80)],
      tasks: [
        { id: '1', title: 'Create Gateway `public`', desc: 'gatewayClassName nginx, listener `http` port 80 protocol HTTP.', hints: H('`kubectl get gatewayclass`', 'apiVersion gateway.networking.k8s.io/v1, kind Gateway.', 'spec.listeners: [{name: http, port: 80, protocol: HTTP}]'), assert: [{ t: 'jp', ref: 'gateway/public', ns: 'gw', path: '.spec.gatewayClassName', eq: 'nginx' }] },
        { id: '2', title: 'Create HTTPRoute `web-route`', desc: 'parentRef public, hostname app.local, backend web:80.', hints: H('kind HTTPRoute, same apiVersion.', 'spec.parentRefs: [{name: public}]; spec.hostnames: [app.local]', 'spec.rules[0].backendRefs: [{name: web, port: 80}]'), assert: [{ t: 'jp', ref: 'httproute/web-route', ns: 'gw', path: '.spec.parentRefs[0].name', eq: 'public' }, { t: 'jp', ref: 'httproute/web-route', ns: 'gw', path: '.spec.rules[0].backendRefs[0].name', eq: 'web' }] }
      ],
      solution: ['kubectl apply -f - <<EOF\napiVersion: gateway.networking.k8s.io/v1\nkind: Gateway\nmetadata:\n  name: public\n  namespace: gw\nspec:\n  gatewayClassName: nginx\n  listeners:\n  - name: http\n    port: 80\n    protocol: HTTP\n---\napiVersion: gateway.networking.k8s.io/v1\nkind: HTTPRoute\nmetadata:\n  name: web-route\n  namespace: gw\nspec:\n  parentRefs:\n  - name: public\n  hostnames: ["app.local"]\n  rules:\n  - backendRefs:\n    - name: web\n      port: 80\nEOF', 'kubectl get gateway,httproute -n gw'] },

    { id: 's24-crd', num: 'S24', title: 'Extend Kubernetes: CRD + custom resource', diff: 'Advanced', track: ['CKA', 'CKAD'], domain: 'Extensibility', time: '15 min', ns: 'ops',
      story: 'Define a new API type `Backup` (group `stable.example.com`, namespaced, plural `backups`) with a `schedule` string field, then create a Backup named `nightly` in namespace `ops`.',
      setup: [],
      tasks: [
        { id: '1', title: 'Create CRD `backups.stable.example.com`', desc: '', hints: H('apiVersion apiextensions.k8s.io/v1, kind CustomResourceDefinition.', 'name must be `<plural>.<group>`; scope Namespaced; names.kind Backup, plural backups.', 'versions: [{name: v1, served: true, storage: true, schema.openAPIV3Schema ...}]'), assert: [{ t: 'exists', ref: 'crd/backups.stable.example.com', ns: '' }] },
        { id: '2', title: 'Create Backup `nightly`', desc: 'spec.schedule: "0 2 * * *"', hints: H('apiVersion stable.example.com/v1, kind Backup.', '`kubectl get backups -n ops` after creating.', 'Created CRs are validated by the CRD schema.'), assert: [{ t: 'jp', ref: 'backup/nightly', ns: 'ops', path: '.spec.schedule', eq: '0 2 * * *' }] }
      ],
      solution: ['kubectl apply -f - <<EOF\napiVersion: apiextensions.k8s.io/v1\nkind: CustomResourceDefinition\nmetadata:\n  name: backups.stable.example.com\nspec:\n  group: stable.example.com\n  scope: Namespaced\n  names:\n    kind: Backup\n    plural: backups\n    singular: backup\n  versions:\n  - name: v1\n    served: true\n    storage: true\n    schema:\n      openAPIV3Schema:\n        type: object\n        properties:\n          spec:\n            type: object\n            properties:\n              schedule:\n                type: string\nEOF', 'kubectl apply -f - <<EOF\napiVersion: stable.example.com/v1\nkind: Backup\nmetadata:\n  name: nightly\n  namespace: ops\nspec:\n  schedule: "0 2 * * *"\nEOF', 'kubectl get backups -n ops'] },

    { id: 's25-kustomize', num: 'S25', title: 'Kustomize: base + prod overlay', diff: 'Advanced', track: ['CKAD'], domain: 'Configuration', time: '15 min', ns: 'shop',
      story: 'A `base/` with a Deployment `web` exists in your working directory. Create `overlays/prod/` that reuses the base, prefixes names with `prod-`, runs 3 replicas, and deploy it with `kubectl apply -k`.',
      setup: [],
      setupCmds: ['mkdir -p base', 'cat > base/deployment.yaml <<EOF\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: web\nspec:\n  replicas: 1\n  selector:\n    matchLabels:\n      app: web\n  template:\n    metadata:\n      labels:\n        app: web\n    spec:\n      containers:\n      - name: web\n        image: nginx:1.25\nEOF', 'cat > base/kustomization.yaml <<EOF\nresources:\n- deployment.yaml\nEOF'],
      tasks: [
        { id: '1', title: 'Create overlays/prod/kustomization.yaml', desc: '', hints: H('`mkdir -p overlays/prod`', 'resources: [../../base]', 'namePrefix: prod-, namespace: shop, replicas: [{name: web, count: 3}]'), assert: [{ t: 'file', path: '/home/student/overlays/prod/kustomization.yaml', has: 'namePrefix' }] },
        { id: '2', title: 'Apply the overlay: prod-web with 3 Ready replicas', desc: '`kubectl apply -k overlays/prod`', hints: H('`kubectl kustomize overlays/prod` previews the output.', '`kubectl apply -k overlays/prod`', '`kubectl get deploy -n shop`'), assert: [{ t: 'jp', ref: 'deploy/prod-web', ns: 'shop', path: '.spec.replicas', eq: '3' }, { t: 'podsReady', ns: 'shop', sel: 'app=web', min: 3 }] }
      ],
      solution: ['mkdir -p overlays/prod', 'cat > overlays/prod/kustomization.yaml <<EOF\nresources:\n- ../../base\nnamePrefix: prod-\nnamespace: shop\nreplicas:\n- name: web\n  count: 3\nEOF', 'kubectl kustomize overlays/prod', 'kubectl apply -k overlays/prod'] },

    { id: 's26-multitenant', num: 'S26', title: 'Onboard a tenant namespace', diff: 'Advanced', track: ['CKA', 'CKS'], domain: 'Cluster', time: '20 min', ns: 'team-b',
      story: 'Create a safe namespace `team-b`: ResourceQuota (max 5 pods), a LimitRange giving default CPU limit 200m, and a default-deny ingress NetworkPolicy. Prove it by running a pod that automatically receives the default limit.',
      setup: [],
      setupNs: ['default'],
      tasks: [
        { id: '1', title: 'Namespace `team-b` with ResourceQuota `team-quota` (pods: 5)', desc: '', hints: H('`kubectl create namespace team-b`', '`kubectl create quota team-quota --hard=pods=5 -n team-b`', ''), assert: [{ t: 'jp', ref: 'resourcequota/team-quota', ns: 'team-b', path: '.spec.hard.pods', eq: '5' }] },
        { id: '2', title: 'LimitRange `defaults` with default cpu limit 200m', desc: '', hints: H('kind LimitRange, spec.limits[0].type: Container', 'spec.limits[0].default.cpu: 200m', 'Apply with a heredoc in -n team-b.'), assert: [{ t: 'jp', ref: 'limitrange/defaults', ns: 'team-b', path: '.spec.limits[0].default.cpu', eq: '200m' }] },
        { id: '3', title: 'NetworkPolicy `default-deny` (ingress) selecting all pods', desc: '', hints: H('podSelector: {} selects every pod.', 'policyTypes: [Ingress] with no ingress rules = deny all.', 'Name it default-deny.'), assert: [{ t: 'exists', ref: 'networkpolicy/default-deny', ns: 'team-b' }] },
        { id: '4', title: 'Run pod `probe` and see the default limit applied', desc: '', hints: H('`kubectl run probe --image=nginx:1.25 -n team-b`', '`kubectl get pod probe -n team-b -o jsonpath=\'{.spec.containers[0].resources.limits.cpu}\'`', 'The LimitRange must exist before the pod is created.'), assert: [{ t: 'jp', ref: 'pod/probe', ns: 'team-b', path: '.spec.containers[0].resources.limits.cpu', eq: '200m' }] }
      ],
      solution: ['kubectl create namespace team-b', 'kubectl create quota team-quota --hard=pods=5 -n team-b', 'kubectl apply -f - <<EOF\napiVersion: v1\nkind: LimitRange\nmetadata:\n  name: defaults\n  namespace: team-b\nspec:\n  limits:\n  - type: Container\n    default:\n      cpu: 200m\n    defaultRequest:\n      cpu: 100m\nEOF', 'kubectl apply -f - <<EOF\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: default-deny\n  namespace: team-b\nspec:\n  podSelector: {}\n  policyTypes: [Ingress]\nEOF', 'kubectl run probe --image=nginx:1.25 -n team-b'] },

    { id: 's27-image-scan', num: 'S27', title: 'Scan images and replace the vulnerable ones', diff: 'Advanced', track: ['CKS'], domain: 'Supply chain', time: '15 min', ns: 'scan',
      story: 'Deployments `web` (nginx:1.19) and `cache` (redis:6.0) run old images with CRITICAL CVEs. Scan them with `trivy image`, then switch both to the slim alpine variants (nginx:1.27-alpine, redis:7-alpine).',
      setup: [Yh.dep('web', 'scan', 'nginx:1.19', 1), Yh.dep('cache', 'scan', 'redis:6.0', 1)],
      tasks: [
        { id: '1', title: 'Scan the images', desc: '`trivy image nginx:1.19`', hints: H('`trivy image nginx:1.19`', 'Note the CRITICAL count.', 'Compare with `trivy image nginx:1.27-alpine`.'), assert: [{ t: 'jp', ref: 'deploy/web', ns: 'scan', path: '.spec.template.spec.containers[0].image', ne: 'nginx:1.19' }] },
        { id: '2', title: 'Both Deployments on the alpine images, Ready', desc: '', hints: H('`kubectl set image deployment/web web=nginx:1.27-alpine`', '`kubectl set image deployment/cache cache=redis:7-alpine`', '`kubectl get pods -n scan`'), assert: [{ t: 'jp', ref: 'deploy/cache', ns: 'scan', path: '.spec.template.spec.containers[0].image', has: 'alpine' }, { t: 'podsReady', ns: 'scan', min: 2 }] }
      ],
      solution: ['trivy image nginx:1.19', 'trivy image nginx:1.27-alpine', 'kubectl set image deployment/web web=nginx:1.27-alpine', 'kubectl set image deployment/cache cache=redis:7-alpine', 'kubectl get pods'] },

    { id: 's28-incident', num: 'S28', title: 'Incident: three faults, one outage', diff: 'Expert', track: ['CKA', 'CKAD'], domain: 'Troubleshooting', time: '30 min', ns: 'prod',
      story: 'The storefront is down. Namespace `prod` has three independent problems: `frontend` pods will not start, Service `frontend` routes to nothing, and `api` pods never get scheduled. Find and fix all three.',
      setup: [Yh.dep('frontend', 'prod', 'nginx:1.255', 2), Yh.svc('frontend', 'prod', 'front', 80), Yh.dep('api', 'prod', 'nginx:1.25', 2, '', '      nodeSelector:\n        disk: ssd\n')],
      tasks: [
        { id: '1', title: 'frontend pods Ready', desc: '', hints: H('ImagePullBackOff? Check the tag.', '`kubectl describe pod -l app=frontend`', '`kubectl set image deployment/frontend frontend=nginx:1.25`'), assert: [{ t: 'podsReady', ns: 'prod', sel: 'app=frontend', min: 2 }] },
        { id: '2', title: 'Service `frontend` has endpoints', desc: '', hints: H('`kubectl get endpoints frontend`', 'Compare `kubectl get svc frontend -o wide` selector with the pod labels.', 'Patch the selector to app=frontend.'), assert: [{ t: 'endpoints', ns: 'prod', svc: 'frontend', min: 2 }] },
        { id: '3', title: 'api pods Ready', desc: '', hints: H('Pending with "didn\'t match Pod\'s node affinity/selector".', '`kubectl get nodes --show-labels` — no node has disk=ssd.', 'Either label a node (`kubectl label node worker1 disk=ssd`) or remove the nodeSelector.'), assert: [{ t: 'podsReady', ns: 'prod', sel: 'app=api', min: 2 }] }
      ],
      solution: ['kubectl set image deployment/frontend frontend=nginx:1.25', 'kubectl patch svc frontend -p \'{"spec":{"selector":{"app":"frontend"}}}\'', 'kubectl label node worker1 disk=ssd', 'kubectl rollout status deployment/frontend'] }
  ]);
})(typeof window !== 'undefined' ? window : globalThis);
