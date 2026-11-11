# Pod Security (baseline) rejects a privileged pod

**Track:** CKS · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `base`

Namespace `base` enforces the `baseline` Pod Security Standard. Deployment `agent` runs a privileged container and cannot start. Make it compliant — do not weaken the namespace label.

## Tasks

1. **Namespace still enforces baseline** — 
2. **agent runs 2 pods, not privileged** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get events -n base`
2. Error mentions privileged.
3. Never relax the label to `privileged`.
</details>

<details><summary>Task 2 hints</summary>

1. Remove `privileged: true` from the container securityContext.
2. Re-apply the Deployment (or `kubectl edit`).
3. Baseline allows root but not privileged/hostPath/hostNetwork.
</details>

<details><summary>Solution</summary>

```bash
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent
  namespace: base
spec:
  replicas: 2
  selector:
    matchLabels:
      app: agent
  template:
    metadata:
      labels:
        app: agent
    spec:
      containers:
      - name: agent
        image: nginx:1.25
EOF
kubectl get pods -n base
```
</details>
