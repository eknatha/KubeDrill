# Insufficient memory

**Track:** CKA · **Level:** Beginner · **Time:** 8 min · **Namespace:** `mem`

Deployment `report` requests 64Gi of memory per pod; workers have 8Gi. Pods are Pending. Lower the request to 128Mi.

## Tasks

1. **Request lowered** — 
2. **2 pods Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl describe pod` → Insufficient memory
2. `kubectl set resources deployment/report --requests=memory=128Mi`
3. Nodes have ~8Gi allocatable.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl rollout status deployment/report`
2. `kubectl get pods`
3. Pending pods are replaced by the rollout.
</details>

<details><summary>Solution</summary>

```bash
kubectl set resources deployment/report --requests=memory=128Mi -n mem
kubectl rollout status deployment/report -n mem
```
</details>
