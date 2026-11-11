# Roll back to a specific revision

**Track:** CKAD · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `rel`

Deployment `shop` went nginx:1.24 → 1.25 → a broken tag. The last good version people trust is revision 1 (nginx:1.24). Roll back to that exact revision.

## Tasks

1. **Inspect the history** — 
2. **Running nginx:1.24 with 2 Ready pods** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl rollout history deployment/shop`
2. `kubectl rollout history deployment/shop --revision=1`
3. Revision numbers increase with each template change.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl rollout undo deployment/shop --to-revision=1`
2. `kubectl rollout status deployment/shop`
3. Verify with `kubectl get deploy shop -o wide`.
</details>

<details><summary>Solution</summary>

```bash
kubectl rollout history deployment/shop -n rel
kubectl rollout undo deployment/shop --to-revision=1 -n rel
kubectl rollout status deployment/shop -n rel
```
</details>
