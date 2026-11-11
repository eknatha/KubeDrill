/* Interactive labs S01–S10 (beginner). Each lab = setup manifests + tasks with assertions + solution. */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {}, Labs = KL.Labs || require('../labs-engine.js');
  // YAML helpers (also used by the other lab files)
  var Yh = Labs.y = {
    dep: function (name, ns, img, rep, extra, tplExtra, lbl) {
      return 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: ' + name + '\n  namespace: ' + ns + '\nspec:\n  replicas: ' + rep + '\n  selector:\n    matchLabels:\n      app: ' + (lbl || name) + '\n  template:\n    metadata:\n      labels:\n        app: ' + (lbl || name) + '\n    spec:\n' + (tplExtra || '') + '      containers:\n      - name: ' + name + '\n        image: ' + img + '\n' + (extra || '');
    },
    svc: function (name, ns, sel, port, tp) { return 'apiVersion: v1\nkind: Service\nmetadata:\n  name: ' + name + '\n  namespace: ' + ns + '\nspec:\n  selector:\n    app: ' + sel + '\n  ports:\n  - port: ' + port + '\n    targetPort: ' + (tp || port) + '\n'; },
    pod: function (name, ns, img, labels, extra) { return 'apiVersion: v1\nkind: Pod\nmetadata:\n  name: ' + name + '\n  namespace: ' + ns + '\n  labels:\n' + Object.keys(labels || { run: name }).map(function (k) { return '    ' + k + ': ' + (labels || { run: name })[k]; }).join('\n') + '\nspec:\n  containers:\n  - name: ' + name + '\n    image: ' + img + '\n' + (extra || ''); },
    tester: function (ns) { return 'apiVersion: v1\nkind: Pod\nmetadata:\n  name: tester\n  namespace: ' + ns + '\n  labels:\n    run: tester\nspec:\n  containers:\n  - name: tester\n    image: busybox:1.36\n    command: ["sleep", "3600"]\n'; }
  };
  var R = function (n, d) { return { id: n, desc: d }; }; void R;

  Labs.register([
    { id: 's01-pending-cpu', num: 'S01', title: 'Prod is down: pods stuck in Pending', diff: 'Beginner', track: ['CKA'], domain: 'Troubleshooting', time: '10 min', ns: 'payments',
      story: 'Someone deployed the `api` Deployment in namespace `payments` with a typo in the CPU request. Pods never start. Find out why and get 2 healthy replicas running.',
      setup: [Yh.dep('api', 'payments', 'nginx:1.25', 2, '        resources:\n          requests:\n            cpu: "64"\n            memory: 64Mi\n')],
      tasks: [
        { id: '1', title: 'Find why the pods are Pending', desc: 'Use `kubectl describe pod` and read the Events. What does the scheduler say?', hints: ['`kubectl get pods` shows Pending. Then `kubectl describe pod <name>` → look at Events.', 'The message says "Insufficient cpu": the pod asks for far more CPU than any node has (nodes have 4 cores).', 'Fix the request: `kubectl set resources deployment/api --requests=cpu=100m,memory=64Mi`'], assert: [{ t: 'jp', ref: 'deploy/api', ns: 'payments', path: '.spec.template.spec.containers[0].resources.requests.cpu', ne: '64' }] },
        { id: '2', title: 'Get 2 Ready replicas of `api`', desc: 'After the fix the Deployment should have 2 pods Running and Ready.', hints: ['Watch with `kubectl get pods -w` (or re-run `kubectl get pods`).', 'A Deployment recreates pods when its template changes, so just wait a few seconds.', 'Check `kubectl rollout status deployment/api`.'], assert: [{ t: 'podsReady', ns: 'payments', sel: 'app=api', min: 2 }] }
      ],
      solution: ['kubectl describe pod -l app=api | grep -A3 Events', 'kubectl set resources deployment/api --requests=cpu=100m,memory=64Mi', 'kubectl rollout status deployment/api'] },

    { id: 's02-imagepull', num: 'S02', title: 'Prod is down: ImagePullBackOff', diff: 'Beginner', track: ['CKA', 'CKAD'], domain: 'Troubleshooting', time: '8 min', ns: 'shop',
      story: 'A release pipeline pushed `nginx:1.255` — a tag that does not exist. The `web` Deployment in `shop` has no healthy pods. Roll forward with a valid image.',
      setup: [Yh.dep('web', 'shop', 'nginx:1.255', 3)],
      tasks: [
        { id: '1', title: 'Identify the failing image', desc: 'Find the exact error in the pod Events.', hints: ['`kubectl get pods -n shop` → ErrImagePull / ImagePullBackOff.', '`kubectl describe pod <pod> | grep -i -A2 failed`', 'The tag `1.255` does not exist in the registry.'], assert: [{ t: 'jp', ref: 'deploy/web', ns: 'shop', path: '.spec.template.spec.containers[0].image', ne: 'nginx:1.255' }] },
        { id: '2', title: 'Fix it: 3 Ready pods on a valid nginx tag', desc: 'Use `kubectl set image` so no YAML editing is needed.', hints: ['`kubectl set image deployment/web web=nginx:1.25`', 'Container name is `web` (see `kubectl get deploy web -o wide`).', 'Verify with `kubectl rollout status deployment/web`.'], assert: [{ t: 'podsReady', ns: 'shop', sel: 'app=web', min: 3 }, { t: 'jp', ref: 'deploy/web', ns: 'shop', path: '.spec.template.spec.containers[0].image', has: 'nginx:1.2' }] }
      ],
      solution: ['kubectl set image deployment/web web=nginx:1.25', 'kubectl rollout status deployment/web'] },

    { id: 's03-oomkilled', num: 'S03', title: 'CrashLoopBackOff: OOMKilled', diff: 'Beginner', track: ['CKA'], domain: 'Troubleshooting', time: '12 min', ns: 'batch',
      story: 'The `worker` Deployment allocates ~150 MiB but has a 100 MiB memory limit. Pods restart forever (exit code 137). Diagnose and fix without changing the image.',
      setup: [Yh.dep('worker', 'batch', 'polinux/stress', 2, '        command: ["stress"]\n        args: ["--vm", "1", "--vm-bytes", "150M", "--vm-hang", "1"]\n        resources:\n          requests:\n            memory: 64Mi\n          limits:\n            memory: 100Mi\n')],
      tasks: [
        { id: '1', title: 'Confirm the pods were OOMKilled', desc: 'Find "Last State: Terminated, Reason: OOMKilled, Exit Code: 137".', hints: ['`kubectl get pods -n batch` shows CrashLoopBackOff and RESTARTS > 0.', '`kubectl describe pod <name>` → Last State.', 'Exit code 137 = SIGKILL, here from the kernel OOM killer.'], assert: [{ t: 'jp', ref: 'deploy/worker', ns: 'batch', path: '.spec.template.spec.containers[0].resources.limits.memory', ne: '100Mi' }] },
        { id: '2', title: 'Raise the memory limit to at least 256Mi', desc: 'Pods must be Ready afterwards.', hints: ['`kubectl set resources deployment/worker --limits=memory=256Mi`', 'Keep the request ≤ limit.', '`kubectl get pods -w`'], assert: [{ t: 'podsReady', ns: 'batch', sel: 'app=worker', min: 2 }] }
      ],
      solution: ['kubectl set resources deployment/worker --limits=memory=256Mi', 'kubectl rollout status deployment/worker'] },

    { id: 's04-no-endpoints', num: 'S04', title: 'Service has no endpoints', diff: 'Beginner', track: ['CKA', 'CKAD'], domain: 'Services & Networking', time: '10 min', ns: 'store',
      story: 'Users get "connection refused" from `frontend-svc`. The Deployment is healthy, but the Service selects the wrong label. A `tester` pod is available to curl from inside the cluster.',
      setup: [Yh.dep('frontend', 'store', 'nginx:1.25', 2), Yh.svc('frontend-svc', 'store', 'front-end', 80), Yh.tester('store')],
      tasks: [
        { id: '1', title: 'Show that the Service has no endpoints', desc: 'Compare `kubectl get endpoints frontend-svc` with the Pod labels.', hints: ['`kubectl get ep frontend-svc` → <none>.', '`kubectl get pods --show-labels` shows `app=frontend`.', '`kubectl describe svc frontend-svc` shows Selector: app=front-end.'], assert: [{ t: 'jp', ref: 'svc/frontend-svc', ns: 'store', path: '.spec.selector.app', eq: 'frontend' }] },
        { id: '2', title: 'Fix the selector → ≥2 endpoints', desc: 'Patch or edit the Service.', hints: ['`kubectl patch svc frontend-svc -p \'{"spec":{"selector":{"app":"frontend"}}}\'`', 'Alternatively `kubectl edit svc frontend-svc`.', '`kubectl get ep frontend-svc`'], assert: [{ t: 'endpoints', svc: 'frontend-svc', ns: 'store', min: 2 }] },
        { id: '3', title: 'Curl the Service from the tester pod', desc: '`kubectl exec tester -- wget -qO- frontend-svc` must return the nginx page.', hints: ['`kubectl exec tester -- wget -qO- frontend-svc`', 'Same namespace → short DNS name works.', 'Cross-namespace: `frontend-svc.store.svc.cluster.local`.'], assert: [{ t: 'curl', ns: 'store', from: 'tester', to: 'frontend-svc:80', ok: true }] }
      ],
      solution: ['kubectl patch svc frontend-svc -p \'{"spec":{"selector":{"app":"frontend"}}}\'', 'kubectl get ep frontend-svc', 'kubectl exec tester -- wget -qO- frontend-svc'] },

    { id: 's05-config-error', num: 'S05', title: 'CreateContainerConfigError: missing ConfigMap', diff: 'Beginner', track: ['CKAD'], domain: 'Configuration', time: '10 min', ns: 'inventory',
      story: 'The `app` Deployment reads `LOG_LEVEL` from ConfigMap `app-config` — which was never created. Pods are stuck. Create the ConfigMap (LOG_LEVEL=debug) and verify the pods read it.',
      setup: [Yh.dep('app', 'inventory', 'nginx:1.25', 2, '        env:\n        - name: LOG_LEVEL\n          valueFrom:\n            configMapKeyRef:\n              name: app-config\n              key: LOG_LEVEL\n')],
      tasks: [
        { id: '1', title: 'Create ConfigMap `app-config` with LOG_LEVEL=debug', desc: 'One imperative command is enough.', hints: ['`kubectl describe pod` → "configmap \\"app-config\\" not found".', '`kubectl create configmap app-config --from-literal=LOG_LEVEL=debug`', 'Verify: `kubectl get cm app-config -o yaml`.'], assert: [{ t: 'jp', ref: 'cm/app-config', ns: 'inventory', path: '.data.LOG_LEVEL', eq: 'debug' }] },
        { id: '2', title: 'Both pods become Ready', desc: 'Kubelet retries automatically once the ConfigMap exists.', hints: ['Wait a few seconds.', '`kubectl get pods`', 'If still failing: `kubectl describe pod` for the next error.'], assert: [{ t: 'podsReady', ns: 'inventory', sel: 'app=app', min: 2 }] },
        { id: '3', title: 'Prove the env var inside a pod', desc: '`kubectl exec deploy/app -- printenv LOG_LEVEL` prints debug.', hints: ['`kubectl exec deploy/app -- printenv LOG_LEVEL`', 'ConfigMap changes are NOT picked up by env vars of running pods.', 'Restart with `kubectl rollout restart deploy/app` if you change it later.'], assert: [{ t: 'jp', ref: 'cm/app-config', ns: 'inventory', path: '.data.LOG_LEVEL', eq: 'debug' }] }
      ],
      solution: ['kubectl create configmap app-config --from-literal=LOG_LEVEL=debug', 'kubectl get pods', 'kubectl exec deploy/app -- printenv LOG_LEVEL'] },

    { id: 's06-rollout-rollback', num: 'S06', title: 'Bad rollout: undo, scale, then upgrade', diff: 'Beginner', track: ['CKAD', 'CKA'], domain: 'Workloads', time: '15 min', ns: 'release',
      story: 'A colleague pushed a broken image to `site`; the rollout is stuck with a new ImagePullBackOff pod while old pods still serve traffic. Roll back, scale to 4, then upgrade to `nginx:1.27`.',
      setup: [Yh.dep('site', 'release', 'nginx:1.24', 2)], setupCmds: ['kubectl set image deployment/site site=nginx:1.99-bad -n release'],
      tasks: [
        { id: '1', title: 'Roll back the broken rollout', desc: 'Use rollout history/undo — do not edit the image by hand.', hints: ['`kubectl rollout history deployment/site`', '`kubectl rollout undo deployment/site`', 'Check `kubectl get pods` — no ImagePullBackOff should remain.'], assert: [{ t: 'jp', ref: 'deploy/site', ns: 'release', path: '.spec.template.spec.containers[0].image', ne: 'nginx:1.99-bad' }] },
        { id: '2', title: 'Scale to 4 replicas', desc: '', hints: ['`kubectl scale deployment/site --replicas=4`'], assert: [{ t: 'jp', ref: 'deploy/site', ns: 'release', path: '.spec.replicas', eq: '4' }] },
        { id: '3', title: 'Upgrade to nginx:1.27 with all 4 pods Ready', desc: 'Watch the rolling update with `kubectl rollout status`.', hints: ['`kubectl set image deployment/site site=nginx:1.27`', '`kubectl rollout status deployment/site`', 'Old ReplicaSets stay around for rollback: `kubectl get rs`.'], assert: [{ t: 'jp', ref: 'deploy/site', ns: 'release', path: '.spec.template.spec.containers[0].image', eq: 'nginx:1.27' }, { t: 'podsReady', ns: 'release', sel: 'app=site', min: 4, max: 4 }] }
      ],
      solution: ['kubectl rollout undo deployment/site', 'kubectl scale deployment/site --replicas=4', 'kubectl set image deployment/site site=nginx:1.27', 'kubectl rollout status deployment/site'] },

    { id: 's07-scheduling', num: 'S07', title: 'Taints, tolerations and nodeSelector', diff: 'Beginner', track: ['CKA'], domain: 'Scheduling', time: '15 min', ns: 'ml',
      story: 'The `trainer` Deployment needs a GPU node (`accelerator=gpu`). `worker1` is the GPU box but nobody labelled it, and it is tainted `dedicated=ml:NoSchedule` so only ML workloads may land there.',
      setup: [Yh.dep('trainer', 'ml', 'nginx:1.25', 2, '', '      nodeSelector:\n        accelerator: gpu\n')], setupCmds: ['kubectl taint nodes worker1 dedicated=ml:NoSchedule'], cleanupCmds: ['kubectl taint nodes worker1 dedicated- || true', 'kubectl label node worker1 accelerator- || true'],
      tasks: [
        { id: '1', title: 'Label worker1 with accelerator=gpu', desc: '', hints: ['`kubectl label node worker1 accelerator=gpu`', '`kubectl get nodes --show-labels`', 'The pods now fail on the taint instead.'], assert: [{ t: 'jp', ref: 'node/worker1', ns: '', path: '.metadata.labels.accelerator', eq: 'gpu' }] },
        { id: '2', title: 'Add a toleration for dedicated=ml:NoSchedule to the Deployment', desc: 'Do not remove the taint from the node.', hints: ['`kubectl describe pod` → "had untolerated taint {dedicated: ml}".', '`kubectl patch deployment trainer --patch-file` is awkward; use `kubectl patch deployment trainer -p \'{"spec":{"template":{"spec":{"tolerations":[{"key":"dedicated","operator":"Equal","value":"ml","effect":"NoSchedule"}]}}}}\'`', '`kubectl edit deployment trainer` also works.'], assert: [{ t: 'jp', ref: 'deploy/trainer', ns: 'ml', path: '.spec.template.spec.tolerations[0].key', eq: 'dedicated' }, { t: 'jp', ref: 'node/worker1', ns: '', path: '.spec.taints[0].key', eq: 'dedicated' }] },
        { id: '3', title: 'Both replicas Ready (on worker1)', desc: '', hints: ['`kubectl get pods -o wide`', 'Both pods should show NODE worker1.', 'Wait for the rollout.'], assert: [{ t: 'podsReady', ns: 'ml', sel: 'app=trainer', min: 2 }] }
      ],
      solution: ['kubectl label node worker1 accelerator=gpu', 'kubectl patch deployment trainer -p \'{"spec":{"template":{"spec":{"tolerations":[{"key":"dedicated","operator":"Equal","value":"ml","effect":"NoSchedule"}]}}}}\'', 'kubectl get pods -o wide'] },

    { id: 's08-probes', num: 'S08', title: 'Liveness and readiness probes', diff: 'Beginner', track: ['CKAD'], domain: 'Observability', time: '15 min', ns: 'probes',
      story: 'Two services misbehave. `site` is restarted forever by a liveness probe hitting a missing path. `api` never becomes Ready because its readiness probe checks the wrong port.',
      setup: [Yh.dep('site', 'probes', 'nginx:1.25', 2, '        livenessProbe:\n          httpGet:\n            path: /healthz\n            port: 80\n          initialDelaySeconds: 1\n'), Yh.dep('api', 'probes', 'nginx:1.25', 2, '        readinessProbe:\n          httpGet:\n            path: /\n            port: 8080\n')],
      tasks: [
        { id: '1', title: 'Fix the liveness probe of `site` (path /)', desc: 'nginx serves 404 on /healthz.', hints: ['`kubectl describe pod -l app=site` → "Liveness probe failed: HTTP probe failed with statuscode: 404".', '`kubectl patch deployment site --type=json -p=\'[{"op":"replace","path":"/spec/template/spec/containers/0/livenessProbe/httpGet/path","value":"/"}]\'`', 'Or `kubectl edit deployment site`.'], assert: [{ t: 'jp', ref: 'deploy/site', ns: 'probes', path: '.spec.template.spec.containers[0].livenessProbe.httpGet.path', eq: '/' }, { t: 'podsReady', ns: 'probes', sel: 'app=site', min: 2 }] },
        { id: '2', title: 'Fix the readiness probe port of `api` (80)', desc: '', hints: ['`kubectl describe pod -l app=api` → connection refused on 8080.', 'nginx listens on 80.', '`kubectl patch deployment api --type=json -p=\'[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/port","value":80}]\'`'], assert: [{ t: 'jp', ref: 'deploy/api', ns: 'probes', path: '.spec.template.spec.containers[0].readinessProbe.httpGet.port', eq: '80' }, { t: 'podsReady', ns: 'probes', sel: 'app=api', min: 2 }] }
      ],
      solution: ['kubectl patch deployment site --type=json -p=\'[{"op":"replace","path":"/spec/template/spec/containers/0/livenessProbe/httpGet/path","value":"/"}]\'', 'kubectl patch deployment api --type=json -p=\'[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/port","value":80}]\''] },

    { id: 's09-jobs', num: 'S09', title: 'Jobs and CronJobs', diff: 'Beginner', track: ['CKAD'], domain: 'Workloads', time: '12 min', ns: 'jobs',
      story: 'Create a one-off Job that runs 3 times, and a CronJob that runs every 5 minutes. Tip: generate YAML with `--dry-run=client -o yaml`, edit with sed or the editor, then apply.',
      setup: [], files: [],
      tasks: [
        { id: '1', title: 'Job `report`: busybox:1.36, runs `echo done`, completions=3', desc: 'restartPolicy must be Never or OnFailure.', hints: ['`kubectl create job report --image=busybox:1.36 --dry-run=client -o yaml -- echo done > job.yaml`', 'Edit job.yaml: add `completions: 3` under spec (`vi job.yaml`, or `sed -i` to insert).', '`kubectl apply -f job.yaml`'], assert: [{ t: 'jp', ref: 'job/report', ns: 'jobs', path: '.spec.completions', eq: '3' }] },
        { id: '2', title: 'The Job finishes with 3 successful pods', desc: '', hints: ['`kubectl get pods`', '`kubectl get job report`', 'Pods show Completed.'], assert: [{ t: 'jp', ref: 'job/report', ns: 'jobs', path: '.status.succeeded', eq: '3' }] },
        { id: '3', title: 'CronJob `cleanup`: schedule `*/5 * * * *`, image busybox:1.36', desc: '', hints: ['`kubectl create cronjob cleanup --image=busybox:1.36 --schedule="*/5 * * * *" -- echo cleaning`', 'Check with `kubectl get cronjob`.', 'Trigger manually: `kubectl create job --from=cronjob/cleanup manual-1`.'], assert: [{ t: 'jp', ref: 'cronjob/cleanup', ns: 'jobs', path: '.spec.schedule', eq: '*/5 * * * *' }] }
      ],
      solution: ['kubectl create job report --image=busybox:1.36 --dry-run=client -o yaml -- echo done > job.yaml', 'sed -i "s/^spec:/spec:\\n  completions: 3/" job.yaml', 'kubectl apply -f job.yaml', 'kubectl create cronjob cleanup --image=busybox:1.36 --schedule="*/5 * * * *" -- echo cleaning'] },

    { id: 's10-sidecar', num: 'S10', title: 'Multi-container pod: log sidecar', diff: 'Beginner', track: ['CKAD'], domain: 'Pod design', time: '15 min', ns: 'logs',
      story: 'The `webapp` pod only runs nginx. Rebuild it with a second container `log-agent` (busybox:1.36) that runs `tail -f /var/log/nginx/access.log`. Both containers share an emptyDir volume named `logs` mounted at /var/log/nginx. Pods are immutable — delete and recreate.',
      setup: [Yh.pod('webapp', 'logs', 'nginx:1.25', { app: 'webapp' })],
      tasks: [
        { id: '1', title: 'Pod `webapp` has containers `webapp` and `log-agent`', desc: '', hints: ['`kubectl get pod webapp -o yaml > webapp.yaml`, edit, `kubectl delete pod webapp`, `kubectl apply -f webapp.yaml`.', 'Or write the manifest from scratch with a heredoc.', 'Use `command: ["sh","-c","tail -f /var/log/nginx/access.log"]` for the sidecar.'], assert: [{ t: 'jp', ref: 'pod/webapp', ns: 'logs', path: '.spec.containers[*].name', has: 'log-agent' }] },
        { id: '2', title: 'Shared emptyDir volume `logs` mounted in both containers', desc: '', hints: ['`volumes: [{name: logs, emptyDir: {}}]`', 'Add `volumeMounts: [{name: logs, mountPath: /var/log/nginx}]` to BOTH containers.', 'Check `kubectl describe pod webapp | grep -A4 Mounts`.'], assert: [{ t: 'jp', ref: 'pod/webapp', ns: 'logs', path: '.spec.volumes[0].name', eq: 'logs' }, { t: 'jp', ref: 'pod/webapp', ns: 'logs', path: '.spec.containers[1].volumeMounts[0].mountPath', eq: '/var/log/nginx' }] },
        { id: '3', title: 'Pod Ready (2/2)', desc: '', hints: ['`kubectl get pod webapp` → READY 2/2', 'Logs: `kubectl logs webapp -c log-agent`'], assert: [{ t: 'podsReady', ns: 'logs', sel: 'app=webapp', min: 1 }] }
      ],
      solution: ['kubectl delete pod webapp --force', 'kubectl apply -f - <<EOF\napiVersion: v1\nkind: Pod\nmetadata:\n  name: webapp\n  labels:\n    app: webapp\nspec:\n  volumes:\n  - name: logs\n    emptyDir: {}\n  containers:\n  - name: webapp\n    image: nginx:1.25\n    volumeMounts:\n    - {name: logs, mountPath: /var/log/nginx}\n  - name: log-agent\n    image: busybox:1.36\n    command: ["sh","-c","tail -f /var/log/nginx/access.log"]\n    volumeMounts:\n    - {name: logs, mountPath: /var/log/nginx}\nEOF'] }
  ]);
})(typeof window !== 'undefined' ? window : globalThis);
