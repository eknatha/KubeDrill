/* Lessons, modules 01-10. Shape: why, mental model, anatomy, try, do it, myths, bug, check, teach back, remember, trap, production. */
(function () {
  'use strict';
  var KL = window.KL = window.KL || {}; KL.lessons = KL.lessons || [];
  var Y = function (a) { return a.join('\n'); }, D = function (p, t) { return [t, 'https://kubernetes.io/docs/' + p]; };
  function L(o) { KL.lessons.push(o); }

  L({ id: 'architecture', mod: '01', title: 'How a cluster works', mins: 9, exam: ['CKA'], ver: '1.34',
    why: 'You type one kubectl command and a container starts on some machine you never chose. Knowing which component does what turns "it is broken" into "the scheduler could not place it" in seconds.',
    model: { analogy: 'Think of a restaurant. The API server is the front desk that takes every order. etcd is the order book. The scheduler is the host who picks a table, the kubelet is the waiter on that table, and controllers are the managers who keep checking that what was ordered is what is on the table.' },
    widget: { type: 'steps', title: 'What happens when you run kubectl create deployment', steps: [
      { t: 'kubectl sends the request', d: 'It authenticates to the API server and sends your Deployment object.' },
      { t: 'API server validates and stores', d: 'After authentication, authorization and admission checks, the object is written to etcd.' },
      { t: 'Controller creates a ReplicaSet', d: 'The Deployment controller sees the new Deployment and creates a ReplicaSet, which creates Pod objects.' },
      { t: 'Scheduler picks a node', d: 'Pods with no node are scored on resources, taints and affinity. The winner is written onto the pod.' },
      { t: 'Kubelet starts the containers', d: 'The kubelet on that node sees a pod assigned to it, pulls the image and starts the containers.' },
      { t: 'Status flows back', d: 'The kubelet reports status to the API server. kubectl get pods now shows Running.' }] },
    anatomy: { intro: 'Every Kubernetes object has the same four top-level parts. Hover a line.', yaml: Y(['apiVersion: apps/v1', 'kind: Deployment', 'metadata:', '  name: web', 'spec:', '  replicas: 3', 'status: {}']),
      fields: { apiVersion: 'Which API group and version defines this kind.', kind: 'The type of object.', metadata: 'Name, namespace, labels and annotations.', spec: 'What YOU want. You write this.', replicas: 'Desired number of pods. A controller works to make it true.', status: 'What IS. The cluster writes this, you do not.' } },
    doit: [
      { cmd: 'kubectl get nodes', note: 'One control-plane node and workers. Each worker runs a kubelet.' },
      { cmd: 'kubectl create deployment web --image=nginx:1.25 --replicas=3', note: 'You declared the desired state: 3 pods.', predict: ['3 pods appear', 'Nothing until you scale'], answer: 0 },
      { cmd: 'kubectl get pods -o wide', note: 'The NODE column shows the scheduler decisions.' },
      { cmd: 'kubectl get events', note: 'Events show each component handing off to the next.' }],
    misc: [['Kubernetes runs your containers directly.', 'It asks the container runtime on each node to run them. The kubelet is the go-between.'], ['If the control plane dies, my apps stop.', 'Running pods keep running. You just cannot change anything until it is back.']],
    explain: { task: 'Find out what the replicas field of a Deployment is documented as.', cmd: 'kubectl explain deployment.spec.replicas' },
    breakit: ['s01-pending-cpu'],
    check: [{ q: 'Which component writes the node name onto a new pod?', o: ['kubelet', 'scheduler', 'kube-proxy', 'etcd'], a: 1, w: 'The scheduler decides, the kubelet only acts once the pod is assigned.' },
      { q: 'Where is cluster state stored?', o: ['In each kubelet', 'In the API server memory', 'In etcd', 'In the scheduler'], a: 2, w: 'Only the API server talks to etcd; everything else goes through the API server.' }],
    teach: { prompt: 'Explain what happens between running kubectl create deployment and a container starting.', model: 'The request goes to the API server, which stores it in etcd. A controller creates the pods, the scheduler assigns each one a node, and the kubelet on that node pulls the image and starts the containers, then reports status back.' },
    remember: 'You declare desired state. Controllers reconcile reality towards it, forever.', trap: 'Only the API server reads and writes etcd. Questions that show kubelet talking to etcd are wrong.',
    prod: 'Run three or more control-plane nodes for availability and back up etcd on a schedule. Caution: a snapshot contains every Secret, so store it encrypted.', docs: [D('concepts/architecture/', 'Cluster architecture')] });

  L({ id: 'pods', mod: '02', title: 'Pods and Deployments', mins: 10, exam: ['CKA', 'CKAD'], prereq: ['architecture'], ver: '1.34',
    why: 'A bare pod is mortal: if it dies, nothing brings it back. A Deployment keeps the right number alive and lets you change versions without downtime.',
    model: { analogy: 'A pod is one shift worker. A ReplicaSet is the rota that insists three workers are always on shift. A Deployment is the manager who swaps the whole team for a new version a few at a time.' },
    anatomy: { intro: 'A minimal Deployment.', yaml: Y(['apiVersion: apps/v1', 'kind: Deployment', 'metadata:', '  name: web', 'spec:', '  replicas: 3', '  selector:', '    matchLabels:', '      app: web', '  template:', '    metadata:', '      labels:', '        app: web', '    spec:', '      containers:', '      - name: nginx', '        image: nginx:1.25']),
      fields: { 'spec.replicas': 'How many pods to keep running.', selector: 'Which pods this Deployment owns. Must match the template labels.', 'matchLabels': 'The label pairs to match.', template: 'The pod blueprint used for every replica.', image: 'Pin a version. Avoid the latest tag.' } },
    doit: [
      { cmd: 'kubectl create deployment web --image=nginx:1.25 --replicas=3', note: 'Creates a Deployment, a ReplicaSet and three pods.' },
      { cmd: 'kubectl get deploy,rs,pods', note: 'Three layers, each owning the next.' },
      { cmd: 'kubectl delete pod -l app=web --wait=false', note: 'You killed every pod. Watch what happens next.', predict: ['Gone forever', 'Replaced automatically'], answer: 1 },
      { cmd: 'kubectl get pods', note: 'The ReplicaSet created replacements.' },
      { cmd: 'kubectl scale deploy web --replicas=5', note: 'Declarative scaling in one line.' }],
    misc: [['A Deployment runs my containers.', 'It manages ReplicaSets, which manage pods, which run containers.']],
    bug: { intro: 'This Deployment never creates pods. Click the broken line.', yaml: Y(['spec:', '  replicas: 2', '  selector:', '    matchLabels:', '      app: web', '  template:', '    metadata:', '      labels:', '        app: webapp']), line: 9, why: 'The selector looks for app=web but the template labels the pods app=webapp, so the Deployment would not own its own pods. The API server rejects it.' },
    explain: { task: 'Look up what a pod spec contains.', cmd: 'kubectl explain pod.spec.containers' },
    breakit: ['s02-imagepull', 's03-oomkilled'],
    check: [{ q: 'You delete one pod of a 3-replica Deployment. What happens?', o: ['Nothing', 'A new pod is created', 'The Deployment is deleted', 'You must scale it back'], a: 1, w: 'The ReplicaSet notices 2 of 3 and creates one.' },
      { q: 'The selector and template labels must...', o: ['Be different', 'Match', 'Be empty', 'Include the namespace'], a: 1, w: 'Otherwise the Deployment cannot adopt its pods.' }],
    teach: { prompt: 'Why use a Deployment instead of creating pods directly?', model: 'A bare pod is not replaced if it dies or its node fails. A Deployment keeps the desired number running through a ReplicaSet and supports rolling updates and rollbacks.' },
    remember: 'Deployment owns ReplicaSet owns Pods.', trap: 'You cannot change a Deployment selector after creation. Rename or recreate.',
    prod: 'Set resource requests, readiness probes and a pinned image tag on every Deployment. Caution: kubectl delete deployment deletes its pods too, so check the namespace first.', docs: [D('concepts/workloads/controllers/deployment/', 'Deployments')] });

  L({ id: 'rollouts', mod: '02', title: 'Rolling updates and rollbacks', mins: 8, exam: ['CKAD'], prereq: ['pods'], ver: '1.34',
    why: 'Shipping a new version should never mean downtime, and a bad version should be one command away from gone.',
    model: { analogy: 'Replacing the tyres on a moving car one at a time: you may lift only so many wheels at once (maxUnavailable) and carry only so many spares (maxSurge).' , widget: { type: 'rollout' } },
    doit: [
      { cmd: 'kubectl create deployment web --image=nginx:1.25 --replicas=4', note: 'Start on 1.25.' },
      { cmd: 'kubectl set image deploy/web nginx=nginx:1.26', note: 'Starts a rolling update.' },
      { cmd: 'kubectl rollout status deploy/web', note: 'Waits until the update completes.' },
      { cmd: 'kubectl rollout history deploy/web', note: 'Each revision is a ReplicaSet kept for rollback.' },
      { cmd: 'kubectl rollout undo deploy/web', note: 'Back to the previous revision.', predict: ['A new pod set on 1.25', 'The Deployment is deleted'], answer: 0 },
      { cmd: 'kubectl get deploy web -o wide', note: 'The IMAGES column shows the version.' }],
    check: [{ q: 'With maxSurge 0 and maxUnavailable 0, what happens?', o: ['Fastest rollout', 'The rollout cannot make progress', 'Pods restart together', 'Nothing special'], a: 1, w: 'It may neither add nor remove pods, so Kubernetes rejects it.' },
      { q: 'What does kubectl rollout undo do?', o: ['Deletes the Deployment', 'Returns to the previous revision', 'Pauses the rollout', 'Scales to zero'], a: 1, w: 'It re-applies the previous ReplicaSet template.' }],
    remember: 'A rollout is just two ReplicaSets trading pods. Undo swaps them back.', trap: 'Changing only replicas does not create a new revision. Changing the pod template does.',
    prod: 'Always set a readiness probe, otherwise Kubernetes thinks new pods are ready the moment they start and shifts traffic too early. Keep revisionHistoryLimit above zero if you want rollbacks.', docs: [D('concepts/workloads/controllers/deployment/#rolling-update-deployment', 'Rolling update')] });

  L({ id: 'probes', mod: '02', title: 'Health probes', mins: 8, exam: ['CKAD'], prereq: ['pods'], ver: '1.34',
    why: 'A running container is not the same as a working app. Probes let Kubernetes tell the difference and act on it.',
    model: { analogy: 'Readiness is the "open" sign on a shop door: not ready, no customers. Liveness is a manager checking you are still conscious: no answer, you get replaced.' },
    anatomy: { intro: 'Probes sit on the container.', yaml: Y(['containers:', '- name: app', '  image: nginx:1.25', '  readinessProbe:', '    httpGet: {path: /, port: 80}', '    periodSeconds: 5', '  livenessProbe:', '    httpGet: {path: /, port: 80}', '    initialDelaySeconds: 10']),
      fields: { readinessProbe: 'Failing removes the pod from Service endpoints. The container is NOT restarted.', livenessProbe: 'Failing makes the kubelet restart the container.', httpGet: 'Request a path on a port. Any 2xx or 3xx is success.', periodSeconds: 'How often to check.', initialDelaySeconds: 'Wait before the first check. Too small causes restart loops on slow apps.' } },
    misc: [['A failing readiness probe restarts the pod.', 'It only stops traffic. Liveness restarts.']],
    breakit: ['s08-probes'],
    check: [{ q: 'A readiness probe fails. What happens?', o: ['Container restarts', 'Pod is removed from the Service endpoints', 'Pod is deleted', 'Node is cordoned'], a: 1, w: 'Traffic stops; the container keeps running.' }],
    remember: 'Readiness gates traffic. Liveness triggers restarts. Startup protects slow starters.', trap: 'A too-aggressive liveness probe can cause a restart loop that looks like an app crash.',
    prod: 'Do not point liveness at a dependency like the database; one slow database then restarts every replica at once.', docs: [D('tasks/configure-pod-container/configure-liveness-readiness-startup-probes/', 'Probes')] });

  L({ id: 'networking', mod: '03', title: 'Services and DNS', mins: 10, exam: ['CKA', 'CKAD'], prereq: ['pods'], ver: '1.34',
    why: 'Pod IPs change every time a pod is replaced. A Service gives clients one stable name and spreads traffic across whatever pods are ready.',
    model: { analogy: 'A Service is a company phone number that rings whichever staff are in today. Callers never learn individual extensions.', widget: { type: 'tree', title: 'Which Service type?', start: 'a', nodes: { a: { q: 'Who needs to reach it?', o: [['Only other pods', 'cip'], ['People outside the cluster', 'b'], ['An external name from inside', 'en']] }, b: { q: 'Are you on a cloud with a load balancer?', o: [['Yes', 'lb'], ['No / testing', 'np']] }, cip: { leaf: '<b>ClusterIP</b> (the default). Reachable only inside the cluster.' }, lb: { leaf: '<b>LoadBalancer</b> asks the cloud for an external IP. Often one per Service, so prefer Ingress or Gateway for many apps.' }, np: { leaf: '<b>NodePort</b> opens a port (30000 to 32767) on every node. Fine for labs and tests.' }, en: { leaf: '<b>ExternalName</b> returns a DNS CNAME to the outside name.' } } } },
    anatomy: { intro: 'The Service selects pods by label.', yaml: Y(['apiVersion: v1', 'kind: Service', 'metadata:', '  name: web', 'spec:', '  selector:', '    app: web', '  ports:', '  - port: 80', '    targetPort: 8080']),
      fields: { selector: 'Pods with these labels become endpoints. A typo here means no endpoints.', port: 'The port clients connect to on the Service.', targetPort: 'The port the container actually listens on. The classic mismatch.' } },
    doit: [
      { cmd: 'kubectl create deployment web --image=nginx:1.25 --replicas=2', note: 'Two pods labelled app=web.' },
      { cmd: 'kubectl expose deployment web --port=80', note: 'Creates a ClusterIP Service selecting app=web.' },
      { cmd: 'kubectl get svc web', note: 'A stable virtual IP.' },
      { cmd: 'kubectl get endpoints web', note: 'The ready pod IPs behind it. Empty means a selector or readiness problem.', predict: ['Two pod IPs', 'Empty'], answer: 0 },
      { cmd: 'kubectl describe svc web', note: 'Check Selector, Port, TargetPort and Endpoints together.' }],
    misc: [['A Service load balances to pod names.', 'It balances across pod IPs that are Ready.']],
    bug: { intro: 'Requests fail although pods are healthy. Click the likely cause.', yaml: Y(['spec:', '  selector:', '    app: web', '  ports:', '  - port: 80', '    targetPort: 8080', '# container listens on 80']), line: 6, why: 'targetPort is 8080 but the container listens on 80, so connections are refused.' },
    breakit: ['s04-no-endpoints', 's29-svc-targetport'],
    check: [{ q: 'A Service has no endpoints. First thing to check?', o: ['The node CPU', 'Selector versus pod labels', 'etcd health', 'The image tag'], a: 1, w: 'No matching Ready pods means no endpoints.' }],
    remember: 'No endpoints means selector mismatch or no Ready pods.', trap: 'port is for clients, targetPort is for the container. Mixing them is a favourite exam trap.',
    prod: 'NetworkPolicy defaults to allow-all until you add one. Plan default-deny per namespace early.', docs: [D('concepts/services-networking/service/', 'Service')] });

  L({ id: 'storage', mod: '04', title: 'Volumes and PVCs', mins: 9, exam: ['CKA'], prereq: ['pods'], ver: '1.34',
    why: 'Container disks vanish with the container. A PersistentVolumeClaim lets data outlive pods.',
    model: { analogy: 'A PV is a storage unit the landlord owns. A PVC is your rental request. A StorageClass is the landlord promising to build one on demand.' },
    anatomy: { intro: 'A claim.', yaml: Y(['apiVersion: v1', 'kind: PersistentVolumeClaim', 'metadata:', '  name: data', 'spec:', '  accessModes: [ReadWriteOnce]', '  storageClassName: standard', '  resources:', '    requests:', '      storage: 1Gi']),
      fields: { accessModes: 'ReadWriteOnce means one node at a time. ReadWriteMany needs shared storage.', storageClassName: 'Which recipe provisions it. A name that does not exist leaves the PVC Pending.', storage: 'The size requested.' } },
    misc: [['Deleting the pod deletes my data.', 'Data on a PVC survives pod deletion. Deleting the PVC is what can delete it, depending on reclaimPolicy.']],
    breakit: ['s13-pvc-pending'],
    check: [{ q: 'A PVC is Pending. Most common cause?', o: ['Too many pods', 'No matching PV or StorageClass', 'Wrong image', 'Missing taint'], a: 1, w: 'Nothing can satisfy the claim yet. Describe the PVC.' }],
    remember: 'Pod asks via PVC, storage comes from PV, StorageClass makes PVs.', trap: 'ReadWriteOnce limits to one node, not one pod.',
    prod: 'Check reclaimPolicy before deleting a PVC. Retain keeps the data, Delete removes it. Caution: back up before experiments on real data.', docs: [D('concepts/storage/persistent-volumes/', 'Persistent volumes')] });

  L({ id: 'rbac', mod: '05', title: 'RBAC: who can do what', mins: 10, exam: ['CKA', 'CKS'], ver: '1.34',
    why: 'Anything that can reach the API server can be dangerous. RBAC lets you give each person and workload only the verbs they need.',
    model: { analogy: 'A Role is a keycard design listing which doors open. A RoleBinding hands that keycard to a person or ServiceAccount. No binding, no access.', widget: { type: 'matrix', title: 'Role or ClusterRole?', head: ['Need', 'Role', 'ClusterRole'], rows: [['Namespaced resources in one namespace', 1, 1], ['Same permissions reused in many namespaces', 0, 1], ['Nodes, namespaces, PVs (cluster-scoped)', 0, 1], ['Non-resource URLs like /healthz', 0, 1]], note: 'A ClusterRole can be granted in one namespace through a <b>RoleBinding</b>, which is a good reuse trick.' } },
    doit: [
      { cmd: 'kubectl create serviceaccount deployer', note: 'An identity for a workload.' },
      { cmd: 'kubectl create role pod-reader --verb=get,list --resource=pods', note: 'The keycard design: read pods only.' },
      { cmd: 'kubectl create rolebinding rb --role=pod-reader --serviceaccount=default:deployer', note: 'Hand the keycard over.' },
      { cmd: 'kubectl auth can-i list pods --as=system:serviceaccount:default:deployer', note: 'Allowed.', predict: ['yes', 'no'], answer: 0 },
      { cmd: 'kubectl auth can-i delete pods --as=system:serviceaccount:default:deployer', note: 'Not granted, so denied.' }],
    misc: [['cluster-admin is fine for CI.', 'It is the master key. Give pipelines a narrow Role in one namespace.']],
    breakit: ['s11-rbac-sa', 's50-rolebinding-wrong-role'],
    check: [{ q: 'You create a Role but no binding. Can the user act?', o: ['Yes', 'No', 'Only read', 'Only in kube-system'], a: 1, w: 'A Role grants nothing until bound.' }],
    remember: 'RBAC is additive. There are no deny rules.', trap: 'auth can-i is the fastest way to prove a permission. Use it in the exam.',
    prod: 'Audit bindings to cluster-admin regularly. Never bind groups like system:authenticated to powerful roles.', docs: [D('reference/access-authn-authz/rbac/', 'RBAC')] });

  L({ id: 'config', mod: '06', title: 'ConfigMaps and Secrets', mins: 8, exam: ['CKAD'], prereq: ['pods'], ver: '1.34',
    why: 'Baking config into an image means rebuilding to change a URL. Externalising it lets one image run everywhere.',
    model: { analogy: 'The image is a recipe book that never changes. The ConfigMap is the sticky note on the fridge saying how salty tonight. A Secret is the same note kept in a locked drawer.' },
    doit: [
      { cmd: 'kubectl create configmap app --from-literal=MODE=prod', note: 'Plain configuration.' },
      { cmd: 'kubectl create secret generic db --from-literal=password=s3cret', note: 'Stored base64 encoded.' },
      { cmd: 'kubectl get secret db -o jsonpath={.data.password}', note: 'That is base64, not encryption. Anyone with read access can decode it.' },
      { cmd: 'kubectl get cm,secret', note: 'Both live in the namespace.' }],
    misc: [['Secrets are encrypted.', 'They are only base64 encoded by default. Enable encryption at rest and restrict RBAC.']],
    breakit: ['s05-config-error', 's18-secret-env'],
    check: [{ q: 'You update a ConfigMap used as env vars. Do running pods change?', o: ['Immediately', 'Never until restarted', 'After 5 minutes', 'Only on drain'], a: 1, w: 'Env vars are read at start. Mounted files update eventually, env vars do not.' }],
    remember: 'Env vars freeze at start. Restart after changing them.', trap: 'A missing ConfigMap or Secret key gives CreateContainerConfigError, not CrashLoopBackOff.',
    prod: 'Never commit real Secret manifests to Git. Use sealed or external secrets. Caution: kubectl get secret -o yaml prints the value to your terminal history.', docs: [D('concepts/configuration/secret/', 'Secrets')] });

  L({ id: 'scheduling', mod: '07', title: 'Requests, limits and placement', mins: 11, exam: ['CKA', 'CKAD'], prereq: ['pods'], ver: '1.34',
    why: 'The scheduler cannot place what it cannot size, and a node out of memory kills pods in an order you should understand.',
    model: { analogy: 'Requests are the seat you reserve. Limits are the most you may spread out. A coach (node) is sold by reservations, so reserve too much and nobody fits.', widget: { type: 'qos' } },
    anatomy: { intro: 'Resources sit on each container.', yaml: Y(['containers:', '- name: api', '  image: nginx:1.25', '  resources:', '    requests: {cpu: 250m, memory: 256Mi}', '    limits: {memory: 512Mi}']),
      fields: { requests: 'Guaranteed amount. The scheduler places the pod by this.', limits: 'The ceiling. Over memory limit means OOMKilled, over CPU means throttled.', memory: '512Mi is mebibytes. 512M is slightly different.' } },
    doit: [
      { cmd: 'kubectl create deployment api --image=nginx:1.25 --replicas=2', note: 'No resources yet: BestEffort.' },
      { cmd: 'kubectl set resources deploy api --requests=cpu=100m,memory=128Mi --limits=memory=256Mi', note: 'Now Burstable.' },
      { cmd: 'kubectl get pods -o wide', note: 'See which nodes were chosen.' },
      { cmd: 'kubectl taint nodes worker1 team=a:NoSchedule', note: 'New pods avoid worker1 unless they tolerate it.' },
      { cmd: 'kubectl describe node worker1', note: 'Taints are listed here.' }],
    misc: [['Limits reserve capacity.', 'Requests do. Limits only cap use.']],
    breakit: ['s01-pending-cpu', 's35-taint-toleration', 's86-qos-eviction'],
    check: [{ q: 'Memory limit exceeded. What happens?', o: ['Throttled', 'OOMKilled', 'Evicted gracefully', 'Nothing'], a: 1, w: 'Memory is incompressible, so the container is killed (exit code 137).' }],
    remember: 'Scheduler uses requests. Kernel enforces limits.', trap: 'CPU limits throttle, they do not kill.',
    prod: 'Set requests from observed usage. Many teams skip CPU limits to avoid throttling but always set memory limits.', docs: [D('concepts/configuration/manage-resources-containers/', 'Resource management')] });

  L({ id: 'observability', mod: '08', title: 'Debugging with kubectl', mins: 9, exam: ['CKA', 'CKAD'], prereq: ['pods'], ver: '1.34',
    why: 'Most outages are solved by reading what the cluster already tells you. A fixed routine beats guessing.',
    model: { analogy: 'A doctor does not guess. Vitals, history, then tests: get, describe, logs, events.', widget: { type: 'steps', title: 'The four-step routine', steps: [{ t: 'get', d: 'kubectl get pods shows STATUS and RESTARTS. The status word already narrows the cause.' }, { t: 'describe', d: 'The Events at the bottom of kubectl describe pod usually names the cause.' }, { t: 'logs', d: 'kubectl logs, and --previous after a crash, shows the app side.' }, { t: 'events', d: 'kubectl get events --sort-by=.lastTimestamp shows the namespace timeline.' }] } },
    doit: [
      { cmd: 'kubectl run bad --image=nginx:doesnotexist', note: 'A pod that cannot pull its image.' },
      { cmd: 'kubectl get pods', note: 'Read the STATUS word.' },
      { cmd: 'kubectl describe pod bad', note: 'Events explain the failure.' },
      { cmd: 'kubectl get events --sort-by=.lastTimestamp', note: 'Newest at the bottom.' },
      { cmd: 'kubectl delete pod bad', note: 'Clean up.' }],
    misc: [['Logs always tell the story.', 'If the container never started there are no logs. Use describe.']],
    breakit: ['s03-oomkilled', 's28-incident'],
    check: [{ q: 'A pod is CrashLoopBackOff. Which command shows the previous crash output?', o: ['kubectl logs --previous', 'kubectl top', 'kubectl cordon', 'kubectl scale'], a: 0, w: 'The current container may have just restarted and be empty.' }],
    remember: 'get, describe, logs, events. In that order.', trap: 'Pending means not scheduled. ContainerCreating means scheduled but not started.',
    prod: 'Alerts should fire on symptoms such as error rate, not only on pod restarts.', docs: [D('tasks/debug/debug-application/debug-pods/', 'Debug pods')] });

  L({ id: 'helm', mod: '09', title: 'Why package manifests', mins: 7, exam: ['CKAD'], ver: '1.34',
    why: 'Real apps are many YAML files that differ slightly per environment. Packaging avoids copy-paste drift.',
    model: { analogy: 'A chart is a flat-pack furniture kit: the same parts, with a values sheet choosing the colour and size.', widget: { type: 'select', title: 'Pick the tool', options: [{ k: 'Install a third-party app quickly', r: 'Use <b>Helm</b>: a chart plus values.' }, { k: 'Small changes per environment to my own YAML', r: 'Use <b>Kustomize</b> overlays. No templates.' }, { k: 'Cluster must follow Git', r: 'Add <b>GitOps</b> on top of either.' }] } },
    doit: [{ cmd: 'kubectl create deployment web --image=nginx:1.25 --dry-run=client -o yaml', note: 'Generate YAML without creating anything. Handy as a template.' }, { cmd: 'kubectl api-resources', note: 'Everything a chart can template.' }],
    check: [{ q: 'Which is template-free?', o: ['Helm', 'Kustomize', 'Both', 'Neither'], a: 1, w: 'Kustomize patches plain YAML.' }],
    remember: 'Helm templates. Kustomize patches.', trap: 'Helm release state lives in Secrets in the cluster.',
    prod: 'Pin chart versions, review rendered output with helm template before upgrades.', docs: [D('tasks/manage-kubernetes-objects/kustomization/', 'Kustomize')] });

  L({ id: 'gitops', mod: '10', title: 'GitOps in one idea', mins: 7, exam: [], ver: '1.34',
    why: 'If anyone can kubectl edit production, nobody knows what is really running. GitOps makes Git the record and a controller the only writer.',
    model: { analogy: 'Git is the blueprint on the wall. The controller is a builder who keeps comparing the building to the blueprint and corrects any drift.', widget: { type: 'steps', title: 'The reconcile loop', steps: [{ t: 'You push to Git', d: 'A reviewed pull request changes the desired state.' }, { t: 'Controller detects a diff', d: 'It compares Git with the live cluster.' }, { t: 'It applies the change', d: 'Resources are updated to match.' }, { t: 'Drift is reverted', d: 'A manual change is detected and overwritten, or flagged.' }] } },
    check: [{ q: 'Someone edits a live Deployment by hand. In GitOps, what happens?', o: ['It is kept', 'It is reverted to match Git', 'Git is updated', 'Cluster stops'], a: 1, w: 'Git is the source of truth.' }],
    remember: 'Pull-based and auditable: the cluster pulls from Git.', trap: 'Secrets still need a separate approach. Never put plaintext in Git.',
    prod: 'Protect the main branch. Anyone who can merge can change production.', docs: [D('concepts/overview/working-with-objects/', 'Working with objects')] });
})();
