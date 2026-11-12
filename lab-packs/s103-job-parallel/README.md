# Job: completions, parallelism and a deadline

**Track:** CKAD · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `jobs2`

Create Job `import` (busybox:1.36, command `echo imported`) that must finish **6** successful runs, **2** at a time, retry a failed pod at most **2** times, and be stopped after **120** seconds. It must restart pods `OnFailure`.

## Tasks

1. **Job exists with 6 completions, 2 parallel** — 
2. **Retries and deadline set** — 
3. **Pods restart OnFailure** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl create job import --image=busybox:1.36 --dry-run=client -o yaml -- echo imported > job.yaml`
2. Add completions: 6 and parallelism: 2 under spec.
</details>

<details><summary>Task 2 hints</summary>

1. `backoffLimit: 2` and `activeDeadlineSeconds: 120` live under the Job spec, not the pod spec.
</details>

<details><summary>Task 3 hints</summary>

1. `spec.template.spec.restartPolicy: OnFailure`
</details>

<details><summary>Solution</summary>

```bash
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: import
  namespace: jobs2
spec:
  completions: 6
  parallelism: 2
  backoffLimit: 2
  activeDeadlineSeconds: 120
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: import
        image: busybox:1.36
        command: ["echo", "imported"]
EOF
kubectl get job import -n jobs2
```
</details>
