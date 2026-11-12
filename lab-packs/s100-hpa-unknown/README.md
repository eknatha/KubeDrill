# HPA shows <unknown>: no CPU requests

**Track:** CKA, CKAD · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `scale`

HPA `web` reports `<unknown>/50%` and never scales. A percentage target is measured against the pod's CPU **request**, and the Deployment has none. Fix the Deployment, not the HPA.

## Tasks

1. **Find the cause** — 
2. **Deployment `web` requests 100m CPU** — 
3. **HPA keeps its 2–6 range and 50% target** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get hpa -n scale` shows <unknown>.
2. `kubectl describe hpa web -n scale` mentions missing request.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl set resources deployment web -n scale --requests=cpu=100m`
</details>

<details><summary>Task 3 hints</summary>

1. Do not edit the HPA to "make the warning go away".
</details>

<details><summary>Solution</summary>

```bash
kubectl describe hpa web -n scale
kubectl set resources deployment web -n scale --requests=cpu=100m
kubectl get hpa -n scale
```
</details>
