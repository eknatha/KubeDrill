/* Field Guide content: verified outage explainers, fictional "3 a.m. page" stories, concept animations. */
(function (root) {
  'use strict';
  var KL = root.KL = root.KL || {};
  // Facts below come only from the cited primary write-ups (checked while building). Wording is paraphrased.
  KL.outages = [
    { id: 'reddit-2023', org: 'Reddit', when: '14 Mar 2023', dur: '314 minutes', title: 'The Pi-Day outage: one renamed label',
      src: [{ t: 'Reddit engineering: “You Broke Reddit: The Pi-Day Outage”', u: 'https://www.reddit.com/r/RedditEng/comments/11xx5o0/you_broke_reddit_the_piday_outage/' }],
      chain: [
        'The team upgraded their oldest, largest cluster from Kubernetes 1.23 to 1.24.',
        'Kubernetes had renamed the control-plane node label from “master” to “control-plane” (started in the 1.20 series) and removed the old references in 1.24.',
        'The cluster’s Calico route-reflector configuration selected nodes by the old `node-role.kubernetes.io/master` label, so after the upgrade it no longer matched the intended nodes.',
        'calico-node dropped routes to all nodes, not just upgraded ones: cluster-wide networking and DNS failures, slow pod starts and image pulls.',
        'Along the way the API server saw timeouts calling OPA admission webhooks; deleting those webhook configs stopped the timeouts but did not fix the cluster.',
        'Kubernetes has no supported downgrade, so they restored from backup. Rejoining control-plane nodes failed until TLS certificates were regenerated. Traffic was ramped 1% → 100%.'],
      cause: 'An undocumented dependency on a deprecated label, in a config that was not kept in version control.',
      spot: ['Grep your manifests for deprecated labels/APIs before every upgrade.', 'Rehearse upgrades on a clone of the oldest cluster.', 'Keep CNI/route-reflector config in Git.'],
      labs: [['s04-no-endpoints', 'A selector that matches nothing — the same mechanism, at Service scale.'], ['s72-dead-webhook', 'Admission webhooks on the write path can freeze a cluster.'], ['s73-expired-certs', 'TLS certificates had to be regenerated to rejoin control-plane nodes.']] },
    { id: 'datadog-2023', org: 'Datadog', when: '8 Mar 2023', dur: 'multi-hour, 5 regions', title: 'An OS security patch removed the CNI’s routes',
      src: [{ t: 'Datadog: 2023-03-08 incident — connectivity issue affecting multiple regions', u: 'https://www.datadoghq.com/blog/2023-03-08-multiregion-infrastructure-connectivity-issue/' }, { t: 'Datadog: deep dive into the platform-level impact', u: 'https://www.datadoghq.com/blog/engineering/2023-03-08-deep-dive-into-platform-level-impact/' }],
      chain: [
        'At 06:00 UTC a systemd security update was applied automatically to many VMs (Ubuntu 22.04).',
        'The update restarted systemd-networkd, which on that version flushes IP rules it does not know about.',
        'That removed the routes managed by the Cilium CNI plugin, so affected nodes went offline.',
        'Fresh or rebooted nodes did not show the behaviour, because systemd-networkd starts before the CNI installs its rules — only a restart on a running node triggered it.',
        'Impact covered the US1, EU1, US3, US4 and US5 regions across all services.',
        'Mitigation: disable the legacy auto-update channel and configure systemd-networkd to leave the routing table alone on restart.'],
      cause: 'Two tools both thought they owned the node’s routing rules; an automatic OS update exposed it everywhere at once.',
      spot: ['Know which component owns routes/iptables on a node.', 'Stage OS updates; do not let a whole fleet patch in the same minute.', 'Test “restart the daemon on a running node”, not just “boot a new node”.'],
      labs: [['s70-kubelet-down', 'A node goes NotReady — practise the node-first triage.'], ['s71-kubelet-swap', 'A node agent that dies after a change; read the logs on the node.'], ['s17-drain-cordon', 'Take a sick node out of rotation safely.']] },
    { id: 'openai-2024', org: 'OpenAI', when: '11 Dec 2024', dur: '3:16–7:38 PM PST', title: 'A telemetry rollout overloaded the control plane',
      src: [{ t: 'OpenAI status: December 11 2024 incident write-up', u: 'https://status.openai.com/incidents/ctrsv3lwd797' }],
      chain: [
        'At 3:12 PM PST a new telemetry service was deployed to collect detailed Kubernetes control-plane metrics.',
        'Its configuration unintentionally caused resource-intensive Kubernetes API operations across very many nodes at once.',
        'The Kubernetes API servers in large clusters were overwhelmed.',
        'The data plane can mostly run without the control plane, but DNS-based service discovery depended on it, so services could no longer find each other.',
        'Fixing it required removing the telemetry service, which itself needed access to the overloaded control plane.',
        'Services were unavailable from 3:16 PM to 7:38 PM PST.'],
      cause: 'A wide-footprint agent hammered the API servers, and DNS service discovery turned a control-plane problem into a full outage.',
      spot: ['Roll new cluster-wide agents out gradually and watch control-plane health, not just the agent.', 'Know which data-plane functions secretly depend on the API server.', 'Keep a break-glass path to the control plane.'],
      labs: [['s73-expired-certs', 'When kubectl itself is dead you must fix things from the node.'], ['s72-dead-webhook', 'Another control-plane dependency that can block everything.']] }
  ];

  KL.stories = [
    { id: 'ep1', title: 'Episode 1 — The Friday Deploy', blurb: 'A release at 16:55 on a Friday. Of course.', chapters: [
      { lab: 's06-rollout-rollback', time: '02:47', page: 'PagerDuty: checkout 5xx > 20% for 5 min. Last change: deploy 11 minutes ago.', note: 'The new version is crash-looping. Stop the bleeding first.' },
      { lab: 's04-no-endpoints', time: '03:12', page: 'Slack: “checkout is up but the storefront still can’t reach it.”', note: 'Pods are healthy; the Service is not sending traffic anywhere.' },
      { lab: 's08-probes', time: '03:40', page: 'Alert: pods restarting every 90 seconds, no errors in app logs.', note: 'The app is fine. Something is killing it.' }] },
    { id: 'ep2', title: 'Episode 2 — The Node That Went Quiet', blurb: 'One worker stops talking. Then another.', chapters: [
      { lab: 's70-kubelet-down', time: '01:58', page: 'Alert: node worker2 NotReady for 4 minutes. Pods on it are not ready.', note: 'Nothing changed in the cluster. Look at the node itself.' },
      { lab: 's71-kubelet-swap', time: '02:35', page: 'Maintenance reboot finished on worker1 but it never rejoined.', note: 'The kubelet restarts and dies again. Read the logs.' },
      { lab: 's17-drain-cordon', time: '03:20', page: 'Platform lead: “before we touch worker1 again, move the workloads off safely.”', note: 'Cordon and drain without dropping traffic.' }] },
    { id: 'ep3', title: 'Episode 3 — The Silent Block', blurb: 'Nothing is crashing. Nothing is getting created either.', chapters: [
      { lab: 's72-dead-webhook', time: '03:02', page: 'Alert: Deployment web has 0 of 2 pods; ReplicaSet events mention “failed calling webhook”.', note: 'Every pod create is being rejected.' },
      { lab: 's69-stuck-terminating', time: '03:41', page: 'Ticket: namespace legacy has been Terminating since yesterday.', note: 'Something holds it open. Find it without nuking anything else.' },
      { lab: 's73-expired-certs', time: '04:15', page: 'Every kubectl call fails with x509: certificate has expired.', note: 'The API is fine. Your credentials to it are not.' }] }
  ];

  function act(on, note, extra) { var n = ['kubectl', 'API server', 'etcd', 'Controllers', 'Scheduler', 'kubelet', 'Pod']; return { items: n.map(function (x, i) { return { l: x, c: on.indexOf(i) >= 0 ? 'hot' : '' }; }), note: note, extra: extra }; }
  KL.concepts = [
    { id: 'apply', title: 'What happens on kubectl apply', steps: [
      Object.assign(act([0, 1], 'kubectl sends your manifest to the API server, which authenticates you, checks RBAC and validates the object.'), { t: '1 · Request' }),
      Object.assign(act([1, 2], 'The API server stores the desired state in etcd. Nothing is running yet — only a record exists.'), { t: '2 · Persist' }),
      Object.assign(act([3], 'The Deployment controller creates a ReplicaSet; that controller creates Pod objects. They show as Pending with no node.'), { t: '3 · Controllers react' }),
      Object.assign(act([4], 'The scheduler picks a node for each Pending pod (resources, taints, affinity) and writes the binding.'), { t: '4 · Schedule' }),
      Object.assign(act([5, 6], 'The kubelet on that node sees the pod, pulls the image, starts containers and runs the probes.'), { t: '5 · Run' }),
      Object.assign(act([5, 1], 'The kubelet reports status back through the API server. Now kubectl get pods shows Running.'), { t: '6 · Report' })] },
    { id: 'pod', title: 'Pod lifecycle: where it can get stuck', steps: [
      { t: 'Pending', items: [{ l: 'Pending', c: 'hot' }, { l: 'Creating', c: '' }, { l: 'Running', c: '' }, { l: 'Terminating', c: '' }], note: 'Not scheduled yet. Stuck here? Check events: insufficient CPU/memory, taints, node selectors, unbound PVC.' },
      { t: 'ContainerCreating', items: [{ l: 'Pending', c: 'dim' }, { l: 'Creating', c: 'hot' }, { l: 'Running', c: '' }, { l: 'Terminating', c: '' }], note: 'Scheduled; kubelet is pulling the image and mounting volumes. Stuck? ImagePullBackOff, missing Secret/ConfigMap, volume mount errors.' },
      { t: 'Running', items: [{ l: 'Pending', c: 'dim' }, { l: 'Creating', c: 'dim' }, { l: 'Running', c: 'hot' }, { l: 'Terminating', c: '' }], note: 'Containers started. Ready only when the readiness probe passes; CrashLoopBackOff and OOMKilled show up here.' },
      { t: 'Terminating', items: [{ l: 'Pending', c: 'dim' }, { l: 'Creating', c: 'dim' }, { l: 'Running', c: 'dim' }, { l: 'Terminating', c: 'hot' }], note: 'SIGTERM, grace period, then SIGKILL. Stuck? A finalizer or a node that stopped reporting.' }] },
    { id: 'roll', title: 'Rolling update behind a Service', steps: [
      { t: 'Steady state', items: [{ l: 'v1', c: 'ok' }, { l: 'v1', c: 'ok' }, { l: 'v1', c: 'ok' }], note: 'The Service selects pods by label and sends traffic only to Ready pods (its endpoints).' },
      { t: 'Surge', items: [{ l: 'v1', c: 'ok' }, { l: 'v1', c: 'ok' }, { l: 'v1', c: 'ok' }, { l: 'v2', c: 'wait' }], note: 'maxSurge lets one extra pod start. The new pod is not in the endpoints until its readiness probe passes.' },
      { t: 'Swap', items: [{ l: 'v1', c: 'ok' }, { l: 'v1', c: 'ok' }, { l: 'v1', c: 'dim' }, { l: 'v2', c: 'ok' }], note: 'Once v2 is Ready an old pod is terminated. Capacity never drops below replicas − maxUnavailable.' },
      { t: 'Repeat', items: [{ l: 'v2', c: 'ok' }, { l: 'v2', c: 'ok' }, { l: 'v1', c: 'dim' }, { l: 'v2', c: 'ok' }], note: 'The controller repeats until all pods are v2. If v2 never becomes Ready the rollout stalls — kubectl rollout undo.' },
      { t: 'Done', items: [{ l: 'v2', c: 'ok' }, { l: 'v2', c: 'ok' }, { l: 'v2', c: 'ok' }], note: 'The old ReplicaSet is kept at 0 replicas so you can roll back.' }] }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
