# Scan images and replace the vulnerable ones

**Track:** CKS · **Level:** Advanced · **Time:** 15 min · **Namespace:** `scan`

Deployments `web` (nginx:1.19) and `cache` (redis:6.0) run old images with CRITICAL CVEs. Scan them with `trivy image`, then switch both to the slim alpine variants (nginx:1.27-alpine, redis:7-alpine).

## Tasks

1. **Scan the images** — `trivy image nginx:1.19`
2. **Both Deployments on the alpine images, Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `trivy image nginx:1.19`
2. Note the CRITICAL count.
3. Compare with `trivy image nginx:1.27-alpine`.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl set image deployment/web web=nginx:1.27-alpine`
2. `kubectl set image deployment/cache cache=redis:7-alpine`
3. `kubectl get pods -n scan`
</details>

<details><summary>Solution</summary>

```bash
trivy image nginx:1.19
trivy image nginx:1.27-alpine
kubectl set image deployment/web web=nginx:1.27-alpine
kubectl set image deployment/cache cache=redis:7-alpine
kubectl get pods
```
</details>
