# KubeLab lab packs (real cluster)

Every interactive lab in the browser is also exported here as plain bash + kubectl, generated from the same lab specs, so you can run it on a **real** cluster (kind, minikube, k3d, a homelab).

```bash
cd lab-packs
./kubelab.sh cluster          # optional: needs Docker + kind
./kubelab.sh setup s02-imagepull
# ...fix it with kubectl...
./kubelab.sh check s02-imagepull
./kubelab.sh reset s02-imagepull
```

Notes
- Scripts use your **current kubectl context** — never run them against a production cluster. They create and delete the lab namespaces.
- Labs that mention `worker1`/`worker2` (drain/cordon/label) need those node names: on kind they are `kubelab-worker`/`kubelab-worker2` — substitute them.
- Check scripts assert the same end state as the in-browser Check button. Real clusters converge slower: re-run `check.sh` after a few seconds.
- These packs are generated, and have been syntax-checked (`bash -n`) but **not every lab has been run end-to-end against a real cluster** — please open an issue if one misbehaves.

## Labs (81)

| Lab | Level | Tracks | Time |
|---|---|---|---|
| [S01 Prod is down: pods stuck in Pending](s01-pending-cpu/README.md) | Beginner | CKA | 10 min |
| [S02 Prod is down: ImagePullBackOff](s02-imagepull/README.md) | Beginner | CKA, CKAD | 8 min |
| [S03 CrashLoopBackOff: OOMKilled](s03-oomkilled/README.md) | Beginner | CKA | 12 min |
| [S04 Service has no endpoints](s04-no-endpoints/README.md) | Beginner | CKA, CKAD | 10 min |
| [S05 CreateContainerConfigError: missing ConfigMap](s05-config-error/README.md) | Beginner | CKAD | 10 min |
| [S06 Bad rollout: undo, scale, then upgrade](s06-rollout-rollback/README.md) | Beginner | CKAD, CKA | 15 min |
| [S07 Taints, tolerations and nodeSelector](s07-scheduling/README.md) | Beginner | CKA | 15 min |
| [S08 Liveness and readiness probes](s08-probes/README.md) | Beginner | CKAD | 15 min |
| [S09 Jobs and CronJobs](s09-jobs/README.md) | Beginner | CKAD | 12 min |
| [S10 Multi-container pod: log sidecar](s10-sidecar/README.md) | Beginner | CKAD | 15 min |
| [S11 RBAC: least-privilege deployer](s11-rbac-sa/README.md) | Intermediate | CKA, CKS | 15 min |
| [S12 NetworkPolicy: lock down the database](s12-netpol-isolate/README.md) | Intermediate | CKA, CKS | 15 min |
| [S13 PVC stuck Pending](s13-pvc-pending/README.md) | Intermediate | CKA | 12 min |
| [S14 StatefulSet: scale with stable storage](s14-statefulset-pvc/README.md) | Intermediate | CKA, CKAD | 12 min |
| [S15 ResourceQuota blocks the rollout](s15-quota-limits/README.md) | Intermediate | CKA | 12 min |
| [S16 Autoscale a Deployment with HPA](s16-hpa/README.md) | Intermediate | CKA, CKAD | 10 min |
| [S17 Node maintenance: cordon and drain](s17-drain-cordon/README.md) | Intermediate | CKA | 10 min |
| [S18 CreateContainerConfigError: missing Secret](s18-secret-env/README.md) | Intermediate | CKAD | 10 min |
| [S19 Ingress: host + path routing](s19-ingress/README.md) | Intermediate | CKA, CKAD | 15 min |
| [S20 High availability: PDB + topology spread](s20-pdb-spread/README.md) | Intermediate | CKA | 15 min |
| [S21 Pod Security Admission: restricted namespace](s21-psa-restricted/README.md) | Advanced | CKS | 20 min |
| [S22 Harden ServiceAccount token mounting](s22-sa-token/README.md) | Advanced | CKS | 15 min |
| [S23 Gateway API: Gateway + HTTPRoute](s23-gateway-api/README.md) | Advanced | CKA | 15 min |
| [S24 Extend Kubernetes: CRD + custom resource](s24-crd/README.md) | Advanced | CKA, CKAD | 15 min |
| [S25 Kustomize: base + prod overlay](s25-kustomize/README.md) | Advanced | CKAD | 15 min |
| [S26 Onboard a tenant namespace](s26-multitenant/README.md) | Advanced | CKA, CKS | 20 min |
| [S27 Scan images and replace the vulnerable ones](s27-image-scan/README.md) | Advanced | CKS | 15 min |
| [S28 Incident: three faults, one outage](s28-incident/README.md) | Expert | CKA, CKAD | 30 min |
| [S29 Service reachable but requests fail: wrong targetPort](s29-svc-targetport/README.md) | Intermediate | CKA, CKAD | 12 min |
| [S30 Deployed into the wrong namespace](s30-wrong-namespace/README.md) | Beginner | CKA, CKAD | 8 min |
| [S31 Init:CrashLoopBackOff — failing init container](s31-init-container/README.md) | Intermediate | CKAD | 12 min |
| [S32 Missing ConfigMap key breaks the pod](s32-cm-env-missing/README.md) | Beginner | CKAD | 10 min |
| [S33 Mount a ConfigMap as a file](s33-cm-volume/README.md) | Intermediate | CKAD | 12 min |
| [S34 Pending: nodeSelector matches no node](s34-nodeselector/README.md) | Beginner | CKA, CKAD | 8 min |
| [S35 Every node is tainted — add a toleration](s35-taint-toleration/README.md) | Intermediate | CKA | 12 min |
| [S36 Required node affinity with no matching node](s36-node-affinity/README.md) | Intermediate | CKA, CKAD | 12 min |
| [S37 Spread replicas with pod anti-affinity](s37-pod-antiaffinity/README.md) | Intermediate | CKA, CKAD | 15 min |
| [S38 Insufficient memory](s38-memory-too-high/README.md) | Beginner | CKA | 8 min |
| [S39 Roll back to a specific revision](s39-rollout-revision/README.md) | Intermediate | CKAD | 12 min |
| [S40 CronJob never runs: suspended + wrong schedule](s40-cronjob-fix/README.md) | Intermediate | CKAD | 12 min |
| [S41 Job stuck: ImagePullBackOff](s41-job-bad-image/README.md) | Intermediate | CKAD | 10 min |
| [S42 DaemonSet only runs on one node](s42-daemonset-all-nodes/README.md) | Intermediate | CKA | 10 min |
| [S43 StatefulSet needs a headless Service](s43-headless-service/README.md) | Intermediate | CKA, CKAD | 10 min |
| [S44 Bind a PVC to a pre-created PersistentVolume](s44-static-pv/README.md) | Advanced | CKA | 15 min |
| [S45 HPA points at the wrong Deployment](s45-hpa-wrong-target/README.md) | Intermediate | CKA, CKAD | 10 min |
| [S46 PodDisruptionBudget blocks a node drain](s46-pdb-blocks-drain/README.md) | Advanced | CKA | 15 min |
| [S47 LimitRange rejects the pod](s47-limitrange-max/README.md) | Intermediate | CKA | 12 min |
| [S48 Pod-count quota blocks scaling](s48-quota-pods/README.md) | Beginner | CKA | 8 min |
| [S49 ClusterRole: let a ServiceAccount list nodes](s49-clusterrole-nodes/README.md) | Intermediate | CKA, CKS | 12 min |
| [S50 RoleBinding points at the wrong Role](s50-rolebinding-wrong-role/README.md) | Intermediate | CKA, CKS | 12 min |
| [S51 NetworkPolicy egress: allow only the API](s51-netpol-egress/README.md) | Advanced | CKS, CKA | 15 min |
| [S52 NetworkPolicy: allow only a labelled namespace](s52-netpol-namespace/README.md) | Advanced | CKS, CKA | 15 min |
| [S53 Pod Security (baseline) rejects a privileged pod](s53-psa-baseline/README.md) | Intermediate | CKS | 12 min |
| [S54 hostPath volume blocked by Pod Security](s54-hostpath-baseline/README.md) | Intermediate | CKS | 12 min |
| [S55 ImagePullBackOff from a private registry](s55-image-pull-secret/README.md) | Intermediate | CKAD, CKA | 12 min |
| [S56 Rotate a Secret and restart the workload](s56-rollout-restart-secret/README.md) | Beginner | CKAD | 10 min |
| [S57 Ingress with TLS termination](s57-ingress-tls/README.md) | Intermediate | CKA, CKAD | 15 min |
| [S58 Expose a Service on a fixed NodePort](s58-nodeport-fixed/README.md) | Beginner | CKA, CKAD | 10 min |
| [S59 ExternalName Service for an outside database](s59-externalname/README.md) | Intermediate | CKA, CKAD | 10 min |
| [S60 Canary release: 20% of traffic via replica ratio](s60-canary-weights/README.md) | Intermediate | CKAD | 12 min |
| [S61 Blue/green switch by Service selector](s61-blue-green/README.md) | Intermediate | CKAD | 12 min |
| [S62 Kustomize: override the image tag](s62-kustomize-images/README.md) | Intermediate | CKAD | 12 min |
| [S63 Back up etcd with a snapshot](s63-etcd-backup/README.md) | Advanced | CKA | 10 min |
| [S64 JSONPath: extract node names and images](s64-jsonpath-nodes/README.md) | Intermediate | CKA, CKAD | 10 min |
| [S65 custom-columns and --sort-by](s65-custom-columns/README.md) | Intermediate | CKA, CKAD | 10 min |
| [S66 Imperative speed run (CKAD style)](s66-imperative-speedrun/README.md) | Beginner | CKAD, CKA | 8 min |
| [S67 Find the pod that keeps restarting](s67-find-restarts/README.md) | Intermediate | CKA, CKAD | 10 min |
| [S68 Clean up temporary namespaces by label](s68-multi-ns-cleanup/README.md) | Beginner | CKA | 8 min |
| [S74 Hunt the privileged workloads](s74-privileged-hunt/README.md) | Advanced | CKS | 12 min |
| [S75 Cut a wildcard Role down to least privilege](s75-rbac-least-privilege/README.md) | Advanced | CKS, CKA | 10 min |
| [S76 Pin and vet container images](s76-image-hygiene/README.md) | Intermediate | CKS | 10 min |
| [S77 Harden a pod's securityContext](s77-hardened-pod/README.md) | Advanced | CKS, CKAD | 12 min |
| [S78 The default ServiceAccount is cluster-admin](s78-default-sa-admin/README.md) | Advanced | CKS, CKA | 10 min |
| [S82 Nothing resolves: CoreDNS scaled to zero](s82-coredns-down/README.md) | Intermediate | CKA | 8 min |
| [S83 LoadBalancer stuck on <pending>](s83-lb-pending/README.md) | Intermediate | CKA, CKAD | 8 min |
| [S84 Service unreachable: climb the ladder](s84-service-ladder/README.md) | Advanced | CKA, CKAD | 15 min |
| [S85 Critical pods Pending: priority and preemption](s85-priority-preemption/README.md) | Advanced | CKA | 12 min |
| [S91 Incident: Black Friday checkout](s91-black-friday/README.md) | Advanced | CKA, CKAD | 20 min |
| [S92 Incident: the silent database](s92-silent-database/README.md) | Advanced | CKA, CKAD | 20 min |
| [S93 Incident: the release that never finishes](s93-release-gone-wrong/README.md) | Advanced | CKAD, CKA | 18 min |
| [S94 Incident: capacity crunch](s94-capacity-crunch/README.md) | Advanced | CKA | 18 min |
