/* Interactive labs S11–S20 (intermediate). */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {}, Labs = KL.Labs || require('../labs-engine.js'), Yh = Labs.y;
  var SLEEP = '    command: ["sleep", "3600"]\n';
  function H(a, b, c) { return [a, b, c]; }
  Labs.register([
    { id: 's11-rbac-sa', num: 'S11', title: 'RBAC: least-privilege deployer', diff: 'Intermediate', track: ['CKA', 'CKS'], domain: 'Security', time: '15 min', ns: 'ci',
      story: 'The CI system uses ServiceAccount `deployer` in namespace `ci`. It currently can do nothing. Give it exactly what it needs: get/list/create/update Deployments in `ci` — and nothing else (no deletes, no Secrets, no other namespaces).',
      setup: ['apiVersion: v1\nkind: ServiceAccount\nmetadata:\n  name: deployer\n  namespace: ci\n'],
      tasks: [
        { id: '1', title: 'Create Role `deploy-manager` with get,list,create,update on deployments', desc: '', hints: H('`kubectl create role --help`', '`kubectl create role deploy-manager --verb=get,list,create,update --resource=deployments -n ci`', 'Deployments are in API group `apps`; the command infers it.'), assert: [{ t: 'exists', ref: 'role/deploy-manager', ns: 'ci' }] },
        { id: '2', title: 'Bind it to the ServiceAccount', desc: '', hints: H('A RoleBinding links a Role to a subject.', '`kubectl create rolebinding deployer-binding --role=deploy-manager --serviceaccount=ci:deployer -n ci`', 'Format is `<namespace>:<name>`.'), assert: [{ t: 'canI', as: 'system:serviceaccount:ci:deployer', verb: 'create', res: 'deployments', ns: 'ci' }] },
        { id: '3', title: 'Prove it is least-privilege', desc: 'deployer must NOT delete deployments or read secrets.', hints: H('`kubectl auth can-i delete deployments --as=system:serviceaccount:ci:deployer -n ci`', 'Do not use `*` verbs or resources.', 'If a check says yes unexpectedly, review the Role rules.'), assert: [{ t: 'canI', as: 'system:serviceaccount:ci:deployer', verb: 'delete', res: 'deployments', ns: 'ci', expect: false }, { t: 'canI', as: 'system:serviceaccount:ci:deployer', verb: 'get', res: 'secrets', ns: 'ci', expect: false }] }
      ],
      solution: ['kubectl create role deploy-manager --verb=get,list,create,update --resource=deployments -n ci', 'kubectl create rolebinding deployer-binding --role=deploy-manager --serviceaccount=ci:deployer -n ci', 'kubectl auth can-i delete deployments --as=system:serviceaccount:ci:deployer -n ci'] },

    { id: 's12-netpol-isolate', num: 'S12', title: 'NetworkPolicy: lock down the database', diff: 'Intermediate', track: ['CKA', 'CKS'], domain: 'Networking', time: '15 min', ns: 'app',
      story: 'Everything in namespace `app` can reach the `db` Service. Only pods labelled `role=frontend` should. The `frontend` pod must keep working; the `intruder` pod must be blocked.',
      setup: [Yh.dep('db', 'app', 'nginx:1.25', 1), Yh.svc('db', 'app', 'db', 80), Yh.pod('frontend', 'app', 'busybox:1.36', { role: 'frontend' }, SLEEP), Yh.pod('intruder', 'app', 'busybox:1.36', { role: 'intruder' }, SLEEP)],
      tasks: [
        { id: '1', title: 'Verify the problem: intruder can reach db', desc: '`kubectl exec intruder -- wget -qO- -T 2 db`', hints: H('Without any NetworkPolicy, everything is allowed.', 'Policies select pods with `podSelector` and are additive allow-lists.', 'Once a pod is selected by an ingress policy, only listed sources are allowed.'), assert: [{ t: 'exists', ref: 'networkpolicy/db-allow-frontend', ns: 'app' }] },
        { id: '2', title: 'Create NetworkPolicy `db-allow-frontend`', desc: 'Select app=db, allow ingress only from role=frontend on TCP 80.', hints: H('Use a heredoc with `kubectl apply -f - <<EOF`.', 'spec.podSelector.matchLabels: app: db; policyTypes: [Ingress]; ingress[0].from[0].podSelector.matchLabels: role: frontend', 'Do not forget `policyTypes: [Ingress]`.'), assert: [{ t: 'curl', ns: 'app', from: 'frontend', to: 'db:80' }] },
        { id: '3', title: 'Intruder is blocked', desc: '', hints: H('`kubectl exec intruder -- wget -qO- -T 2 db` should time out.', 'Check labels with `kubectl get pods --show-labels`.', 'The policy must not match role=intruder.'), assert: [{ t: 'curl', ns: 'app', from: 'intruder', to: 'db:80', ok: false }] }
      ],
      solution: ['kubectl apply -f - <<EOF\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: db-allow-frontend\n  namespace: app\nspec:\n  podSelector:\n    matchLabels:\n      app: db\n  policyTypes: [Ingress]\n  ingress:\n  - from:\n    - podSelector:\n        matchLabels:\n          role: frontend\n    ports:\n    - protocol: TCP\n      port: 80\nEOF', 'kubectl exec -n app intruder -- wget -qO- -T 2 db'] },

    { id: 's13-pvc-pending', num: 'S13', title: 'PVC stuck Pending', diff: 'Intermediate', track: ['CKA'], domain: 'Storage', time: '12 min', ns: 'data',
      story: 'Pod `store` mounts PVC `store-data`, which asks for StorageClass `fast` — it does not exist in this cluster. Fix the storage so the pod runs.',
      setup: ['apiVersion: v1\nkind: PersistentVolumeClaim\nmetadata:\n  name: store-data\n  namespace: data\nspec:\n  storageClassName: fast\n  accessModes: [ReadWriteOnce]\n  resources:\n    requests:\n      storage: 1Gi\n', Yh.pod('store', 'data', 'nginx:1.25', { app: 'store' }, '    volumeMounts:\n    - {name: d, mountPath: /data}\n  volumes:\n  - name: d\n    persistentVolumeClaim:\n      claimName: store-data\n')],
      tasks: [
        { id: '1', title: 'Find the cause', desc: '`kubectl describe pvc store-data`', hints: H('`kubectl get pvc,sc`', 'Events say the StorageClass "fast" was not found.', 'List classes: `kubectl get storageclass` — only `standard` exists.'), assert: [{ t: 'jp', ref: 'pvc/store-data', ns: 'data', path: '.spec.storageClassName', ne: 'fast' }] },
        { id: '2', title: 'PVC Bound and pod Running', desc: 'PVC spec is immutable — delete and recreate it with `standard`.', hints: H('`kubectl delete pvc store-data` then apply a new one.', 'The pod stays Pending and will pick the new PVC up.', '`kubectl get pvc,pod`'), assert: [{ t: 'jp', ref: 'pvc/store-data', ns: 'data', path: '.status.phase', eq: 'Bound' }, { t: 'podsReady', ns: 'data', sel: 'app=store', min: 1 }] }
      ],
      solution: ['kubectl delete pvc store-data --wait=false', 'kubectl apply -f - <<EOF\napiVersion: v1\nkind: PersistentVolumeClaim\nmetadata:\n  name: store-data\n  namespace: data\nspec:\n  storageClassName: standard\n  accessModes: [ReadWriteOnce]\n  resources:\n    requests:\n      storage: 1Gi\nEOF'] },

    { id: 's14-statefulset-pvc', num: 'S14', title: 'StatefulSet: scale with stable storage', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Storage', time: '12 min', ns: 'db',
      story: 'StatefulSet `kv` runs 1 replica with a volumeClaimTemplate. Scale to 3 and confirm each pod gets its own PVC and a stable name.',
      setup: ['apiVersion: v1\nkind: Service\nmetadata:\n  name: kv\n  namespace: db\nspec:\n  clusterIP: None\n  selector:\n    app: kv\n  ports:\n  - port: 80\n', 'apiVersion: apps/v1\nkind: StatefulSet\nmetadata:\n  name: kv\n  namespace: db\nspec:\n  serviceName: kv\n  replicas: 1\n  selector:\n    matchLabels:\n      app: kv\n  template:\n    metadata:\n      labels:\n        app: kv\n    spec:\n      containers:\n      - name: kv\n        image: nginx:1.25\n        volumeMounts:\n        - {name: data, mountPath: /data}\n  volumeClaimTemplates:\n  - metadata:\n      name: data\n    spec:\n      accessModes: [ReadWriteOnce]\n      resources:\n        requests:\n          storage: 1Gi\n'],
      tasks: [
        { id: '1', title: 'Scale `kv` to 3 replicas', desc: '', hints: H('`kubectl scale statefulset kv --replicas=3`', 'Pods are created in order: kv-0, kv-1, kv-2.', '`kubectl get pods -w`'), assert: [{ t: 'podsReady', ns: 'db', sel: 'app=kv', min: 3 }] },
        { id: '2', title: 'Three PVCs exist (data-kv-0..2)', desc: '', hints: H('`kubectl get pvc`', 'Each replica gets `<template>-<sts>-<ordinal>`.', 'PVCs outlive the pods when scaling down.'), assert: [{ t: 'exists', ref: 'pvc/data-kv-2', ns: 'db' }, { t: 'count', kind: 'PersistentVolumeClaim', ns: 'db', min: 3 }] }
      ],
      solution: ['kubectl scale statefulset kv --replicas=3', 'kubectl get pvc'] },

    { id: 's15-quota-limits', num: 'S15', title: 'ResourceQuota blocks the rollout', diff: 'Intermediate', track: ['CKA'], domain: 'Cluster', time: '12 min', ns: 'team-a',
      story: 'Namespace `team-a` has a ResourceQuota of 1 CPU in requests. Deployment `crunch` wants 4 replicas × 500m, so only 2 pods start. Fit all 4 replicas inside the quota without raising it.',
      setup: ['apiVersion: v1\nkind: ResourceQuota\nmetadata:\n  name: cpu-cap\n  namespace: team-a\nspec:\n  hard:\n    requests.cpu: "1"\n    requests.memory: 2Gi\n    pods: "10"\n', Yh.dep('crunch', 'team-a', 'nginx:1.25', 4, '        resources:\n          requests:\n            cpu: 500m\n            memory: 64Mi\n')],
      tasks: [
        { id: '1', title: 'Find the quota error', desc: '`kubectl describe rs` or `kubectl get events`', hints: H('`kubectl get events -n team-a`', 'Look for "exceeded quota: cpu-cap".', '`kubectl describe quota cpu-cap` shows Used vs Hard.'), assert: [{ t: 'jp', ref: 'resourcequota/cpu-cap', ns: 'team-a', path: '.spec.hard.requests\\.cpu', eq: '1' }] },
        { id: '2', title: 'Run 4 Ready replicas within the quota', desc: '4 × request must be ≤ 1 CPU.', hints: H('Lower the per-pod request: 4 × 200m = 800m. Do not edit the quota.', 'Trap: the 2 running pods already fill the quota, so a rolling update cannot create new pods. Scale to 0 first.', '`kubectl scale deploy crunch --replicas=0`, then `kubectl set resources deployment/crunch --requests=cpu=200m`, then scale back to 4.'), assert: [{ t: 'podsReady', ns: 'team-a', sel: 'app=crunch', min: 4 }, { t: 'noQuotaErr', ns: 'team-a' }] }
      ],
      solution: ['kubectl describe quota cpu-cap', 'kubectl scale deployment crunch --replicas=0', 'kubectl set resources deployment/crunch --requests=cpu=200m', 'kubectl scale deployment crunch --replicas=4', 'kubectl rollout status deployment/crunch'] },

    { id: 's16-hpa', num: 'S16', title: 'Autoscale a Deployment with HPA', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Workloads', time: '10 min', ns: 'web',
      story: 'Deployment `shop` has CPU requests set. Create a HorizontalPodAutoscaler named `shop` that keeps 2–6 replicas at 50% average CPU.',
      setup: [Yh.dep('shop', 'web', 'nginx:1.25', 1, '        resources:\n          requests:\n            cpu: 100m\n')],
      tasks: [
        { id: '1', title: 'Create the HPA', desc: '', hints: H('`kubectl autoscale --help`', '`kubectl autoscale deployment shop --min=2 --max=6 --cpu-percent=50`', 'HPA needs resource requests on the pods (already set).'), assert: [{ t: 'jp', ref: 'hpa/shop', ns: 'web', path: '.spec.maxReplicas', eq: '6' }, { t: 'jp', ref: 'hpa/shop', ns: 'web', path: '.spec.minReplicas', eq: '2' }] },
        { id: '2', title: 'Deployment scaled up to the minimum', desc: '', hints: H('`kubectl get hpa`', 'HPA raises replicas to at least minReplicas.', 'Wait a few seconds then `kubectl get deploy shop`.'), assert: [{ t: 'podsReady', ns: 'web', sel: 'app=shop', min: 2 }] }
      ],
      solution: ['kubectl autoscale deployment shop --min=2 --max=6 --cpu-percent=50', 'kubectl get hpa'] },

    { id: 's17-drain-cordon', num: 'S17', title: 'Node maintenance: cordon and drain', diff: 'Intermediate', track: ['CKA'], domain: 'Cluster', time: '10 min', ns: 'app',
      story: 'worker1 needs a kernel upgrade. Move all workloads off it safely (DaemonSet pods stay), keep all 4 `svc` replicas running, and leave the node unschedulable.',
      setup: [Yh.dep('svc', 'app', 'nginx:1.25', 4)],
      tasks: [
        { id: '1', title: 'Drain worker1', desc: 'DaemonSet pods cannot be evicted — tell kubectl to ignore them.', hints: H('`kubectl drain --help`', '`kubectl drain worker1 --ignore-daemonsets --delete-emptydir-data`', 'Drain cordons the node first.'), assert: [{ t: 'nodeCordoned', node: 'worker1' }, { t: 'podsOffNode', node: 'worker1', ns: 'app' }] },
        { id: '2', title: 'All 4 replicas still Ready', desc: '', hints: H('`kubectl get pods -o wide`', 'Evicted pods are recreated on worker2.', 'worker2 has enough capacity.'), assert: [{ t: 'podsReady', ns: 'app', sel: 'app=svc', min: 4 }] }
      ],
      solution: ['kubectl drain worker1 --ignore-daemonsets --delete-emptydir-data', 'kubectl get pods -o wide'] },

    { id: 's18-secret-env', num: 'S18', title: 'CreateContainerConfigError: missing Secret', diff: 'Intermediate', track: ['CKAD'], domain: 'Configuration', time: '10 min', ns: 'vault',
      story: 'Deployment `billing` reads `DB_PASSWORD` from Secret `db-creds` (key `password`). The Secret was never created, so pods cannot start.',
      setup: [Yh.dep('billing', 'vault', 'nginx:1.25', 2, '        env:\n        - name: DB_PASSWORD\n          valueFrom:\n            secretKeyRef:\n              name: db-creds\n              key: password\n')],
      tasks: [
        { id: '1', title: 'Create Secret `db-creds` with key `password`', desc: 'Any value.', hints: H('`kubectl describe pod` shows: secret "db-creds" not found.', '`kubectl create secret generic db-creds --from-literal=password=s3cret`', 'Use `-n vault`.'), assert: [{ t: 'exists', ref: 'secret/db-creds', ns: 'vault' }] },
        { id: '2', title: 'Pods become Ready', desc: '', hints: H('The kubelet retries automatically.', '`kubectl get pods -n vault`', 'If still failing, check the key name is exactly `password`.'), assert: [{ t: 'podsReady', ns: 'vault', sel: 'app=billing', min: 2 }] }
      ],
      solution: ['kubectl create secret generic db-creds --from-literal=password=s3cret -n vault', 'kubectl get pods -n vault'] },

    { id: 's19-ingress', num: 'S19', title: 'Ingress: host + path routing', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Networking', time: '15 min', ns: 'shop',
      story: 'Services `web` and `api` exist in `shop`. Create Ingress `shop` (class `nginx`) routing host `shop.local`: `/` → web:80 and `/api` → api:80.',
      setup: [Yh.dep('web', 'shop', 'nginx:1.25', 1), Yh.svc('web', 'shop', 'web', 80), Yh.dep('api', 'shop', 'nginx:1.25', 1), Yh.svc('api', 'shop', 'api', 80)],
      tasks: [
        { id: '1', title: 'Ingress `shop` exists with host shop.local', desc: '', hints: H('`kubectl create ingress --help`', '`kubectl create ingress shop --class=nginx --rule="shop.local/=web:80" --rule="shop.local/api=api:80"`', 'Mind the quotes around --rule.'), assert: [{ t: 'jp', ref: 'ingress/shop', ns: 'shop', path: '.spec.rules[0].host', eq: 'shop.local' }] },
        { id: '2', title: 'Both backends referenced', desc: '', hints: H('`kubectl get ingress shop -o yaml`', 'Each path has backend.service.name and port.number.', 'Prefix match with pathType Prefix.'), assert: [{ t: 'jp', ref: 'ingress/shop', ns: 'shop', path: '.spec.rules[0].http.paths[*].backend.service.name', has: 'api' }, { t: 'jp', ref: 'ingress/shop', ns: 'shop', path: '.spec.rules[0].http.paths[*].backend.service.name', has: 'web' }] }
      ],
      solution: ['kubectl create ingress shop --class=nginx --rule="shop.local/=web:80" --rule="shop.local/api=api:80" -n shop', 'kubectl get ingress -n shop'] },

    { id: 's20-pdb-spread', num: 'S20', title: 'High availability: PDB + topology spread', diff: 'Intermediate', track: ['CKA'], domain: 'Workloads', time: '15 min', ns: 'ha',
      story: 'Deployment `checkout` (3 replicas) must survive node drains. Add a PodDisruptionBudget keeping ≥2 available, and a topologySpreadConstraint (maxSkew 1 across `kubernetes.io/hostname`).',
      setup: [Yh.dep('checkout', 'ha', 'nginx:1.25', 3)],
      tasks: [
        { id: '1', title: 'Create PDB `checkout-pdb` with minAvailable 2', desc: '', hints: H('`kubectl create pdb --help`', '`kubectl create pdb checkout-pdb --selector=app=checkout --min-available=2`', 'Namespace `ha`.'), assert: [{ t: 'jp', ref: 'pdb/checkout-pdb', ns: 'ha', path: '.spec.minAvailable', eq: '2' }] },
        { id: '2', title: 'Add topologySpreadConstraints (maxSkew 1)', desc: '', hints: H('`kubectl edit deployment checkout` or patch.', 'Needs topologyKey, whenUnsatisfiable: DoNotSchedule, labelSelector.', 'Use `kubectl patch` with a JSON merge patch if you prefer.'), assert: [{ t: 'jp', ref: 'deploy/checkout', ns: 'ha', path: '.spec.template.spec.topologySpreadConstraints[0].maxSkew', eq: '1' }] },
        { id: '3', title: '3 replicas Ready', desc: '', hints: H('`kubectl get pods -o wide`', 'They spread over worker1/worker2.', 'Rollout finishes automatically.'), assert: [{ t: 'podsReady', ns: 'ha', sel: 'app=checkout', min: 3 }] }
      ],
      solution: ['kubectl create pdb checkout-pdb --selector=app=checkout --min-available=2 -n ha', 'kubectl patch deployment checkout -n ha -p \'{"spec":{"template":{"spec":{"topologySpreadConstraints":[{"maxSkew":1,"topologyKey":"kubernetes.io/hostname","whenUnsatisfiable":"DoNotSchedule","labelSelector":{"matchLabels":{"app":"checkout"}}}]}}}}\'', 'kubectl rollout status deployment/checkout -n ha'] }
  ]);
})(typeof window !== 'undefined' ? window : globalThis);
