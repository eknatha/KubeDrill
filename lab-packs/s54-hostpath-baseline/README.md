# hostPath volume blocked by Pod Security

**Track:** CKS · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `hp`

Namespace `hp` enforces `baseline`. Deployment `logger` mounts a hostPath volume (`/var/log`) and is rejected. Replace it with an emptyDir volume.

## Tasks

1. **Understand why pods fail** — 
2. **logger Ready with emptyDir** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get events -n hp`
2. violates PodSecurity "baseline:latest": hostPath volumes
3. The cure is a different volume type.
</details>

<details><summary>Task 2 hints</summary>

1. Rewrite volumes: [{name: logs, emptyDir: {}}].
2. Apply the manifest again.
3. `kubectl get pods -n hp`
</details>

<details><summary>Solution</summary>

```bash
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: logger
  namespace: hp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: logger
  template:
    metadata:
      labels:
        app: logger
    spec:
      volumes:
      - name: logs
        emptyDir: {}
      containers:
      - name: logger
        image: nginx:1.25
        volumeMounts:
        - {name: logs, mountPath: /logs}
EOF
kubectl get pods -n hp
```
</details>
