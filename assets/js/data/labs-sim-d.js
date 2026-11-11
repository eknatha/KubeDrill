/* Interactive labs S29–S48: troubleshooting, scheduling, workloads, storage, quota. */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {}, Labs = KL.Labs || require('../labs-engine.js'), Yh = Labs.y;
  var SLEEP = '    command: ["sleep", "3600"]\n';
  function T(title, hints, assert, desc) { return { id: '', title: title, desc: desc || '', hints: hints, assert: assert }; }
  function L(o) { o.tasks.forEach(function (t, i) { t.id = String(i + 1); }); return o; }
  var heredoc = function (y) { return 'kubectl apply -f - <<EOF\n' + y + 'EOF'; };
  Labs.register([
    L({ id: 's29-svc-targetport', num: 'S29', title: 'Service reachable but requests fail: wrong targetPort', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Networking', time: '12 min', ns: 'route',
      story: 'Service `api` has endpoints, yet `tester` cannot reach it on port 80. The nginx containers listen on 80 but the Service forwards to 8080.',
      setup: [Yh.dep('api', 'route', 'nginx:1.25', 2), Yh.svc('api', 'route', 'api', 80, 8080), Yh.tester('route')],
      tasks: [T('Find the wrong port', ['`kubectl get svc api -o yaml`', 'Compare `targetPort` with the containerPort/listening port (80).', 'Test: `kubectl exec tester -- wget -qO- -T 2 api`'], [{ t: 'jp', ref: 'svc/api', ns: 'route', path: '.spec.ports[0].targetPort', ne: '8080' }]),
        T('tester → api:80 works', ['Fix targetPort to 80.', '`kubectl apply` a corrected Service manifest.', 'Endpoints will show :80.'], [{ t: 'curl', ns: 'route', from: 'tester', to: 'api:80' }])],
      solution: ['kubectl get svc api -o yaml', heredoc(Yh.svc('api', 'route', 'api', 80, 80)), 'kubectl exec tester -- wget -qO- -T 2 api'] }),

    L({ id: 's30-wrong-namespace', num: 'S30', title: 'Deployed into the wrong namespace', diff: 'Beginner', track: ['CKA', 'CKAD'], domain: 'Basics', time: '8 min', ns: 'staging',
      story: 'The team lead asked for Deployment `portal` in namespace `staging`, but it was created in `default`. Move it: it must exist in `staging` (3 replicas, nginx:1.25) and be gone from `default`.',
      setupNs: ['staging', 'default'], setup: [Yh.dep('portal', 'default', 'nginx:1.25', 3)],
      tasks: [T('portal runs in staging with 3 ready pods', ['`kubectl get deploy -A | grep portal`', 'Create it again with `-n staging`.', '`kubectl create deployment portal --image=nginx:1.25 --replicas=3 -n staging`'], [{ t: 'podsReady', ns: 'staging', sel: 'app=portal', min: 3 }]),
        T('portal removed from default', ['`kubectl delete deployment portal -n default`', 'Check `kubectl get deploy -n default`.', 'Namespaces isolate names: both could exist, but only one is wanted.'], [{ t: 'absent', ref: 'deploy/portal', ns: 'default' }])],
      solution: ['kubectl create deployment portal --image=nginx:1.25 --replicas=3 -n staging', 'kubectl delete deployment portal -n default'] }),

    L({ id: 's31-init-container', num: 'S31', title: 'Init:CrashLoopBackOff — failing init container', diff: 'Intermediate', track: ['CKAD'], domain: 'Pod design', time: '12 min', ns: 'boot',
      story: 'Deployment `app` has an init container `prep` whose command exits 1, so the main container never starts. Fix the init container so the pod becomes Ready.',
      setup: [Yh.dep('app', 'boot', 'nginx:1.25', 1, '', '      initContainers:\n      - name: prep\n        image: busybox:1.36\n        command: ["sh", "-c", "echo preparing; exit 1"]\n')],
      tasks: [T('Identify the failing init container', ['`kubectl get pods` → Init:CrashLoopBackOff', '`kubectl logs <pod> -c prep`', '`kubectl describe pod` shows Init Containers: prep'], [{ t: 'jp', ref: 'deploy/app', ns: 'boot', path: '.spec.template.spec.initContainers[0].command[2]', ne: 'echo preparing; exit 1' }]),
        T('Pod Ready', ['Change the command to `echo preparing; exit 0` (or just `true`).', '`kubectl patch` or re-apply the Deployment.', 'Init containers must finish with exit 0.'], [{ t: 'podsReady', ns: 'boot', sel: 'app=app', min: 1 }])],
      solution: ['kubectl logs deploy/app -c prep', 'kubectl patch deployment app -p \'{"spec":{"template":{"spec":{"initContainers":[{"name":"prep","command":["sh","-c","echo preparing; exit 0"]}]}}}}\'', 'kubectl rollout status deployment/app'] }),

    L({ id: 's32-cm-env-missing', num: 'S32', title: 'Missing ConfigMap key breaks the pod', diff: 'Beginner', track: ['CKAD'], domain: 'Configuration', time: '10 min', ns: 'cfg',
      story: 'Deployment `site` reads env `THEME` from ConfigMap `site-config` key `theme`. The ConfigMap does not exist, so the pods fail with CreateContainerConfigError.',
      setup: [Yh.dep('site', 'cfg', 'nginx:1.25', 2, '        env:\n        - name: THEME\n          valueFrom:\n            configMapKeyRef:\n              name: site-config\n              key: theme\n')],
      tasks: [T('Create ConfigMap `site-config` with theme=dark', ['`kubectl describe pod` → configmap "site-config" not found', '`kubectl create configmap site-config --from-literal=theme=dark`', 'Namespace `cfg`.'], [{ t: 'jp', ref: 'cm/site-config', ns: 'cfg', path: '.data.theme', eq: 'dark' }]),
        T('Pods Ready', ['Wait for the kubelet to retry.', '`kubectl get pods -n cfg`', 'Fix the key name if it is wrong.'], [{ t: 'podsReady', ns: 'cfg', sel: 'app=site', min: 2 }])],
      solution: ['kubectl create configmap site-config --from-literal=theme=dark -n cfg', 'kubectl get pods -n cfg'] }),

    L({ id: 's33-cm-volume', num: 'S33', title: 'Mount a ConfigMap as a file', diff: 'Intermediate', track: ['CKAD'], domain: 'Configuration', time: '12 min', ns: 'files',
      story: 'Pod `web` must see `/etc/app/app.properties` from ConfigMap `app-props` (key `app.properties`, content `mode=prod`). Create the ConfigMap, then recreate the pod with the volume mount.',
      setup: [Yh.pod('web', 'files', 'nginx:1.25', { app: 'web' })],
      tasks: [T('ConfigMap `app-props` with key app.properties', ['`kubectl create configmap app-props --from-literal=app.properties=mode=prod`', 'Use `--from-file` for real files.', '`kubectl get cm app-props -o yaml`'], [{ t: 'exists', ref: 'cm/app-props', ns: 'files' }]),
        T('Pod `web` mounts it at /etc/app', ['Pods are immutable — delete and recreate.', 'volumes: [{name: cfg, configMap: {name: app-props}}]; volumeMounts: [{name: cfg, mountPath: /etc/app}]', '`kubectl delete pod web --force` first.'], [{ t: 'jp', ref: 'pod/web', ns: 'files', path: '.spec.containers[0].volumeMounts[0].mountPath', eq: '/etc/app' }, { t: 'podsReady', ns: 'files', sel: 'app=web', min: 1 }])],
      solution: ['kubectl create configmap app-props --from-literal=app.properties=mode=prod -n files', 'kubectl delete pod web --force', heredoc('apiVersion: v1\nkind: Pod\nmetadata:\n  name: web\n  namespace: files\n  labels:\n    app: web\nspec:\n  containers:\n  - name: web\n    image: nginx:1.25\n    volumeMounts:\n    - {name: cfg, mountPath: /etc/app}\n  volumes:\n  - name: cfg\n    configMap:\n      name: app-props\n')] }),

    L({ id: 's34-nodeselector', num: 'S34', title: 'Pending: nodeSelector matches no node', diff: 'Beginner', track: ['CKA', 'CKAD'], domain: 'Scheduling', time: '8 min', ns: 'sched',
      story: 'Deployment `ml` requires `nodeSelector: gpu=true`, but no node carries that label. Make the pods schedule by labelling worker2 (do not remove the selector).',
      setup: [Yh.dep('ml', 'sched', 'nginx:1.25', 2, '', '      nodeSelector:\n        gpu: "true"\n')],
      tasks: [T('Label worker2 with gpu=true', ['`kubectl describe pod` → didn\'t match Pod\'s node affinity/selector', '`kubectl get nodes --show-labels`', '`kubectl label node worker2 gpu=true`'], [{ t: 'jp', ref: 'node/worker2', ns: '', path: '.metadata.labels.gpu', eq: 'true' }]),
        T('Both pods Ready', ['Pending pods are rescheduled automatically.', '`kubectl get pods -o wide` → all on worker2', 'Leave the nodeSelector as is.'], [{ t: 'podsReady', ns: 'sched', sel: 'app=ml', min: 2 }])],
      solution: ['kubectl label node worker2 gpu=true', 'kubectl get pods -n sched -o wide'] }),

    L({ id: 's35-taint-toleration', num: 'S35', title: 'Every node is tainted — add a toleration', diff: 'Intermediate', track: ['CKA'], domain: 'Scheduling', time: '12 min', ns: 'dedic',
      story: 'Both workers carry the taint `team=data:NoSchedule`. Deployment `etl` cannot schedule. Add a matching toleration to the Deployment (do not remove the taints).',
      setup: [Yh.dep('etl', 'dedic', 'nginx:1.25', 2)], setupCmds: ['kubectl taint nodes worker1 team=data:NoSchedule', 'kubectl taint nodes worker2 team=data:NoSchedule', 'kubectl rollout restart deployment/etl -n dedic'],
      tasks: [T('Deployment tolerates team=data:NoSchedule', ['`kubectl describe pod` → untolerated taint {team: data}', 'Toleration: key team, operator Equal, value data, effect NoSchedule.', '`kubectl patch deployment etl -p ...` under spec.template.spec.tolerations'], [{ t: 'jp', ref: 'deploy/etl', ns: 'dedic', path: '.spec.template.spec.tolerations[0].key', eq: 'team' }]),
        T('2 pods Ready; taints untouched', ['Rollout restarts pods.', '`kubectl get nodes -o jsonpath` shows taints', 'Do not run `kubectl taint ... -`.'], [{ t: 'podsReady', ns: 'dedic', sel: 'app=etl', min: 2 }, { t: 'jp', ref: 'node/worker1', ns: '', path: '.spec.taints[0].key', eq: 'team' }])],
      solution: ['kubectl patch deployment etl -n dedic -p \'{"spec":{"template":{"spec":{"tolerations":[{"key":"team","operator":"Equal","value":"data","effect":"NoSchedule"}]}}}}\'', 'kubectl rollout status deployment/etl -n dedic'] }),

    L({ id: 's36-node-affinity', num: 'S36', title: 'Required node affinity with no matching node', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Scheduling', time: '12 min', ns: 'zone',
      story: 'Deployment `cache` requires node affinity `topology.kubernetes.io/zone In [zone-a]`. No node has that label. Label worker1 with `topology.kubernetes.io/zone=zone-a`.',
      setup: [Yh.dep('cache', 'zone', 'nginx:1.25', 2, '', '      affinity:\n        nodeAffinity:\n          requiredDuringSchedulingIgnoredDuringExecution:\n            nodeSelectorTerms:\n            - matchExpressions:\n              - key: topology.kubernetes.io/zone\n                operator: In\n                values: ["zone-a"]\n')],
      tasks: [T('worker1 labelled zone-a', ['`kubectl get nodes -L topology.kubernetes.io/zone`', '`kubectl label node worker1 topology.kubernetes.io/zone=zone-a`', 'The affinity stays unchanged.'], [{ t: 'jp', ref: 'node/worker1', ns: '', path: '.metadata.labels.topology\\.kubernetes\\.io/zone', eq: 'zone-a' }]),
        T('cache pods Ready', ['They schedule once a node matches.', '`kubectl get pods -o wide`', 'All pods land on worker1.'], [{ t: 'podsReady', ns: 'zone', sel: 'app=cache', min: 2 }])],
      solution: ['kubectl label node worker1 topology.kubernetes.io/zone=zone-a', 'kubectl get pods -n zone -o wide'] }),

    L({ id: 's37-pod-antiaffinity', num: 'S37', title: 'Spread replicas with pod anti-affinity', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Scheduling', time: '15 min', ns: 'spread',
      story: 'Deployment `front` (2 replicas) may land both pods on one node. Add REQUIRED pod anti-affinity on `kubernetes.io/hostname` so replicas never share a node.',
      setup: [Yh.dep('front', 'spread', 'nginx:1.25', 2)],
      tasks: [T('Anti-affinity added', ['`kubectl explain pod.spec.affinity.podAntiAffinity`', 'requiredDuringSchedulingIgnoredDuringExecution → labelSelector app=front, topologyKey kubernetes.io/hostname', 'Apply the full Deployment with a heredoc.'], [{ t: 'jp', ref: 'deploy/front', ns: 'spread', path: '.spec.template.spec.affinity.podAntiAffinity.requiredDuringSchedulingIgnoredDuringExecution[0].topologyKey', eq: 'kubernetes.io/hostname' }]),
        T('2 Ready replicas on different nodes', ['`kubectl get pods -o wide` → different NODE values.', 'Two workers are available.', 'A third replica would stay Pending.'], [{ t: 'podsReady', ns: 'spread', sel: 'app=front', min: 2 }])],
      solution: [heredoc(Yh.dep('front', 'spread', 'nginx:1.25', 2, '', '      affinity:\n        podAntiAffinity:\n          requiredDuringSchedulingIgnoredDuringExecution:\n          - topologyKey: kubernetes.io/hostname\n            labelSelector:\n              matchLabels:\n                app: front\n')), 'kubectl get pods -n spread -o wide'] }),

    L({ id: 's38-memory-too-high', num: 'S38', title: 'Insufficient memory', diff: 'Beginner', track: ['CKA'], domain: 'Troubleshooting', time: '8 min', ns: 'mem',
      story: 'Deployment `report` requests 64Gi of memory per pod; workers have 8Gi. Pods are Pending. Lower the request to 128Mi.',
      setup: [Yh.dep('report', 'mem', 'nginx:1.25', 2, '        resources:\n          requests:\n            memory: 64Gi\n')],
      tasks: [T('Request lowered', ['`kubectl describe pod` → Insufficient memory', '`kubectl set resources deployment/report --requests=memory=128Mi`', 'Nodes have ~8Gi allocatable.'], [{ t: 'jp', ref: 'deploy/report', ns: 'mem', path: '.spec.template.spec.containers[0].resources.requests.memory', eq: '128Mi' }]),
        T('2 pods Ready', ['`kubectl rollout status deployment/report`', '`kubectl get pods`', 'Pending pods are replaced by the rollout.'], [{ t: 'podsReady', ns: 'mem', sel: 'app=report', min: 2 }])],
      solution: ['kubectl set resources deployment/report --requests=memory=128Mi -n mem', 'kubectl rollout status deployment/report -n mem'] }),

    L({ id: 's39-rollout-revision', num: 'S39', title: 'Roll back to a specific revision', diff: 'Intermediate', track: ['CKAD'], domain: 'Workloads', time: '12 min', ns: 'rel',
      story: 'Deployment `shop` went nginx:1.24 → 1.25 → a broken tag. The last good version people trust is revision 1 (nginx:1.24). Roll back to that exact revision.',
      setup: [Yh.dep('shop', 'rel', 'nginx:1.24', 2)], setupCmds: ['kubectl set image deployment/shop shop=nginx:1.25 -n rel', 'kubectl rollout status deployment/shop -n rel', 'kubectl set image deployment/shop shop=nginx:1.255 -n rel'],
      tasks: [T('Inspect the history', ['`kubectl rollout history deployment/shop`', '`kubectl rollout history deployment/shop --revision=1`', 'Revision numbers increase with each template change.'], [{ t: 'jp', ref: 'deploy/shop', ns: 'rel', path: '.spec.template.spec.containers[0].image', ne: 'nginx:1.255' }]),
        T('Running nginx:1.24 with 2 Ready pods', ['`kubectl rollout undo deployment/shop --to-revision=1`', '`kubectl rollout status deployment/shop`', 'Verify with `kubectl get deploy shop -o wide`.'], [{ t: 'jp', ref: 'deploy/shop', ns: 'rel', path: '.spec.template.spec.containers[0].image', eq: 'nginx:1.24' }, { t: 'podsReady', ns: 'rel', sel: 'app=shop', min: 2 }])],
      solution: ['kubectl rollout history deployment/shop -n rel', 'kubectl rollout undo deployment/shop --to-revision=1 -n rel', 'kubectl rollout status deployment/shop -n rel'] }),

    L({ id: 's40-cronjob-fix', num: 'S40', title: 'CronJob never runs: suspended + wrong schedule', diff: 'Intermediate', track: ['CKAD'], domain: 'Workloads', time: '12 min', ns: 'cron',
      story: 'CronJob `backup` should run every 15 minutes but is suspended and scheduled yearly. Fix both.',
      setup: ['apiVersion: batch/v1\nkind: CronJob\nmetadata:\n  name: backup\n  namespace: cron\nspec:\n  schedule: "0 0 1 1 *"\n  suspend: true\n  jobTemplate:\n    spec:\n      template:\n        spec:\n          restartPolicy: OnFailure\n          containers:\n          - name: backup\n            image: busybox:1.36\n            command: ["sh", "-c", "echo backing up"]\n'],
      tasks: [T('Schedule is every 15 minutes', ['`kubectl get cronjob backup`', '`kubectl patch cronjob backup -p \'{"spec":{"schedule":"*/15 * * * *"}}\'`', '"*/15 * * * *"'], [{ t: 'jp', ref: 'cronjob/backup', ns: 'cron', path: '.spec.schedule', eq: '*/15 * * * *' }]),
        T('Not suspended', ['`kubectl patch cronjob backup -p \'{"spec":{"suspend":false}}\'`', 'SUSPEND column in `kubectl get cj`.', 'There is no `kubectl resume` for cronjobs.'], [{ t: 'jp', ref: 'cronjob/backup', ns: 'cron', path: '.spec.suspend', eq: 'false' }])],
      solution: ['kubectl patch cronjob backup -n cron -p \'{"spec":{"schedule":"*/15 * * * *","suspend":false}}\'', 'kubectl get cronjob -n cron'] }),

    L({ id: 's41-job-bad-image', num: 'S41', title: 'Job stuck: ImagePullBackOff', diff: 'Intermediate', track: ['CKAD'], domain: 'Workloads', time: '10 min', ns: 'jobs',
      story: 'Job `migrate` uses image `busybox:1.99.9`, which does not exist, so it never completes. Jobs\' pod templates are immutable: delete and recreate it so it completes.',
      setup: ['apiVersion: batch/v1\nkind: Job\nmetadata:\n  name: migrate\n  namespace: jobs\nspec:\n  template:\n    spec:\n      restartPolicy: Never\n      containers:\n      - name: migrate\n        image: busybox:doesnotexist\n        command: ["sh", "-c", "echo migrated"]\n'],
      tasks: [T('Find the bad image', ['`kubectl get pods -n jobs` → ImagePullBackOff', '`kubectl describe job migrate`', 'The tag does not exist.'], [{ t: 'jp', ref: 'job/migrate', ns: 'jobs', path: '.spec.template.spec.containers[0].image', ne: 'busybox:doesnotexist' }]),
        T('Job completes (succeeded: 1)', ['`kubectl delete job migrate`', 'Re-create with busybox:1.36 (`kubectl create job migrate --image=busybox:1.36 -- sh -c "echo migrated"`).', '`kubectl get job`'], [{ t: 'jp', ref: 'job/migrate', ns: 'jobs', path: '.status.succeeded', eq: '1' }])],
      solution: ['kubectl delete job migrate -n jobs', 'kubectl create job migrate --image=busybox:1.36 -n jobs -- sh -c "echo migrated"', 'kubectl get job -n jobs'] }),

    L({ id: 's42-daemonset-all-nodes', num: 'S42', title: 'DaemonSet only runs on one node', diff: 'Intermediate', track: ['CKA'], domain: 'Workloads', time: '10 min', ns: 'agents',
      story: 'DaemonSet `logger` should run on every worker, but its nodeSelector (`role=logging`) matches nothing. Remove the restriction so it runs on both workers.',
      setup: ['apiVersion: apps/v1\nkind: DaemonSet\nmetadata:\n  name: logger\n  namespace: agents\nspec:\n  selector:\n    matchLabels:\n      app: logger\n  template:\n    metadata:\n      labels:\n        app: logger\n    spec:\n      nodeSelector:\n        role: logging\n      containers:\n      - name: logger\n        image: busybox:1.36\n        command: ["sleep", "3600"]\n'],
      tasks: [T('nodeSelector removed', ['`kubectl get ds logger` → DESIRED 0', '`kubectl edit ds logger` or re-apply without nodeSelector', 'Alternatively label both workers role=logging.'], [{ t: 'jp', ref: 'ds/logger', ns: 'agents', path: '.spec.template.spec.nodeSelector.role', eq: '' }]),
        T('A logger pod Ready on each worker (2)', ['`kubectl get pods -o wide`', 'DaemonSet controllers place one pod per eligible node.', 'The control-plane node is tainted, so only workers.'], [{ t: 'podsReady', ns: 'agents', sel: 'app=logger', min: 2 }])],
      solution: ['kubectl delete ds logger -n agents', heredoc('apiVersion: apps/v1\nkind: DaemonSet\nmetadata:\n  name: logger\n  namespace: agents\nspec:\n  selector:\n    matchLabels:\n      app: logger\n  template:\n    metadata:\n      labels:\n        app: logger\n    spec:\n      containers:\n      - name: logger\n        image: busybox:1.36\n        command: ["sleep", "3600"]\n'), 'kubectl get pods -n agents -o wide'] }),

    L({ id: 's43-headless-service', num: 'S43', title: 'StatefulSet needs a headless Service', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Workloads', time: '10 min', ns: 'ss',
      story: 'StatefulSet `store` declares `serviceName: store-hl` but that Service does not exist, so pods have no stable DNS names. Create a headless Service `store-hl` (clusterIP None) selecting app=store on port 80.',
      setup: ['apiVersion: apps/v1\nkind: StatefulSet\nmetadata:\n  name: store\n  namespace: ss\nspec:\n  serviceName: store-hl\n  replicas: 2\n  selector:\n    matchLabels:\n      app: store\n  template:\n    metadata:\n      labels:\n        app: store\n    spec:\n      containers:\n      - name: store\n        image: nginx:1.25\n'],
      tasks: [T('Headless Service `store-hl`', ['`kubectl create service clusterip store-hl --clusterip=None --tcp=80:80` (selector needs fixing) — or a manifest.', 'spec.clusterIP: None, selector app: store, port 80', 'Apply with a heredoc.'], [{ t: 'jp', ref: 'svc/store-hl', ns: 'ss', path: '.spec.clusterIP', eq: 'None' }]),
        T('Service selects both pods', ['`kubectl get endpoints store-hl`', 'Selector must be app=store.', 'Two addresses expected.'], [{ t: 'endpoints', ns: 'ss', svc: 'store-hl', min: 2 }])],
      solution: [heredoc('apiVersion: v1\nkind: Service\nmetadata:\n  name: store-hl\n  namespace: ss\nspec:\n  clusterIP: None\n  selector:\n    app: store\n  ports:\n  - port: 80\n'), 'kubectl get endpoints store-hl -n ss'] }),

    L({ id: 's44-static-pv', num: 'S44', title: 'Bind a PVC to a pre-created PersistentVolume', diff: 'Advanced', track: ['CKA'], domain: 'Storage', time: '15 min', ns: 'pvs',
      story: 'PV `archive-pv` (5Gi, storageClassName `manual`, hostPath /mnt/archive) exists. Create PVC `archive` requesting 2Gi of class `manual` so it binds to that PV.',
      setup: ['apiVersion: v1\nkind: PersistentVolume\nmetadata:\n  name: archive-pv\nspec:\n  capacity:\n    storage: 5Gi\n  accessModes: [ReadWriteOnce]\n  storageClassName: manual\n  hostPath:\n    path: /mnt/archive\n'],
      tasks: [T('PVC `archive` (2Gi, class manual)', ['`kubectl get pv`', 'PVC must have storageClassName: manual and accessModes ReadWriteOnce.', 'Apply with a heredoc in namespace pvs.'], [{ t: 'exists', ref: 'pvc/archive', ns: 'pvs' }]),
        T('PVC Bound to archive-pv', ['`kubectl get pvc,pv`', 'Capacity of the PV (5Gi) ≥ request.', 'volumeName shows archive-pv.'], [{ t: 'jp', ref: 'pvc/archive', ns: 'pvs', path: '.status.phase', eq: 'Bound' }, { t: 'jp', ref: 'pvc/archive', ns: 'pvs', path: '.spec.volumeName', eq: 'archive-pv' }])],
      solution: [heredoc('apiVersion: v1\nkind: PersistentVolumeClaim\nmetadata:\n  name: archive\n  namespace: pvs\nspec:\n  storageClassName: manual\n  accessModes: [ReadWriteOnce]\n  resources:\n    requests:\n      storage: 2Gi\n'), 'kubectl get pvc,pv -n pvs'] }),

    L({ id: 's45-hpa-wrong-target', num: 'S45', title: 'HPA points at the wrong Deployment', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Workloads', time: '10 min', ns: 'scale',
      story: 'HPA `checkout` targets Deployment `checkot` (typo) so it never scales. Recreate it against Deployment `checkout`: min 2, max 5, 60% CPU.',
      setup: [Yh.dep('checkout', 'scale', 'nginx:1.25', 1, '        resources:\n          requests:\n            cpu: 100m\n'), 'apiVersion: autoscaling/v2\nkind: HorizontalPodAutoscaler\nmetadata:\n  name: checkout\n  namespace: scale\nspec:\n  scaleTargetRef:\n    apiVersion: apps/v1\n    kind: Deployment\n    name: checkot\n  minReplicas: 2\n  maxReplicas: 5\n  metrics:\n  - type: Resource\n    resource:\n      name: cpu\n      target: {type: Utilization, averageUtilization: 60}\n'],
      tasks: [T('HPA targets `checkout`', ['`kubectl describe hpa checkout` → unable to get target', '`kubectl delete hpa checkout` then `kubectl autoscale deployment checkout --name=checkout --min=2 --max=5 --cpu-percent=60`', 'scaleTargetRef is not patched easily — recreate.'], [{ t: 'jp', ref: 'hpa/checkout', ns: 'scale', path: '.spec.scaleTargetRef.name', eq: 'checkout' }]),
        T('Deployment has ≥2 Ready pods', ['A working HPA enforces minReplicas.', '`kubectl get hpa`', 'Wait a few seconds.'], [{ t: 'podsReady', ns: 'scale', sel: 'app=checkout', min: 2 }])],
      solution: ['kubectl delete hpa checkout -n scale', 'kubectl autoscale deployment checkout --name=checkout --min=2 --max=5 --cpu-percent=60 -n scale', 'kubectl get hpa -n scale'] }),

    L({ id: 's46-pdb-blocks-drain', num: 'S46', title: 'PodDisruptionBudget blocks a node drain', diff: 'Advanced', track: ['CKA'], domain: 'Cluster', time: '15 min', ns: 'maint',
      story: 'You must drain worker1, but PDB `guard` (minAvailable 3 on a 3-replica Deployment) allows zero disruptions. Fix the PDB (minAvailable 2), then drain worker1.',
      setup: [Yh.dep('guarded', 'maint', 'nginx:1.25', 3), 'apiVersion: policy/v1\nkind: PodDisruptionBudget\nmetadata:\n  name: guard\n  namespace: maint\nspec:\n  minAvailable: 3\n  selector:\n    matchLabels:\n      app: guarded\n'],
      tasks: [T('PDB allows one disruption (minAvailable 2)', ['`kubectl get pdb` → ALLOWED DISRUPTIONS 0', '`kubectl patch pdb guard -p \'{"spec":{"minAvailable":2}}\'`', 'minAvailable ≤ replicas-1 to permit drains.'], [{ t: 'jp', ref: 'pdb/guard', ns: 'maint', path: '.spec.minAvailable', eq: '2' }]),
        T('worker1 drained, 3 replicas still Ready', ['`kubectl drain worker1 --ignore-daemonsets --delete-emptydir-data`', 'Pods move to worker2.', '`kubectl get pods -o wide`'], [{ t: 'nodeCordoned', node: 'worker1' }, { t: 'podsOffNode', node: 'worker1', ns: 'maint' }, { t: 'podsReady', ns: 'maint', sel: 'app=guarded', min: 3 }])],
      solution: ['kubectl patch pdb guard -n maint -p \'{"spec":{"minAvailable":2}}\'', 'kubectl drain worker1 --ignore-daemonsets --delete-emptydir-data', 'kubectl get pods -n maint -o wide'] }),

    L({ id: 's47-limitrange-max', num: 'S47', title: 'LimitRange rejects the pod', diff: 'Intermediate', track: ['CKA'], domain: 'Cluster', time: '12 min', ns: 'lr',
      story: 'Namespace `lr` has a LimitRange capping each container at 500m CPU. Deployment `heavy` asks for 2 CPU and its pods are rejected. Lower the CPU limit to 400m (and request 200m).',
      setup: ['apiVersion: v1\nkind: LimitRange\nmetadata:\n  name: caps\n  namespace: lr\nspec:\n  limits:\n  - type: Container\n    max:\n      cpu: 500m\n', Yh.dep('heavy', 'lr', 'nginx:1.25', 2, '        resources:\n          requests:\n            cpu: "1"\n          limits:\n            cpu: "2"\n')],
      tasks: [T('Understand the admission error', ['`kubectl get events -n lr`', 'maximum cpu usage per Container is 500m', '`kubectl describe limitrange caps`'], [{ t: 'jp', ref: 'limitrange/caps', ns: 'lr', path: '.spec.limits[0].max.cpu', eq: '500m' }]),
        T('heavy runs 2 Ready pods within the cap', ['`kubectl set resources deployment/heavy --requests=cpu=200m --limits=cpu=400m`', 'Do not edit the LimitRange.', '`kubectl rollout status deployment/heavy`'], [{ t: 'podsReady', ns: 'lr', sel: 'app=heavy', min: 2 }])],
      solution: ['kubectl get events -n lr', 'kubectl set resources deployment/heavy --requests=cpu=200m --limits=cpu=400m -n lr', 'kubectl rollout status deployment/heavy -n lr'] }),

    L({ id: 's48-quota-pods', num: 'S48', title: 'Pod-count quota blocks scaling', diff: 'Beginner', track: ['CKA'], domain: 'Cluster', time: '8 min', ns: 'qt',
      story: 'ResourceQuota `count` allows 3 pods but Deployment `burst` wants 5. The business approved more: raise the quota to 6 pods so all 5 replicas run.',
      setup: ['apiVersion: v1\nkind: ResourceQuota\nmetadata:\n  name: count\n  namespace: qt\nspec:\n  hard:\n    pods: "3"\n', Yh.dep('burst', 'qt', 'nginx:1.25', 5)],
      tasks: [T('Quota raised to 6 pods', ['`kubectl describe quota count`', '`kubectl patch resourcequota count -p \'{"spec":{"hard":{"pods":"6"}}}\'`', 'Or edit the object.'], [{ t: 'jp', ref: 'resourcequota/count', ns: 'qt', path: '.spec.hard.pods', eq: '6' }]),
        T('5 replicas Ready', ['The ReplicaSet retries pod creation.', '`kubectl get pods -n qt`', 'Wait a few seconds.'], [{ t: 'podsReady', ns: 'qt', sel: 'app=burst', min: 5 }])],
      solution: ['kubectl patch resourcequota count -n qt -p \'{"spec":{"hard":{"pods":"6"}}}\'', 'kubectl get pods -n qt'] })
  ]);
})(typeof window !== 'undefined' ? window : globalThis);
