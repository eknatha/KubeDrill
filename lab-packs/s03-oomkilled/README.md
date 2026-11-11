# CrashLoopBackOff: OOMKilled

**Track:** CKA · **Level:** Beginner · **Time:** 12 min · **Namespace:** `batch`

The `worker` Deployment allocates ~150 MiB but has a 100 MiB memory limit. Pods restart forever (exit code 137). Diagnose and fix without changing the image.

## Tasks

1. **Confirm the pods were OOMKilled** — Find "Last State: Terminated, Reason: OOMKilled, Exit Code: 137".
2. **Raise the memory limit to at least 256Mi** — Pods must be Ready afterwards.

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get pods -n batch` shows CrashLoopBackOff and RESTARTS > 0.
2. `kubectl describe pod <name>` → Last State.
3. Exit code 137 = SIGKILL, here from the kernel OOM killer.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl set resources deployment/worker --limits=memory=256Mi`
2. Keep the request ≤ limit.
3. `kubectl get pods -w`
</details>

<details><summary>Solution</summary>

```bash
kubectl set resources deployment/worker --limits=memory=256Mi
kubectl rollout status deployment/worker
```
</details>
