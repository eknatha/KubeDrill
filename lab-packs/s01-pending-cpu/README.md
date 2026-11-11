# Prod is down: pods stuck in Pending

**Track:** CKA · **Level:** Beginner · **Time:** 10 min · **Namespace:** `payments`

Someone deployed the `api` Deployment in namespace `payments` with a typo in the CPU request. Pods never start. Find out why and get 2 healthy replicas running.

## Tasks

1. **Find why the pods are Pending** — Use `kubectl describe pod` and read the Events. What does the scheduler say?
2. **Get 2 Ready replicas of `api`** — After the fix the Deployment should have 2 pods Running and Ready.

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get pods` shows Pending. Then `kubectl describe pod <name>` → look at Events.
2. The message says "Insufficient cpu": the pod asks for far more CPU than any node has (nodes have 4 cores).
3. Fix the request: `kubectl set resources deployment/api --requests=cpu=100m,memory=64Mi`
</details>

<details><summary>Task 2 hints</summary>

1. Watch with `kubectl get pods -w` (or re-run `kubectl get pods`).
2. A Deployment recreates pods when its template changes, so just wait a few seconds.
3. Check `kubectl rollout status deployment/api`.
</details>

<details><summary>Solution</summary>

```bash
kubectl describe pod -l app=api | grep -A3 Events
kubectl set resources deployment/api --requests=cpu=100m,memory=64Mi
kubectl rollout status deployment/api
```
</details>
