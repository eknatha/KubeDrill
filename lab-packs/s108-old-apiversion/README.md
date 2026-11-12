# Fix a manifest that uses a removed API version

**Track:** CKAD · **Level:** Intermediate · **Time:** 10 min · **Namespace:** `legacy2`

The file `/home/student/old-cron.yaml` was written years ago for `batch/v1beta1`, which Kubernetes no longer serves. Update it to the current API version and apply it. Use `kubectl api-resources` and `kubectl explain` to confirm the right group and version.

## Tasks

1. **Manifest uses the current apiVersion** — 
2. **CronJob `nightly` applied** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl api-resources | grep cronjobs`
2. The group is `batch`, the version `v1`.
3. `sed -i s#batch/v1beta1#batch/v1# /home/student/old-cron.yaml`
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl apply -f /home/student/old-cron.yaml`
</details>

<details><summary>Solution</summary>

```bash
kubectl api-resources
sed -i s#batch/v1beta1#batch/v1# /home/student/old-cron.yaml
kubectl apply -f /home/student/old-cron.yaml
```
</details>
