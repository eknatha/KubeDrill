# Critical pods Pending: priority and preemption

**Track:** CKA · **Level:** Advanced · **Time:** 12 min · **Namespace:** `batch`

The workers are full of low-value `filler` pods. The important `payments` Deployment cannot schedule (`Insufficient cpu`). Give it a high **PriorityClass** so the scheduler preempts filler pods.

## Tasks

1. **See why payments is Pending** — 
2. **Use the critical PriorityClass** — 
3. **payments Ready, filler survives partially** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get pods -n batch`
2. `kubectl describe pod -n batch -l app=payments`
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl patch deploy payments -n batch --type=json -p '[{"op":"add","path":"/spec/template/spec/priorityClassName","value":"critical"}]'`
</details>

<details><summary>Task 3 hints</summary>

1. Preemption evicts low-priority pods; their Deployment recreates them.
</details>

<details><summary>Solution</summary>

```bash
kubectl get pods -n batch
kubectl patch deploy payments -n batch --type=json -p '[{"op":"add","path":"/spec/template/spec/priorityClassName","value":"critical"}]'
kubectl get pods -n batch
```
</details>
