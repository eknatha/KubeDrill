# Blue/green switch by Service selector

**Track:** CKAD · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `bg`

Service `live` sends traffic to Deployment `blue` (v1). Deployment `green` (v2) is ready. Cut over to green and then scale blue to 0 (keep it for rollback).

## Tasks

1. **Switch the selector to green** — 
2. **Scale blue to 0 (kept for rollback)** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get svc live -o yaml`
2. `kubectl patch svc live -p '{"spec":{"selector":{"track":"green"}}}'`
3. Verify `kubectl get endpoints live`.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl scale deployment blue --replicas=0`
2. Do not delete it.
3. Rollback = switch the selector back and scale up.
</details>

<details><summary>Solution</summary>

```bash
kubectl patch svc live -n bg -p '{"spec":{"selector":{"track":"green"}}}'
kubectl scale deployment blue --replicas=0 -n bg
kubectl get endpoints live -n bg
```
</details>
