# Pin and vet container images

**Track:** CKS · **Level:** Intermediate · **Time:** 10 min · **Namespace:** `prod`

The security review flagged three Deployments in `prod`: one uses `:latest`, one has **no tag** at all, and one pulls from an untrusted registry (`evil.example.com`). Policy: only `nginx:1.25.5` from Docker Hub is approved for these services.

## Tasks

1. **No :latest or untagged images** — 
2. **Nothing from the untrusted registry** — 
3. **All pods healthy** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get deploy -n prod -o jsonpath='{range .items[*]}{.metadata.name}{" "}{..image}{"\n"}{end}'`
2. `kubectl set image deploy/web app=nginx:1.25.5 -n prod`
</details>

<details><summary>Task 2 hints</summary>

1. Replace the image on `worker` too.
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl rollout status deploy/web -n prod`
</details>

<details><summary>Solution</summary>

```bash
kubectl set image deploy/web app=nginx:1.25.5 -n prod
kubectl set image deploy/api app=nginx:1.25.5 -n prod
kubectl set image deploy/worker app=nginx:1.25.5 -n prod
kubectl get pods -n prod
```
</details>
