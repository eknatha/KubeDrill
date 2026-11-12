# Rollout strategy: never lose capacity

**Track:** CKAD · **Level:** Intermediate · **Time:** 10 min · **Namespace:** `rolls`

Deployment `api` (4 replicas) must never drop below 4 ready pods during an update, and may add at most 1 extra pod. Set the rolling update to `maxSurge: 1`, `maxUnavailable: 0`, then roll out `nginx:1.26`.

## Tasks

1. **Strategy: RollingUpdate, surge 1, unavailable 0** — 
2. **Image updated to nginx:1.26 and 4 pods Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl explain deployment.spec.strategy.rollingUpdate`
2. `kubectl patch deployment api -n rolls -p '{"spec":{"strategy":{"type":"RollingUpdate","rollingUpdate":{"maxSurge":1,"maxUnavailable":0}}}}'`
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl set image deployment/api api=nginx:1.26 -n rolls`
2. Container name is `api` (same as the Deployment).
</details>

<details><summary>Solution</summary>

```bash
kubectl patch deployment api -n rolls -p '{"spec":{"strategy":{"type":"RollingUpdate","rollingUpdate":{"maxSurge":1,"maxUnavailable":0}}}}'
kubectl set image deployment/api api=nginx:1.26 -n rolls
kubectl rollout status deployment/api -n rolls
```
</details>
