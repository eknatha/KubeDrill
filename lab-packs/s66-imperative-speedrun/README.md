# Imperative speed run (CKAD style)

**Track:** CKAD, CKA · **Level:** Beginner · **Time:** 8 min · **Namespace:** `fast`

No YAML, no editor — only imperative commands, as fast as you can. In namespace `fast`: pod `p1` (nginx:1.25, label tier=web); Deployment `api` (httpd:2.4, 3 replicas); Service `api-svc` exposing it on port 80; Job `once` (busybox:1.36, runs `echo hi`).

## Tasks

1. **Pod p1 with label tier=web** — 
2. **Deployment api: httpd:2.4 × 3** — 
3. **Service api-svc on port 80** — 
4. **Job once completes** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl run p1 --image=nginx:1.25 --labels=tier=web -n fast`
2. `kubectl get pods -n fast --show-labels`
3. Use `-n fast` or `kubectl config set-context --current --namespace=fast`.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl create deployment api --image=httpd:2.4 --replicas=3 -n fast`
2. `kubectl get deploy -n fast`
3. Add `--dry-run=client -o yaml` to preview.
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl expose deployment api --name=api-svc --port=80 -n fast`
2. Selector is copied from the Deployment.
3. `kubectl get endpoints api-svc -n fast`
</details>

<details><summary>Task 4 hints</summary>

1. `kubectl create job once --image=busybox:1.36 -n fast -- echo hi`
2. Everything after `--` is the command.
3. `kubectl get job -n fast`
</details>

<details><summary>Solution</summary>

```bash
kubectl run p1 --image=nginx:1.25 --labels=tier=web -n fast
kubectl create deployment api --image=httpd:2.4 --replicas=3 -n fast
kubectl expose deployment api --name=api-svc --port=80 -n fast
kubectl create job once --image=busybox:1.36 -n fast -- echo hi
```
</details>
