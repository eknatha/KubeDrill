# System hardening: seccomp RuntimeDefault

**Track:** CKS · **Level:** Advanced · **Time:** 12 min · **Namespace:** `sys`

Deployment `api` runs with no syscall filtering and may escalate privileges. Apply the container runtime's default seccomp profile at pod level, block privilege escalation, drop every capability and make the root filesystem read-only.

## Tasks

1. **Pod seccomp profile is RuntimeDefault** — 
2. **No privilege escalation, all capabilities dropped** — 
3. **Read-only root filesystem, pods Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl explain pod.spec.securityContext.seccompProfile`
2. spec.template.spec.securityContext.seccompProfile.type: RuntimeDefault
</details>

<details><summary>Task 2 hints</summary>

1. Container-level: allowPrivilegeEscalation: false, capabilities.drop: ["ALL"]
</details>

<details><summary>Task 3 hints</summary>

1. `readOnlyRootFilesystem: true`
2. nginx needs writable /var/cache/nginx and /var/run: mount emptyDir volumes or use the unprivileged image.
</details>

<details><summary>Solution</summary>

```bash
kubectl patch deployment api -n sys --type=json -p '[{"op":"add","path":"/spec/template/spec/securityContext","value":{"seccompProfile":{"type":"RuntimeDefault"}}},{"op":"add","path":"/spec/template/spec/containers/0/securityContext","value":{"allowPrivilegeEscalation":false,"readOnlyRootFilesystem":true,"capabilities":{"drop":["ALL"]}}}]'
kubectl rollout status deployment/api -n sys
```
</details>
