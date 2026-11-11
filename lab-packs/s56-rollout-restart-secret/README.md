# Rotate a Secret and restart the workload

**Track:** CKAD · **Level:** Beginner · **Time:** 10 min · **Namespace:** `rot`

Secret `db-creds` holds the old password. Rotate it to `rotated`, then make Deployment `app` pick it up — env vars are read only at pod start, so the pods must be restarted (without editing the Deployment spec by hand).

## Tasks

1. **Secret password is `rotated`** — 
2. **Deployment restarted; 2 pods Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl create secret generic db-creds --from-literal=password=rotated` (delete the old one first, or use `--dry-run=client -o yaml | kubectl apply -f -`)
2. `kubectl get secret db-creds -o jsonpath='{.data.password}' | base64 -d`
3. Namespace `rot`.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl rollout restart deployment/app`
2. `kubectl rollout status deployment/app`
3. Stamps a restartedAt annotation on the pod template.
</details>

<details><summary>Solution</summary>

```bash
kubectl delete secret db-creds -n rot
kubectl create secret generic db-creds --from-literal=password=rotated -n rot
kubectl rollout restart deployment/app -n rot
kubectl rollout status deployment/app -n rot
```
</details>
