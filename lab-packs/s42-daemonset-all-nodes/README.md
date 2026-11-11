# DaemonSet only runs on one node

**Track:** CKA · **Level:** Intermediate · **Time:** 10 min · **Namespace:** `agents`

DaemonSet `logger` should run on every worker, but its nodeSelector (`role=logging`) matches nothing. Remove the restriction so it runs on both workers.

## Tasks

1. **nodeSelector removed** — 
2. **A logger pod Ready on each worker (2)** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get ds logger` → DESIRED 0
2. `kubectl edit ds logger` or re-apply without nodeSelector
3. Alternatively label both workers role=logging.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl get pods -o wide`
2. DaemonSet controllers place one pod per eligible node.
3. The control-plane node is tainted, so only workers.
</details>

<details><summary>Solution</summary>

```bash
kubectl delete ds logger -n agents
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: logger
  namespace: agents
spec:
  selector:
    matchLabels:
      app: logger
  template:
    metadata:
      labels:
        app: logger
    spec:
      containers:
      - name: logger
        image: busybox:1.36
        command: ["sleep", "3600"]
EOF
kubectl get pods -n agents -o wide
```
</details>
