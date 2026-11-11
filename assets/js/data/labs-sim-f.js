/* Real-world failure library S69–S73: stuck finalizers, dead kubelet, swap, a dead admission webhook, expired certificates.
   Simulator-only (they need node/ssh/webhook behaviour a kind pack cannot reproduce faithfully). */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {}, Labs = KL.Labs || require('../labs-engine.js'), Yh = Labs.y;
  function T(title, hints, assert, desc) { return { id: '', title: title, desc: desc || '', hints: hints, assert: assert }; }
  function L(o) { o.tasks.forEach(function (t, i) { t.id = String(i + 1); }); o.simOnly = true; o.failure = true; return o; }
  var NS = function (n, labels) { return 'apiVersion: v1\nkind: Namespace\nmetadata:\n  name: ' + n + (labels ? '\n  labels:\n' + Object.keys(labels).map(function (k) { return '    ' + k + ': ' + labels[k]; }).join('\n') : '') + '\n'; };
  var WEBHOOK = 'apiVersion: admissionregistration.k8s.io/v1\nkind: ValidatingWebhookConfiguration\nmetadata:\n  name: policy-guard\nwebhooks:\n- name: pods.policy.example.com\n  failurePolicy: Fail\n  timeoutSeconds: 10\n  sideEffects: None\n  admissionReviewVersions: ["v1"]\n  namespaceSelector:\n    matchExpressions:\n    - key: policy-hook\n      operator: NotIn\n      values: ["skip"]\n  rules:\n  - apiGroups: [""]\n    apiVersions: ["v1"]\n    operations: ["CREATE"]\n    resources: ["pods"]\n  clientConfig:\n    service:\n      name: policy-hook\n      namespace: policy\n      path: /validate\n      port: 443\n';
  Labs.register([
    L({ id: 's69-stuck-terminating', num: 'S69', title: 'Namespace stuck in Terminating', diff: 'Intermediate', track: ['CKA', 'CKAD'], domain: 'Troubleshooting', time: '10 min', ns: 'legacy',
      story: 'Someone ran `kubectl delete ns legacy` an hour ago. It still shows Terminating. An old controller that owned a finalizer was uninstalled, so nothing will ever clear it. Find what is holding the namespace and free it — without touching `keep`.',
      setup: [NS('legacy'), NS('keep'), 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: stuck\n  namespace: legacy\n  finalizers:\n  - example.com/cleanup\ndata:\n  a: "1"\n', Yh.dep('safe', 'keep', 'nginx:1.25', 1)],
      setupCmds: ['kubectl delete ns legacy'],
      tasks: [T('Find what blocks the namespace', ['`kubectl get ns legacy -o yaml` — read `status.conditions`.', 'Look for `NamespaceFinalizersRemaining`.', '`kubectl get all,cm -n legacy`'], [{ t: 'exists', ref: 'namespace/keep', ns: '' }], 'Read the namespace conditions. The check only confirms `keep` is still intact.'),
        T('Clear the finalizer on the ConfigMap', ['`kubectl patch cm stuck -n legacy --type=merge -p \'{"metadata":{"finalizers":null}}\'`', 'Only remove a finalizer when its owner is gone.', '`kubectl get cm stuck -n legacy -o yaml`'], [{ t: 'absent', ref: 'configmap/stuck', ns: 'legacy' }]),
        T('Namespace gone, keep untouched', ['Once the last object goes, the namespace finishes deleting.', '`kubectl get ns`', 'Never patch `keep`.'], [{ t: 'absent', ref: 'namespace/legacy', ns: '' }, { t: 'podsReady', ns: 'keep', sel: 'app=safe', min: 1 }])],
      solution: ['kubectl get ns legacy -o yaml', 'kubectl get cm -n legacy', 'kubectl patch cm stuck -n legacy --type=merge -p \'{"metadata":{"finalizers":null}}\'', 'kubectl get ns'] }),

    L({ id: 's70-kubelet-down', num: 'S70', title: 'Node NotReady: kubelet stopped', diff: 'Intermediate', track: ['CKA'], domain: 'Troubleshooting', time: '10 min', ns: 'shop',
      story: '`worker2` dropped to NotReady and its pods stopped being ready. Nobody changed anything in the cluster. Check the node, then log in and fix the node agent.',
      setup: [NS('shop'), Yh.dep('web', 'shop', 'nginx:1.25', 3)], setupCmds: [], flags: { kubeletDown: { worker2: true } },
      tasks: [T('Identify the broken node', ['`kubectl get nodes`', '`kubectl describe node worker2` — see Conditions.', 'Ready=Unknown means the kubelet stopped reporting.'], [{ t: 'exists', ref: 'node/worker2', ns: '' }]),
        T('Restart the kubelet on worker2', ['`ssh worker2 \'sudo systemctl status kubelet\'`', '`ssh worker2 \'sudo systemctl start kubelet\'`', 'Check `journalctl -u kubelet` if it does not stay up.'], [{ t: 'flag', k: 'kubeletDown', sub: 'worker2', v: false, msg: 'kubelet on worker2 should be running' }]),
        T('All web pods Ready again', ['Give the node a moment to report.', '`kubectl get pods -n shop -o wide`', 'Node conditions recover first, then pod readiness.'], [{ t: 'podsReady', ns: 'shop', sel: 'app=web', min: 3 }])],
      solution: ['kubectl get nodes', 'kubectl describe node worker2', 'ssh worker2 \'sudo systemctl status kubelet\'', 'ssh worker2 \'sudo systemctl start kubelet\'', 'kubectl get nodes'] }),

    L({ id: 's71-kubelet-swap', num: 'S71', title: 'Kubelet crash-loops after a reboot', diff: 'Advanced', track: ['CKA'], domain: 'Troubleshooting', time: '12 min', ns: 'shop',
      story: '`worker1` was rebooted for patching and never came back Ready. Restarting the kubelet does nothing — it dies again in seconds. Read its logs on the node and fix the root cause.',
      setup: [NS('shop'), Yh.dep('web', 'shop', 'nginx:1.25', 2)], setupCmds: [], flags: { kubeletDown: { worker1: true }, swapOn: { worker1: true } },
      tasks: [T('Read the kubelet logs on worker1', ['`ssh worker1 \'journalctl -u kubelet\'`', '`ssh worker1 \'sudo systemctl status kubelet\'` shows auto-restart.', 'The error names the cause.'], [{ t: 'exists', ref: 'node/worker1', ns: '' }]),
        T('Turn swap off', ['`ssh worker1 \'sudo swapoff -a\'`', 'Persist it by removing the swap line from /etc/fstab (not modelled here).', '`ssh worker1 \'free -m\'` should show Swap: 0.'], [{ t: 'flag', k: 'swapOn', sub: 'worker1', v: false, msg: 'swap on worker1 should be off' }]),
        T('Restart the kubelet; node Ready', ['`ssh worker1 \'sudo systemctl restart kubelet\'`', '`kubectl get nodes`', 'Restart only works after the cause is fixed.'], [{ t: 'flag', k: 'kubeletDown', sub: 'worker1', v: false, msg: 'kubelet on worker1 should be running' }, { t: 'podsReady', ns: 'shop', sel: 'app=web', min: 2 }])],
      solution: ['ssh worker1 \'journalctl -u kubelet\'', 'ssh worker1 \'sudo swapoff -a\'', 'ssh worker1 \'sudo systemctl restart kubelet\'', 'kubectl get nodes'] }),

    L({ id: 's72-dead-webhook', num: 'S72', title: 'Pods will not create: dead admission webhook', diff: 'Advanced', track: ['CKA', 'CKAD'], domain: 'Troubleshooting', time: '12 min', ns: 'shop',
      story: 'After a node upgrade the `web` Deployment in `shop` cannot create pods. Events say `failed calling webhook`. The policy webhook\'s backend is down and its `failurePolicy` is `Fail`, so every pod create is rejected. Restore service without deleting the policy.',
      setup: [NS('policy', { 'policy-hook': 'skip' }), NS('shop'), Yh.dep('policy-hook', 'policy', 'nginx:1.25', 1),
        'apiVersion: v1\nkind: Service\nmetadata:\n  name: policy-hook\n  namespace: policy\nspec:\n  selector:\n    app: policy-hook\n  ports:\n  - port: 443\n    targetPort: 80\n'],
      setupCmds: ['kubectl scale deploy policy-hook -n policy --replicas=0', 'kubectl apply -f - <<EOF\n' + WEBHOOK + 'EOF', 'kubectl create deployment web --image=nginx:1.25 --replicas=2 -n shop'],
      tasks: [T('Find why pods are rejected', ['`kubectl get events -n shop --sort-by=.lastTimestamp`', '`kubectl describe rs -n shop`', 'The webhook Service `policy-hook` in `policy` has no endpoints.'], [{ t: 'exists', ref: 'validatingwebhookconfiguration/policy-guard', ns: '' }]),
        T('Restore the webhook backend', ['`kubectl get deploy,endpoints -n policy`', '`kubectl scale deploy policy-hook -n policy --replicas=1`', 'Its own namespace is exempt via the `policy-hook=skip` label, otherwise it could never start.'], [{ t: 'podsReady', ns: 'policy', sel: 'app=policy-hook', min: 1 }]),
        T('web pods Ready, policy still enforced', ['The ReplicaSet retries on its own.', '`kubectl get pods -n shop`', 'Do not delete `policy-guard` just to get unblocked.'], [{ t: 'podsReady', ns: 'shop', sel: 'app=web', min: 2 }, { t: 'exists', ref: 'validatingwebhookconfiguration/policy-guard', ns: '' }])],
      solution: ['kubectl get events -n shop', 'kubectl get endpoints -n policy', 'kubectl scale deploy policy-hook -n policy --replicas=1', 'kubectl get pods -n shop'] }),

    L({ id: 's73-expired-certs', num: 'S73', title: 'kubectl: certificate has expired', diff: 'Advanced', track: ['CKA'], domain: 'Cluster', time: '12 min', ns: 'shop',
      story: 'Every `kubectl` call now fails with an x509 expiry error — the control-plane certificates reached their one-year limit. Log in to the control-plane node, check, renew, and restart the components so the API comes back.',
      setup: [NS('shop'), Yh.dep('web', 'shop', 'nginx:1.25', 2)], setupCmds: [], flags: { certExpired: true },
      tasks: [T('Check certificate expiry on cp1', ['`ssh cp1 \'sudo kubeadm certs check-expiration\'`', 'kubectl itself is dead, so use ssh.', 'Look for `<invalid>` residual time.'], [{ t: 'exists', ref: 'node/cp1', ns: '' }]),
        T('Renew all certificates', ['`ssh cp1 \'sudo kubeadm certs renew all\'`', 'Renewal alone is not enough — read the last line of output.', 'Check again with check-expiration.'], [{ t: 'flag', k: 'certsRenewed', v: true, msg: 'certificates should be renewed' }]),
        T('Restart control-plane components; kubectl works', ['The static pods must reload the new certs.', '`ssh cp1 \'sudo systemctl restart kubelet\'` (kubelet restarts the static pods).', '`kubectl get nodes` should answer again.'], [{ t: 'flag', k: 'certExpired', v: false, msg: 'API server should accept connections again' }, { t: 'podsReady', ns: 'shop', sel: 'app=web', min: 2 }])],
      solution: ['ssh cp1 \'sudo kubeadm certs check-expiration\'', 'ssh cp1 \'sudo kubeadm certs renew all\'', 'ssh cp1 \'sudo systemctl restart kubelet\'', 'kubectl get nodes'] })
  ]);
})(typeof window !== 'undefined' ? window : globalThis);
