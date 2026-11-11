# HPA points at the wrong Deployment

**Track:** CKA, CKAD · **Level:** Intermediate · **Time:** 10 min · **Namespace:** `scale`

HPA `checkout` targets Deployment `checkot` (typo) so it never scales. Recreate it against Deployment `checkout`: min 2, max 5, 60% CPU.

## Tasks

1. **HPA targets `checkout`** — 
2. **Deployment has ≥2 Ready pods** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl describe hpa checkout` → unable to get target
2. `kubectl delete hpa checkout` then `kubectl autoscale deployment checkout --name=checkout --min=2 --max=5 --cpu-percent=60`
3. scaleTargetRef is not patched easily — recreate.
</details>

<details><summary>Task 2 hints</summary>

1. A working HPA enforces minReplicas.
2. `kubectl get hpa`
3. Wait a few seconds.
</details>

<details><summary>Solution</summary>

```bash
kubectl delete hpa checkout -n scale
kubectl autoscale deployment checkout --name=checkout --min=2 --max=5 --cpu-percent=60 -n scale
kubectl get hpa -n scale
```
</details>
