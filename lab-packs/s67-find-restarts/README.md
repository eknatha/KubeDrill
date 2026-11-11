# Find the pod that keeps restarting

**Track:** CKA, CKAD · **Level:** Intermediate · **Time:** 10 min · **Namespace:** `rs`

Several pods run in namespace `rs`, but one keeps crashing. Find it using `--sort-by` on the restart count and write its name to `answer.txt` (e.g. `pod/xyz` or just `xyz`).

## Tasks

1. **answer.txt names the crashing pod** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get pods -n rs`
2. `kubectl get pods -n rs --sort-by=.status.containerStatuses[0].restartCount -o name | tail -1 > answer.txt`
3. Look at RESTARTS and STATUS columns.
</details>

<details><summary>Solution</summary>

```bash
kubectl get pods -n rs
kubectl get pods -n rs --sort-by=.status.containerStatuses[0].restartCount -o name | tail -1 > answer.txt
```
</details>
