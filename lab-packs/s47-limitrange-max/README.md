# LimitRange rejects the pod

**Track:** CKA · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `lr`

Namespace `lr` has a LimitRange capping each container at 500m CPU. Deployment `heavy` asks for 2 CPU and its pods are rejected. Lower the CPU limit to 400m (and request 200m).

## Tasks

1. **Understand the admission error** — 
2. **heavy runs 2 Ready pods within the cap** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get events -n lr`
2. maximum cpu usage per Container is 500m
3. `kubectl describe limitrange caps`
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl set resources deployment/heavy --requests=cpu=200m --limits=cpu=400m`
2. Do not edit the LimitRange.
3. `kubectl rollout status deployment/heavy`
</details>

<details><summary>Solution</summary>

```bash
kubectl get events -n lr
kubectl set resources deployment/heavy --requests=cpu=200m --limits=cpu=400m -n lr
kubectl rollout status deployment/heavy -n lr
```
</details>
