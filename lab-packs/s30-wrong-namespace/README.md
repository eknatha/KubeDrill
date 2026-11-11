# Deployed into the wrong namespace

**Track:** CKA, CKAD · **Level:** Beginner · **Time:** 8 min · **Namespace:** `staging`

The team lead asked for Deployment `portal` in namespace `staging`, but it was created in `default`. Move it: it must exist in `staging` (3 replicas, nginx:1.25) and be gone from `default`.

## Tasks

1. **portal runs in staging with 3 ready pods** — 
2. **portal removed from default** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get deploy -A | grep portal`
2. Create it again with `-n staging`.
3. `kubectl create deployment portal --image=nginx:1.25 --replicas=3 -n staging`
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl delete deployment portal -n default`
2. Check `kubectl get deploy -n default`.
3. Namespaces isolate names: both could exist, but only one is wanted.
</details>

<details><summary>Solution</summary>

```bash
kubectl create deployment portal --image=nginx:1.25 --replicas=3 -n staging
kubectl delete deployment portal -n default
```
</details>
