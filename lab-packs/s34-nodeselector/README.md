# Pending: nodeSelector matches no node

**Track:** CKA, CKAD · **Level:** Beginner · **Time:** 8 min · **Namespace:** `sched`

Deployment `ml` requires `nodeSelector: gpu=true`, but no node carries that label. Make the pods schedule by labelling worker2 (do not remove the selector).

## Tasks

1. **Label worker2 with gpu=true** — 
2. **Both pods Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl describe pod` → didn't match Pod's node affinity/selector
2. `kubectl get nodes --show-labels`
3. `kubectl label node worker2 gpu=true`
</details>

<details><summary>Task 2 hints</summary>

1. Pending pods are rescheduled automatically.
2. `kubectl get pods -o wide` → all on worker2
3. Leave the nodeSelector as is.
</details>

<details><summary>Solution</summary>

```bash
kubectl label node worker2 gpu=true
kubectl get pods -n sched -o wide
```
</details>
