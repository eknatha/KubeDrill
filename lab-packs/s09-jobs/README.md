# Jobs and CronJobs

**Track:** CKAD · **Level:** Beginner · **Time:** 12 min · **Namespace:** `jobs`

Create a one-off Job that runs 3 times, and a CronJob that runs every 5 minutes. Tip: generate YAML with `--dry-run=client -o yaml`, edit with sed or the editor, then apply.

## Tasks

1. **Job `report`: busybox:1.36, runs `echo done`, completions=3** — restartPolicy must be Never or OnFailure.
2. **The Job finishes with 3 successful pods** — 
3. **CronJob `cleanup`: schedule `*/5 * * * *`, image busybox:1.36** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl create job report --image=busybox:1.36 --dry-run=client -o yaml -- echo done > job.yaml`
2. Edit job.yaml: add `completions: 3` under spec (`vi job.yaml`, or `sed -i` to insert).
3. `kubectl apply -f job.yaml`
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl get pods`
2. `kubectl get job report`
3. Pods show Completed.
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl create cronjob cleanup --image=busybox:1.36 --schedule="*/5 * * * *" -- echo cleaning`
2. Check with `kubectl get cronjob`.
3. Trigger manually: `kubectl create job --from=cronjob/cleanup manual-1`.
</details>

<details><summary>Solution</summary>

```bash
kubectl create job report --image=busybox:1.36 --dry-run=client -o yaml -- echo done > job.yaml
sed -i "s/^spec:/spec:\n  completions: 3/" job.yaml
kubectl apply -f job.yaml
kubectl create cronjob cleanup --image=busybox:1.36 --schedule="*/5 * * * *" -- echo cleaning
```
</details>
