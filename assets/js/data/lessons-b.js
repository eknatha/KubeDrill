/* Lessons, modules 11-19. */
(function () {
  'use strict';
  var KL = window.KL = window.KL || {}; KL.lessons = KL.lessons || [];
  var Y = function (a) { return a.join('\n'); }, D = function (p, t) { return [t, 'https://kubernetes.io/docs/' + p]; };
  function L(o) { KL.lessons.push(o); }

  L({ id: 'cks-threats', mod: '11', title: 'Threat model for a cluster', mins: 8, exam: ['CKS'], prereq: ['rbac'], ver: '1.34',
    why: 'Security work without a threat model becomes a checklist. Knowing the path an attacker takes tells you where one control is worth ten.',
    model: { analogy: 'A castle has a moat, walls, a guard and a vault. Each layer assumes the one outside it failed.', widget: { type: 'steps', title: 'A typical attack path', steps: [{ t: 'Foothold', d: 'A vulnerable app or leaked credential gives code execution in one pod.' }, { t: 'Look around', d: 'The pod reads its ServiceAccount token and probes the API server and other pods.' }, { t: 'Escalate', d: 'An over-permissive Role, privileged pod or hostPath mount reaches the node.' }, { t: 'Spread', d: 'With no NetworkPolicy, it reaches databases and other namespaces.' }] } },
    doit: [{ cmd: 'kubectl auth can-i create pods --as=system:serviceaccount:default:default', note: 'Can the default ServiceAccount create pods? Ideally no.' }, { cmd: 'kubectl get clusterrolebindings', note: 'Look for broad grants like cluster-admin.' }],
    misc: [['Our cluster is internal so it is safe.', 'One compromised pod is already inside.']],
    breakit: ['s78-default-sa-admin', 's74-privileged-hunt'],
    check: [{ q: 'Which single control most limits lateral movement between pods?', o: ['Bigger nodes', 'NetworkPolicy', 'More replicas', 'Helm'], a: 1, w: 'Without policies every pod can reach every pod.' }],
    remember: 'Assume a pod will be compromised. Limit what it can reach and do.', trap: 'Authentication is who you are, authorization is what you may do. Do not mix them.',
    prod: 'Turn on audit logging and review it. Caution: practise attacks only on your own throwaway cluster.', docs: [D('concepts/security/', 'Security')] });

  L({ id: 'netpol', mod: '11', title: 'NetworkPolicy', mins: 9, exam: ['CKS', 'CKA'], prereq: ['networking'], ver: '1.34',
    why: 'By default every pod can talk to every other pod. A NetworkPolicy is how you stop a compromised web pod from reaching the database.',
    model: { analogy: 'Pods start in an open-plan office. A policy builds walls and adds a door only for the people you name.' },
    anatomy: { intro: 'Allow only the api pods to reach the database.', yaml: Y(['apiVersion: networking.k8s.io/v1', 'kind: NetworkPolicy', 'metadata:', '  name: db-allow-api', 'spec:', '  podSelector:', '    matchLabels: {app: db}', '  policyTypes: [Ingress]', '  ingress:', '  - from:', '    - podSelector:', '        matchLabels: {app: api}']),
      fields: { podSelector: 'Which pods this policy protects. Empty selects every pod in the namespace.', policyTypes: 'Ingress, Egress or both. Listing a type with no rules denies it all.', ingress: 'The allow list. Anything not listed is denied once the pod is selected.', from: 'Who may connect: pods, namespaces or IP blocks.' } },
    misc: [['Policies work on any cluster.', 'They need a network plugin that enforces them. Without one they are silently ignored.']],
    bug: { intro: 'This was meant to lock the database but locks nothing. Click the line.', yaml: Y(['spec:', '  podSelector:', '    matchLabels: {app: databse}', '  policyTypes: [Ingress]']), line: 3, why: 'A label typo selects no pods, so the policy protects nothing.' },
    breakit: ['s12-netpol-isolate', 's51-netpol-egress', 's52-netpol-namespace'],
    check: [{ q: 'A pod is selected by a policy with an empty ingress list. Result?', o: ['All ingress allowed', 'All ingress denied', 'Only DNS allowed', 'Policy ignored'], a: 1, w: 'Selected plus no allow rules means deny.' }],
    remember: 'Policies are additive allow lists. Selected pods deny everything not allowed.', trap: 'If you deny egress, remember DNS (port 53) or names stop resolving.',
    prod: 'Start every namespace with a default-deny, then add allows. Test with a throwaway pod before applying to production.', docs: [D('concepts/services-networking/network-policies/', 'Network policies')] });

  L({ id: 'secctx', mod: '17', title: 'Hardening a pod', mins: 9, exam: ['CKS', 'CKAD'], prereq: ['pods'], ver: '1.34',
    why: 'Containers share the host kernel. A few securityContext lines shrink what an escaped process can do.',
    model: { analogy: 'Give the contractor a key to one room, not the building, and take the tools they do not need.' },
    anatomy: { intro: 'A hardened container.', yaml: Y(['securityContext:', '  runAsNonRoot: true', '  allowPrivilegeEscalation: false', '  readOnlyRootFilesystem: true', '  capabilities:', '    drop: ["ALL"]']),
      fields: { runAsNonRoot: 'Refuse to start if the image would run as root.', allowPrivilegeEscalation: 'Block gaining more privileges than the parent process.', readOnlyRootFilesystem: 'The container cannot write to its own filesystem.', capabilities: 'Drop every Linux capability, then add back only what you need.' } },
    misc: [['Privileged is needed for networking tools.', 'Almost never. Add one specific capability instead.']],
    breakit: ['s77-hardened-pod', 's21-psa-restricted', 's53-psa-baseline'],
    check: [{ q: 'Which setting stops a process gaining extra privileges?', o: ['hostNetwork', 'allowPrivilegeEscalation: false', 'privileged: true', 'runAsUser: 0'], a: 1, w: 'It sets no_new_privs on the process.' }],
    remember: 'Non-root, no escalation, read-only root, drop ALL capabilities.', trap: 'privileged: true and hostPath mounts are what Pod Security Admission baseline blocks.',
    prod: 'Enforce Pod Security Admission restricted on workload namespaces and warn first, then enforce.', docs: [D('concepts/security/pod-security-standards/', 'Pod Security Standards')] });

  L({ id: 'gke', mod: '12', title: 'Managed Kubernetes', mins: 7, exam: [], ver: '1.34',
    why: 'On a managed service the provider runs the control plane. Knowing the split tells you what to fix and what to ask support about.',
    model: { analogy: 'Renting a flat: the landlord keeps the building up, you still keep your own rooms tidy.', widget: { type: 'matrix', title: 'Who is responsible?', head: ['Task', 'Provider', 'You'], rows: [['Control plane upgrades and availability', 1, 0], ['Node OS patching (auto modes)', 1, 1], ['Your Deployments and manifests', 0, 1], ['RBAC and IAM design', 0, 1], ['Application security', 0, 1]], note: 'Details vary by provider and mode. Check their shared-responsibility page.' } },
    check: [{ q: 'On a managed cluster who runs etcd?', o: ['You', 'The provider', 'Nobody', 'The scheduler'], a: 1, w: 'The provider operates the control plane, including etcd.' }],
    remember: 'You still own workloads, access and cost.', trap: 'Cloud IAM and Kubernetes RBAC are two separate permission systems that must both allow an action.',
    prod: 'Set budgets and alerts on node pools. An autoscaler with no ceiling is a bill.', docs: [D('concepts/architecture/cloud-controller/', 'Cloud controller manager')] });

  L({ id: 'gateway', mod: '13', title: 'Ingress and Gateway API', mins: 9, exam: ['CKA'], prereq: ['networking'], ver: '1.34',
    why: 'One public entry point can route many hostnames and paths to different Services, instead of buying a load balancer for each.',
    model: { analogy: 'A reception desk that reads your visitor badge (host and path) and sends you to the right department.' },
    anatomy: { intro: 'A Gateway API route.', yaml: Y(['apiVersion: gateway.networking.k8s.io/v1', 'kind: HTTPRoute', 'metadata:', '  name: shop', 'spec:', '  parentRefs:', '  - name: main-gateway', '  hostnames: ["shop.example.com"]', '  rules:', '  - backendRefs:', '    - name: web', '      port: 80']),
      fields: { parentRefs: 'Which Gateway this route attaches to.', hostnames: 'Hostnames this route answers for.', backendRefs: 'The Services that receive traffic. Add weight for canaries.' } },
    misc: [['Ingress and Gateway API are the same thing.', 'Gateway API is the newer, role-oriented successor with richer routing.']],
    breakit: ['s19-ingress', 's23-gateway-api', 's60-canary-weights'],
    check: [{ q: 'Which object splits traffic 90/10 for a canary in Gateway API?', o: ['NetworkPolicy', 'HTTPRoute backendRefs with weights', 'PDB', 'ConfigMap'], a: 1, w: 'Each backendRef can carry a weight.' }],
    remember: 'A controller must be installed for either to do anything.', trap: 'An Ingress object alone does nothing without an ingress controller.',
    prod: 'Terminate TLS at the gateway and renew certificates automatically.', docs: [D('concepts/services-networking/gateway/', 'Gateway API')] });

  L({ id: 'crds', mod: '14', title: 'CRDs and operators', mins: 8, exam: ['CKA'], ver: '1.34',
    why: 'Kubernetes cannot know every kind of thing you want to run. CRDs let you add new object types, and operators teach the cluster to manage them.',
    model: { analogy: 'A CRD adds a new form to the filing system. An operator is the clerk who knows what to do when that form arrives.' },
    anatomy: { intro: 'Declare a new kind.', yaml: Y(['apiVersion: apiextensions.k8s.io/v1', 'kind: CustomResourceDefinition', 'metadata:', '  name: widgets.example.com', 'spec:', '  group: example.com', '  scope: Namespaced', '  names:', '    kind: Widget', '    plural: widgets']),
      fields: { name: 'Must be plural.group, here widgets.example.com.', group: 'The API group for the new kind.', scope: 'Namespaced or Cluster.', plural: 'What you type in kubectl get.' } },
    breakit: ['s24-crd'],
    check: [{ q: 'A CRD alone makes the cluster act on your new objects. True?', o: ['True', 'False, a controller is needed'], a: 1, w: 'A CRD only stores data. A controller reacts to it.' }],
    remember: 'CRD stores. Controller acts.', trap: 'Deleting a CRD deletes every object of that kind.',
    prod: 'Caution: before deleting a CRD, export its objects, because removal is cascading and immediate.', docs: [D('concepts/extend-kubernetes/api-extension/custom-resources/', 'Custom resources')] });

  L({ id: 'kustomize', mod: '15', title: 'Kustomize overlays', mins: 7, exam: ['CKAD'], ver: '1.34',
    why: 'Dev and prod usually differ by a few lines. Overlays patch a shared base instead of duplicating files.',
    model: { analogy: 'A base is the master drawing. Each overlay is tracing paper laid on top with only the changes.' },
    anatomy: { intro: 'A prod overlay.', yaml: Y(['resources:', '- ../../base', 'replicas:', '- name: web', '  count: 5', 'images:', '- name: nginx', '  newTag: "1.26"']),
      fields: { resources: 'Start from the base.', replicas: 'Override the replica count without editing the base.', images: 'Change image tags for this environment.' } },
    breakit: ['s25-kustomize', 's62-kustomize-images'],
    check: [{ q: 'Render an overlay without applying it:', o: ['kubectl kustomize dir', 'kubectl apply -k --force', 'kubectl diff -r', 'kubectl explain'], a: 0, w: 'kubectl kustomize prints the final YAML.' }],
    remember: 'kubectl apply -k applies a directory with a kustomization.yaml.', trap: 'The base should work on its own. Never put environment values in it.',
    prod: 'Review rendered output in pull requests, not just the patch.', docs: [D('tasks/manage-kubernetes-objects/kustomization/', 'Kustomize')] });

  L({ id: 'helm2', mod: '16', title: 'Helm releases', mins: 7, exam: ['CKAD'], prereq: ['helm'], ver: '1.34',
    why: 'Helm tracks each install as a release with a history, so upgrades and rollbacks work like Deployments but for a whole app.',
    model: { analogy: 'Like app store versions: install, upgrade, and roll back to a previous version of the whole bundle.', widget: { type: 'steps', title: 'A release lifecycle', steps: [{ t: 'helm install', d: 'Renders templates with your values and creates revision 1.' }, { t: 'helm upgrade', d: 'Renders again, applies the difference, creates revision 2.' }, { t: 'helm history', d: 'Lists revisions and their status.' }, { t: 'helm rollback', d: 'Re-applies an earlier revision as a new one.' }] } },
    check: [{ q: 'Which previews what an upgrade will change?', o: ['helm template or --dry-run', 'helm delete', 'helm repo add', 'kubectl cp'], a: 0, w: 'Render first, apply second.' }],
    remember: 'A release is a named install of a chart with its own history.', trap: 'helm uninstall removes everything the release created.',
    prod: 'Pin chart and image versions. Keep values files in Git.', docs: [D('tasks/manage-kubernetes-objects/', 'Managing objects')] });

  L({ id: 'supply', mod: '18', title: 'Supply chain basics', mins: 8, exam: ['CKS'], prereq: ['secctx'], ver: '1.34',
    why: 'A container is code someone else wrote. Pinning, scanning and signing reduce the chance you run something nobody reviewed.',
    model: { analogy: 'Food safety: know the supplier, check the label, store it correctly, and be able to recall a bad batch.' },
    misc: [['latest is the newest and safest.', 'It is a moving target and breaks reproducibility and rollbacks. Pin a version or a digest.']],
    breakit: ['s27-image-scan', 's76-image-hygiene', 's55-image-pull-secret'],
    check: [{ q: 'Most reproducible way to reference an image?', o: ['latest', 'A version tag', 'A digest (sha256)', 'No tag'], a: 2, w: 'A digest is immutable. A tag can be moved.' }],
    remember: 'Pin, scan, sign, and allow only trusted registries.', trap: 'imagePullPolicy defaults differ: latest pulls every time, pinned tags use the cached copy.',
    prod: 'Scan images in CI and block critical findings before they reach the cluster.', docs: [D('concepts/containers/images/', 'Images')] });

  L({ id: 'exam', mod: '19', title: 'Speed and exam habits', mins: 8, exam: ['CKA', 'CKAD', 'CKS'], ver: '1.34',
    why: 'The exams are timed. Typing less and checking fast wins more marks than knowing one more feature.',
    model: { analogy: 'A pit crew: practised, scripted, no wasted movement.', widget: { type: 'runbook', title: 'Per-question routine', steps: ['Set the context from the task text (kubectl config use-context).', 'Read the full task once. Note namespace and names.', 'Generate YAML with --dry-run=client -o yaml, do not type it from scratch.', 'Apply, then verify with get or describe.', 'Flag hard questions and move on. Return later.'] } },
    doit: [
      { cmd: 'kubectl create deployment web --image=nginx:1.25 --dry-run=client -o yaml', note: 'YAML in one second. Pipe to a file and edit.' },
      { cmd: 'kubectl run test --image=busybox --restart=Never --dry-run=client -o yaml', note: 'Same for pods.' },
      { cmd: 'kubectl get nodes -o jsonpath={.items[*].metadata.name}', note: 'JSONPath answers often appear in tasks.' },
      { cmd: 'kubectl api-resources', note: 'Find a kind, its short name and scope.' }],
    misc: [['I need to memorise YAML.', 'Use generators and kubectl explain. You may use the docs in the exam.']],
    breakit: ['s66-imperative-speedrun', 's64-jsonpath-nodes'],
    check: [{ q: 'Fastest way to a starting Deployment manifest?', o: ['Type it', 'kubectl create ... --dry-run=client -o yaml', 'Search the web', 'kubectl get'], a: 1, w: 'Generate, then edit.' }],
    remember: 'Generate, apply, verify. Always check the context first.', trap: 'Working in the wrong namespace or context is the most common lost-mark mistake.',
    prod: 'The same habits (dry-run, diff before apply) prevent mistakes on real clusters.', docs: [D('reference/kubectl/quick-reference/', 'kubectl quick reference')] });
})();
