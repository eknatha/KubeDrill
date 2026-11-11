# Job stuck: ImagePullBackOff

**Track:** CKAD · **Level:** Intermediate · **Time:** 10 min · **Namespace:** `jobs`

Job `migrate` uses image `busybox:1.99.9`, which does not exist, so it never completes. Jobs' pod templates are immutable: delete and recreate it so it completes.

## Tasks

1. **Find the bad image** — 
2. **Job completes (succeeded: 1)** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get pods -n jobs` → ImagePullBackOff
2. `kubectl describe job migrate`
3. The tag does not exist.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl delete job migrate`
2. Re-create with busybox:1.36 (`kubectl create job migrate --image=busybox:1.36 -- sh -c "echo migrated"`).
3. `kubectl get job`
</details>

<details><summary>Solution</summary>

```bash
kubectl delete job migrate -n jobs
kubectl create job migrate --image=busybox:1.36 -n jobs -- sh -c "echo migrated"
kubectl get job -n jobs
```
</details>
