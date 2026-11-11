# ResourceQuota blocks the rollout

**Track:** CKA · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `team-a`

Namespace `team-a` has a ResourceQuota of 1 CPU in requests. Deployment `crunch` wants 4 replicas × 500m, so only 2 pods start. Fit all 4 replicas inside the quota without raising it.

## Tasks

1. **Find the quota error** — `kubectl describe rs` or `kubectl get events`
2. **Run 4 Ready replicas within the quota** — 4 × request must be ≤ 1 CPU.

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get events -n team-a`
2. Look for "exceeded quota: cpu-cap".
3. `kubectl describe quota cpu-cap` shows Used vs Hard.
</details>

<details><summary>Task 2 hints</summary>

1. Lower the per-pod request: 4 × 200m = 800m. Do not edit the quota.
2. Trap: the 2 running pods already fill the quota, so a rolling update cannot create new pods. Scale to 0 first.
3. `kubectl scale deploy crunch --replicas=0`, then `kubectl set resources deployment/crunch --requests=cpu=200m`, then scale back to 4.
</details>

<details><summary>Solution</summary>

```bash
kubectl describe quota cpu-cap
kubectl scale deployment crunch --replicas=0
kubectl set resources deployment/crunch --requests=cpu=200m
kubectl scale deployment crunch --replicas=4
kubectl rollout status deployment/crunch
```
</details>
