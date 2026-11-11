# Incident: three faults, one outage

**Track:** CKA, CKAD · **Level:** Expert · **Time:** 30 min · **Namespace:** `prod`

The storefront is down. Namespace `prod` has three independent problems: `frontend` pods will not start, Service `frontend` routes to nothing, and `api` pods never get scheduled. Find and fix all three.

## Tasks

1. **frontend pods Ready** — 
2. **Service `frontend` has endpoints** — 
3. **api pods Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. ImagePullBackOff? Check the tag.
2. `kubectl describe pod -l app=frontend`
3. `kubectl set image deployment/frontend frontend=nginx:1.25`
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl get endpoints frontend`
2. Compare `kubectl get svc frontend -o wide` selector with the pod labels.
3. Patch the selector to app=frontend.
</details>

<details><summary>Task 3 hints</summary>

1. Pending with "didn't match Pod's node affinity/selector".
2. `kubectl get nodes --show-labels` — no node has disk=ssd.
3. Either label a node (`kubectl label node worker1 disk=ssd`) or remove the nodeSelector.
</details>

<details><summary>Solution</summary>

```bash
kubectl set image deployment/frontend frontend=nginx:1.25
kubectl patch svc frontend -p '{"spec":{"selector":{"app":"frontend"}}}'
kubectl label node worker1 disk=ssd
kubectl rollout status deployment/frontend
```
</details>
