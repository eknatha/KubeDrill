# Pod Security Admission: restricted namespace

**Track:** CKS · **Level:** Advanced · **Time:** 20 min · **Namespace:** `secure`

Namespace `secure` enforces the `restricted` Pod Security Standard. Deployment `app` (plain nginx, root) cannot create pods. Make it compliant — do not weaken the namespace label.

## Tasks

1. **Read the admission error** — `kubectl describe rs -n secure` / `kubectl get events`
2. **Make the Deployment compliant: 2 Ready pods** — Use an unprivileged image (nginxinc/nginx-unprivileged:1.25).

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get events -n secure`
2. The message lists every violated control: allowPrivilegeEscalation, capabilities, runAsNonRoot, seccompProfile.
3. Fix all of them in the container/pod securityContext.
</details>

<details><summary>Task 2 hints</summary>

1. Rewrite the manifest with a heredoc.
2. securityContext: runAsNonRoot: true, seccompProfile.type: RuntimeDefault (pod level); allowPrivilegeEscalation: false, capabilities.drop: [ALL] (container level).
3. nginx as root fails runAsNonRoot — switch to the unprivileged image.
</details>

<details><summary>Solution</summary>

```bash
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  namespace: secure
spec:
  replicas: 2
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
    spec:
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: app
        image: nginxinc/nginx-unprivileged:1.25
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop: ["ALL"]
EOF
kubectl rollout status deployment/app -n secure
```
</details>
