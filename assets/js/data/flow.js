/* Outage additions (paraphrased from cited primary write-ups) + troubleshooting flowcharts + risky-command patterns. */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {};
  KL.outages = KL.outages || [];
  KL.outages.push(
    { id: 'monzo-2017', org: 'Monzo', when: '27 Oct 2017', dur: '~1 h 21 min of cluster downtime', title: 'An empty endpoint list crashed the service mesh',
      src: [{ t: 'Monzo community: post-mortem by Oliver Beattie (head of engineering)', u: 'https://community.monzo.com/t/resolved-current-account-payments-may-fail-major-outage-27-10-2017/26296/95' }, { t: 'KubeCon EU 2018 keynote: “Anatomy of a Production Kubernetes Outage”', u: 'https://kccnceu18.sched.com/event/Dsan/keynote-anatomy-of-a-production-kubernetes-outage-oliver-beattie-head-of-engineering-monzo-bank' }],
      chain: [
        'About two weeks earlier the platform team upgraded etcd and grew it from three to nine nodes.',
        'A day before, a new service was deployed and then scaled down to zero replicas, leaving a Service with no pods behind it.',
        'On the day, the service mesh (linkerd) stopped receiving endpoint updates from Kubernetes and sent requests to IP addresses that no longer existed: a partial outage.',
        'Engineers restarted the mesh pods. The replacements could not start until the API servers were restarted too.',
        'Once started, the new mesh pods crashed with a null-pointer error: Kubernetes (1.6+) returned `null` instead of an empty list for a Service with no endpoints, which the mesh version in use could not parse. The partial outage became a platform-wide one.',
        'Deleting the empty Services let the mesh start. Monzo reported that the vast majority of payments still went through.'],
      cause: 'Several small bugs and version mismatches lined up: an etcd client problem, a mesh/Kubernetes incompatibility on empty endpoints, and a restart that exposed it.',
      spot: ['Test component version pairs (mesh, controllers, API) together, including the “zero endpoints” edge case.', 'Restarting everything is not a neutral action; know what a restart depends on first.', 'Practise failure on purpose (chaos tests) before production does it for you.'],
      labs: [['s04-no-endpoints', 'A Service with no endpoints: find out why and what depends on it.'], ['s84-service-ladder', 'Walk the Service → Endpoints → Pod ladder in order.'], ['s93-release-gone-wrong', 'A change goes out and the blast radius is wider than expected.']] },
    { id: 'zalando-2019', org: 'Zalando', when: '7 Jan 2019', dur: 'over 1 hour', title: 'Cluster DNS ran out of memory, all at once',
      src: [{ t: 'Zalando: “Total DNS outage in Kubernetes cluster” post-mortem', u: 'https://kubernetes-on-aws.readthedocs.io/en/latest/postmortems/jan-2019-dns-outage.html' }, { t: 'Kubernetes Failure Stories (index)', u: 'https://k8s.af/' }],
      chain: [
        'A spike in requests from the main aggregation service produced an equal spike in DNS queries to CoreDNS.',
        'The query spike drove CoreDNS memory up, and the pods hit their memory limit and were OOM-killed at the same moment.',
        'When they restarted, the constant high query load killed them again, so the whole cluster lost DNS.',
        'Missing monitoring delayed paging the on-call engineer.',
        'The engineer found the OOM kills and raised the CoreDNS memory request/limit from 100Mi to 2000Mi by hand.',
        'DNS came back, circuit breakers closed, and the store recovered. Product and outfit pages had been erroring for over an hour. (The failure-stories index also lists ndots:5 and HTTP retries as involved.)'],
      cause: 'A critical shared component had a small fixed memory limit and no automatic scaling, so a load spike turned into a crash loop for everyone.',
      spot: ['Size and autoscale shared infrastructure (CoreDNS) for spikes, not for averages.', 'Alert on OOMKilled and restarts of kube-system pods.', 'Make sure the paging path does not itself need the thing that broke.'],
      labs: [['s82-coredns-down', 'DNS down: confirm it from a pod, then restore CoreDNS.'], ['s03-oomkilled', 'Recognise an OOM kill and fix the limit.'], ['s86-qos-eviction', 'How limits and QoS decide who dies first.']] });

  /* Flowcharts: node = {q, cmd, opts:[[label,next]]}; leaf = {leaf:1, title, fix, lab, caution}. */
  KL.flows = [
    { id: 'pending', title: 'Pod stuck Pending', start: 'p1', nodes: {
      p1: { q: 'Does `kubectl describe pod` show a FailedScheduling event?', cmd: 'kubectl describe pod <pod> -n <ns>', opts: [['Yes', 'p2'], ['No events at all', 'p5']] },
      p2: { q: 'What does the event message say?', opts: [['Insufficient cpu / memory', 'p3'], ['untolerated taint', 'L_taint'], ['didn’t match node selector / affinity', 'L_sel'], ['unbound PersistentVolumeClaims', 'L_pvc']] },
      p3: { q: 'Is the request bigger than any single node can offer, or is the cluster simply full?', cmd: 'kubectl describe nodes | grep -A6 "Allocated resources"', opts: [['One pod request is too big', 'L_big'], ['Cluster is full', 'p4']] },
      p4: { q: 'Is a Cluster Autoscaler / node autoscaler installed and allowed to add nodes?', opts: [['Yes, but still Pending', 'L_ca'], ['No autoscaler', 'L_full']] },
      p5: { q: 'Is the namespace over quota or are priorities involved?', cmd: 'kubectl describe quota -n <ns>', opts: [['Quota exhausted / forbidden', 'L_quota'], ['Quota is fine', 'L_prio']] },
      L_taint: { leaf: 1, title: 'Taint not tolerated', fix: 'Add a matching toleration, or schedule on a node without the taint. Check `kubectl describe node | grep Taints`.', lab: 's35-taint-toleration', caution: 'Do not remove a taint on a shared node just to get your pod running: it may be protecting that node on purpose.' },
      L_sel: { leaf: 1, title: 'Selector or affinity matches no node', fix: 'Compare `nodeSelector`/affinity with `kubectl get nodes --show-labels`; fix the pod spec or label the node.', lab: 's34-nodeselector', caution: 'Labelling nodes on a real cluster changes scheduling for everyone who selects on that label.' },
      L_pvc: { leaf: 1, title: 'Claim not bound', fix: 'Describe the PVC: wrong StorageClass, no matching PV, or access mode mismatch.', lab: 's13-pvc-pending', caution: 'Never delete a PVC or PV to “unstick” it before checking the reclaim policy: you can lose the data.' },
      L_big: { leaf: 1, title: 'Request larger than any node', fix: 'Lower the request or use a bigger node. Check actual use with `kubectl top` before choosing a number.', lab: 's87-rightsizing', caution: 'Cutting requests too far trades Pending for throttling and OOM kills. Use measured values.' },
      L_ca: { leaf: 1, title: '“Pending even with autoscaling”', fix: 'Check why the autoscaler did not scale: node group at its max size, pod requests larger than the largest node type, a selector/taint no new node would satisfy, a quota on the cloud account, or a PodDisruptionBudget/annotation blocking scale-down churn. The autoscaler logs state the reason per pod.', lab: 's94-capacity-crunch', caution: 'Raising max nodes costs money immediately. Confirm limits and budget before changing them.' },
      L_full: { leaf: 1, title: 'Cluster full, nothing to add capacity', fix: 'Add a node, free capacity, or let higher-priority pods preempt lower ones (PriorityClass).', lab: 's85-priority-preemption', caution: 'Preemption evicts running pods. Do not give batch work a high priority by accident.' },
      L_quota: { leaf: 1, title: 'Quota exhausted', fix: 'Reduce usage or raise the ResourceQuota (with the owner’s approval). Errors appear on the ReplicaSet/Job, not the pod.', lab: 's15-quota-limits', caution: 'Quotas are a guardrail. Raising them silently defeats capacity planning.' },
      L_prio: { leaf: 1, title: 'Look wider', fix: 'Check events at namespace level (`kubectl get events -n <ns> --sort-by=.lastTimestamp`), admission webhooks, and whether the scheduler itself is healthy.', lab: 's72-dead-webhook', caution: 'Deleting a webhook configuration disables a policy control. Fix the webhook backend first if you can.' } } },

    { id: 'crash', title: 'Pod restarting or not Ready', start: 'c1', nodes: {
      c1: { q: 'What is the pod status?', cmd: 'kubectl get pod <pod> -n <ns>', opts: [['ImagePullBackOff / ErrImagePull', 'L_img'], ['CrashLoopBackOff', 'c2'], ['Running but 0/1 Ready', 'L_ready'], ['CreateContainerConfigError', 'L_cfg']] },
      c2: { q: 'What does the last state say?', cmd: 'kubectl describe pod <pod> | grep -A6 "Last State"', opts: [['OOMKilled', 'L_oom'], ['Exit code 1 / error in logs', 'c3'], ['Restarts every ~N seconds with no app error', 'L_probe']] },
      c3: { q: 'Do the previous logs show the reason?', cmd: 'kubectl logs <pod> --previous', opts: [['Missing env var / config / file', 'L_cfg'], ['App bug', 'L_bug']] },
      L_img: { leaf: 1, title: 'Image cannot be pulled', fix: 'Check the image name and tag, and the pull secret if the registry is private.', lab: 's02-imagepull', caution: 'Do not paste real registry passwords into the terminal or a shared manifest. Create the secret from a file or a secure store.' },
      L_oom: { leaf: 1, title: 'Out of memory', fix: 'Compare the memory limit with real use; raise the limit or fix the leak.', lab: 's03-oomkilled', caution: 'Raising limits everywhere hides leaks and can starve neighbours on the node.' },
      L_probe: { leaf: 1, title: 'Probe is killing a healthy app', fix: 'Check the liveness path/port and the initial delay; a too-strict probe restarts a slow starter.', lab: 's08-probes', caution: 'Removing a liveness probe fixes the symptom but also removes self-healing.' },
      L_cfg: { leaf: 1, title: 'Config or secret missing', fix: 'The referenced ConfigMap/Secret or key does not exist in this namespace.', lab: 's32-cm-env-missing', caution: 'Do not print secrets with `kubectl get secret -o yaml` in shared screens or tickets: values are only base64.' },
      L_ready: { leaf: 1, title: 'Readiness failing', fix: 'The pod runs but is excluded from the Service. Check the readiness probe and port, then `kubectl get endpoints`.', lab: 's04-no-endpoints', caution: 'Loosening readiness lets broken pods receive traffic.' },
      L_bug: { leaf: 1, title: 'Application error', fix: 'Roll back to the last good revision, then debug at leisure.', lab: 's06-rollout-rollback', caution: 'Rolling back also reverts config in that revision: check the diff first with `kubectl rollout history`.' } } },

    { id: 'svc', title: 'Service not reachable', start: 's1', nodes: {
      s1: { q: 'Does the Service have endpoints?', cmd: 'kubectl get endpoints <svc> -n <ns>', opts: [['<none>', 's2'], ['Yes, addresses listed', 's3']] },
      s2: { q: 'Do the Service selector and the pod labels match, and are the pods Ready?', cmd: 'kubectl get pods -n <ns> --show-labels', opts: [['Labels differ', 'L_sel'], ['Labels match but pods not Ready', 'L_ready']] },
      s3: { q: 'Does the Service port map to the container port (targetPort)?', cmd: 'kubectl describe svc <svc> -n <ns>', opts: [['Wrong targetPort', 'L_tp'], ['Ports are right', 's4']] },
      s4: { q: 'Does it fail by name (DNS) or by IP?', cmd: 'kubectl exec <pod> -- nslookup <svc>', opts: [['Name fails, IP works', 'L_dns'], ['Both fail', 'L_np']] },
      L_sel: { leaf: 1, title: 'Selector mismatch', fix: 'Fix the labels or the selector so they match exactly.', lab: 's04-no-endpoints', caution: 'Editing live Service selectors affects traffic immediately. Prefer changing manifests and applying them.' },
      L_ready: { leaf: 1, title: 'Backends not Ready', fix: 'Pods are excluded until readiness passes; fix the probe or the app.', lab: 's84-service-ladder', caution: '' },
      L_tp: { leaf: 1, title: 'Wrong targetPort', fix: 'Point targetPort at the port the container listens on.', lab: 's29-svc-targetport', caution: '' },
      L_dns: { leaf: 1, title: 'DNS problem', fix: 'Check that CoreDNS pods are Running and the kube-dns Service has endpoints.', lab: 's82-coredns-down', caution: 'Restarting CoreDNS briefly drops name resolution for the whole cluster. Do it off-peak.' },
      L_np: { leaf: 1, title: 'Probably a NetworkPolicy', fix: 'List policies in both namespaces; a default-deny with no matching allow blocks traffic.', lab: 's12-netpol-isolate', caution: 'Deleting a NetworkPolicy to “test” opens traffic you meant to restrict. Add a narrow allow instead.' } } },

    { id: 'node', title: 'Node NotReady', start: 'n1', nodes: {
      n1: { q: 'What are the node conditions?', cmd: 'kubectl describe node <node> | grep -A8 Conditions', opts: [['Ready=Unknown / kubelet stopped posting', 'n2'], ['DiskPressure / MemoryPressure true', 'L_press'], ['NetworkUnavailable', 'L_net']] },
      n2: { q: 'On the node, is the kubelet running?', cmd: 'ssh <node> "sudo systemctl status kubelet"', opts: [['Stopped or crash-looping', 'n3'], ['Running, but cannot reach the API', 'L_cert']] },
      n3: { q: 'What do the kubelet logs say?', cmd: 'ssh <node> "sudo journalctl -u kubelet -n 30"', opts: [['swap is enabled', 'L_swap'], ['Just stopped', 'L_start']] },
      L_swap: { leaf: 1, title: 'Swap enabled', fix: 'Turn swap off and restart the kubelet; also remove it from fstab so a reboot does not bring it back.', lab: 's71-kubelet-swap', caution: 'Check the node is not hosting something that relies on swap. Drain first on a real cluster.' },
      L_start: { leaf: 1, title: 'Kubelet stopped', fix: 'Start the kubelet and confirm the node returns to Ready.', lab: 's70-kubelet-down', caution: 'Pods were possibly already rescheduled elsewhere; expect brief duplicates of stateful workloads.' },
      L_press: { leaf: 1, title: 'Resource pressure', fix: 'Free disk (logs, unused images) or find the memory hog; pods get evicted until pressure clears.', lab: 's81-disk-pressure', caution: 'Never run `rm -rf` on /var/lib on a node: you can destroy container state. Use crictl/journalctl vacuum.' },
      L_net: { leaf: 1, title: 'Network plugin not ready', fix: 'Check the CNI DaemonSet pod on that node and the node’s routes.', lab: 's95-pi-day-replay', caution: 'Flushing iptables/routes on a node can cut it off entirely.' },
      L_cert: { leaf: 1, title: 'Credentials problem', fix: 'Check certificate expiry (`kubeadm certs check-expiration`) and renew.', lab: 's73-expired-certs', caution: 'Back up /etc/kubernetes before renewing, and never share the resulting kubeconfig or tokens.' } } },

    { id: 'scale', title: 'Autoscaling is not scaling', start: 'a1', nodes: {
      a1: { q: 'Which autoscaler is not acting?', opts: [['HPA (pods)', 'a2'], ['Cluster Autoscaler (nodes)', 'a5']] },
      a2: { q: 'What does `kubectl get hpa` show for TARGETS?', cmd: 'kubectl get hpa -n <ns>', opts: [['<unknown>/…', 'L_metrics'], ['A number, but replicas stay put', 'a3']] },
      a3: { q: 'Is the HPA already at maxReplicas?', opts: [['Yes', 'L_max'], ['No, but new pods stay Pending', 'a4']] },
      a4: { q: 'Is the namespace quota or node capacity the limit?', opts: [['Quota', 'L_hq'], ['Node capacity', 'a5']] },
      a5: { q: 'Would a new node satisfy the pending pod (size, labels, taints, zone)?', opts: [['No', 'L_shape'], ['Yes, but the node group is at max', 'L_cap']] },
      L_metrics: { leaf: 1, title: 'No metrics', fix: 'The HPA needs metrics-server and CPU requests on the pods; without requests the percentage is undefined.', lab: 's45-hpa-wrong-target', caution: '' },
      L_max: { leaf: 1, title: 'At maxReplicas', fix: 'It is working as configured. Raise maxReplicas only if the dependencies behind it can take the load.', lab: 's16-hpa', caution: 'Scaling a frontend up can overload its database. Check downstream limits first.' },
      L_hq: { leaf: 1, title: 'HPA blocked by quota', fix: 'Replicas are created but the quota rejects them. See errors on the ReplicaSet.', lab: 's88-hpa-vs-quota', caution: 'Raising quota is a policy decision, not just a number.' },
      L_shape: { leaf: 1, title: 'New node would not fit the pod', fix: 'The pod asks for more than any node type offers, or needs a label/taint no new node carries.', lab: 's94-capacity-crunch', caution: '' },
      L_cap: { leaf: 1, title: 'Node group at its limit', fix: 'Raise the group maximum or add a new group.', lab: 's94-capacity-crunch', caution: 'More nodes means a bigger bill straight away. Confirm cost approval.' } } }
  ];

  /* Risky command patterns: [regex, plain-language caution] — guidance only, not a security control. */
  KL.risky = [
    [/\bkubectl\s+delete\b.*(--all\b|-A\b|--all-namespaces)/, 'Deleting “all” can wipe a whole namespace or cluster. Run the same command with `get` first to see what matches.'],
    [/\bkubectl\s+delete\b.*(--force|--grace-period=0)/, 'Force-deleting skips graceful shutdown. For stateful pods it can corrupt data or run two copies at once.'],
    [/\bkubectl\s+delete\s+(ns|namespace)\b/, 'Deleting a namespace deletes everything in it, including volumes’ claims. Confirm your current context first.'],
    [/\bkubectl\s+drain\b/, 'Drain evicts pods from the node. Check PodDisruptionBudgets and that other nodes have room. Cordon first if unsure.'],
    [/\bkubeadm\s+reset\b/, 'kubeadm reset wipes the node’s cluster state. Only run it on a node you intend to rebuild.'],
    [/finalizers.*null|"finalizers"\s*:\s*\[\s*\]/, 'Removing finalizers skips cleanup the owner expected (for example, external storage). Find what holds it first.'],
    [/\brm\s+-[a-z]*r[a-z]*f?\b|\brm\s+-rf\b/, '`rm -rf` is irreversible. On a node, never remove /var/lib or /etc/kubernetes by hand.'],
    [/\bkubectl\s+apply\s+-f\s+https?:/, 'Applying a manifest straight from a URL runs whatever the URL serves today. Download, read, then apply.'],
    [/\bkubectl\s+(auth\s+reconcile|create\s+(clusterrolebinding|rolebinding))\b.*cluster-admin/, 'cluster-admin grants full control. Prefer a narrow Role and test with `kubectl auth can-i --as=…`.'],
    [/\bkubectl\s+get\s+secrets?\b.*-o\s*(yaml|json|jsonpath)/, 'Secret values are only base64: anyone who sees the output can read them. Do not paste it into tickets or chat.'],
    [/\bkubectl\s+config\s+(use-context|set-context)\b/, 'Check `kubectl config current-context` before destructive commands: the wrong context is how staging commands hit production.'],
    [/\bkubectl\s+replace\s+--force\b/, '`replace --force` deletes and recreates the object, restarting its pods.'],
    [/\bkubectl\s+(taint|cordon)\b/, 'This changes where pods can run on a shared node. Make sure nothing depends on it.'],
    [/\betcdctl\s+.*(snapshot\s+restore|del\b)/, 'Restoring or deleting in etcd rewrites cluster state. Back up first and stop the API server before a restore.']
  ];
  KL.secretPatterns = [
    [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/, 'a JWT / service-account token'],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'a private key'],
    [/\bAKIA[0-9A-Z]{16}\b/, 'an AWS access key id'],
    [/\bgh[pousr]_[A-Za-z0-9]{30,}\b/, 'a GitHub token'],
    [/client-key-data:\s*\S{20,}|client-certificate-data:\s*\S{20,}/, 'kubeconfig credentials']
  ];
})(typeof window !== 'undefined' ? window : globalThis);
