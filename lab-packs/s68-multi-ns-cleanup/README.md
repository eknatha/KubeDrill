# Clean up temporary namespaces by label

**Track:** CKA · **Level:** Beginner · **Time:** 8 min · **Namespace:** `prod`

CI created namespaces `tmp-1`, `tmp-2`, `tmp-3` (all labelled `env=temp`). Delete them in one command using a label selector — `prod` (env=prod) must survive.

## Tasks

1. **List namespaces by label** — 
2. **All tmp-* namespaces deleted** — 
3. **prod and its Deployment still intact** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get ns -l env=temp`
2. `kubectl get ns --show-labels`
3. Check the selector before deleting!
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl delete ns -l env=temp`
2. Deleting a namespace deletes everything in it.
3. `kubectl get ns`
</details>

<details><summary>Task 3 hints</summary>

1. Only env=temp was selected.
2. `kubectl get deploy -n prod`
3. Never use `--all` on namespaces.
</details>

<details><summary>Solution</summary>

```bash
kubectl get ns -l env=temp
kubectl delete ns -l env=temp
kubectl get deploy -n prod
```
</details>
