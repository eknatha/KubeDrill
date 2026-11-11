# Harden a pod's securityContext

**Track:** CKS, CKAD · **Level:** Advanced · **Time:** 12 min · **Namespace:** `secure`

Deployment `web` in `secure` runs as root with a writable filesystem and every Linux capability. Bring it up to the restricted profile: non-root user, read-only root filesystem, no privilege escalation, all capabilities dropped, RuntimeDefault seccomp.

## Tasks

1. **Run as non-root** — 
2. **Read-only root filesystem, no escalation** — 
3. **Drop all capabilities + RuntimeDefault seccomp** — 
4. **Pod still Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl edit deploy web -n secure` or apply a full manifest.
2. Container securityContext: `runAsNonRoot: true`, `runAsUser: 10001`.
</details>

<details><summary>Task 2 hints</summary>

1. `readOnlyRootFilesystem: true`
2. `allowPrivilegeEscalation: false`
</details>

<details><summary>Task 3 hints</summary>

1. `capabilities: {drop: ["ALL"]}`
2. Pod-level `securityContext.seccompProfile.type: RuntimeDefault`.
</details>

<details><summary>Task 4 hints</summary>


</details>

<details><summary>Solution</summary>

```bash
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: secure
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      securityContext:
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: app
        image: nginx:1.25
        securityContext:
          runAsNonRoot: true
          runAsUser: 10001
          readOnlyRootFilesystem: true
          allowPrivilegeEscalation: false
          capabilities:
            drop: ["ALL"]

EOF
kubectl get pods -n secure
```
</details>
