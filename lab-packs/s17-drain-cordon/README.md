# Node maintenance: cordon and drain

**Track:** CKA · **Level:** Intermediate · **Time:** 10 min · **Namespace:** `app`

worker1 needs a kernel upgrade. Move all workloads off it safely (DaemonSet pods stay), keep all 4 `svc` replicas running, and leave the node unschedulable.

## Tasks

1. **Drain worker1** — DaemonSet pods cannot be evicted — tell kubectl to ignore them.
2. **All 4 replicas still Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl drain --help`
2. `kubectl drain worker1 --ignore-daemonsets --delete-emptydir-data`
3. Drain cordons the node first.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl get pods -o wide`
2. Evicted pods are recreated on worker2.
3. worker2 has enough capacity.
</details>

<details><summary>Solution</summary>

```bash
kubectl drain worker1 --ignore-daemonsets --delete-emptydir-data
kubectl get pods -o wide
```
</details>
