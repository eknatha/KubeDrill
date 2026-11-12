# Drain a node that holds a bare pod

**Track:** CKA · **Level:** Advanced · **Time:** 12 min · **Namespace:** `ops`

worker1 is going for maintenance. Besides a Deployment it hosts a standalone pod `legacy-job` that no controller will recreate. The drain refuses. Decide what to do with the bare pod, drain the node, and keep the Deployment fully available.

## Tasks

1. **Drain worker1 (DaemonSet pods ignored)** — 
2. **All 4 `api` replicas still Ready** — 
3. **Return worker1 to service** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl drain worker1 --ignore-daemonsets --delete-emptydir-data` fails on the bare pod.
2. The pod has no owner. Add `--force` only after you accept losing it.
</details>

<details><summary>Task 2 hints</summary>

1. Evicted pods are rescheduled on worker2.
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl uncordon worker1`
</details>

<details><summary>Solution</summary>

```bash
kubectl drain worker1 --ignore-daemonsets --delete-emptydir-data --force
kubectl get pods -n ops -o wide
kubectl uncordon worker1
```
</details>
