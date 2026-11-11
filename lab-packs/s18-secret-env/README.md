# CreateContainerConfigError: missing Secret

**Track:** CKAD · **Level:** Intermediate · **Time:** 10 min · **Namespace:** `vault`

Deployment `billing` reads `DB_PASSWORD` from Secret `db-creds` (key `password`). The Secret was never created, so pods cannot start.

## Tasks

1. **Create Secret `db-creds` with key `password`** — Any value.
2. **Pods become Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl describe pod` shows: secret "db-creds" not found.
2. `kubectl create secret generic db-creds --from-literal=password=s3cret`
3. Use `-n vault`.
</details>

<details><summary>Task 2 hints</summary>

1. The kubelet retries automatically.
2. `kubectl get pods -n vault`
3. If still failing, check the key name is exactly `password`.
</details>

<details><summary>Solution</summary>

```bash
kubectl create secret generic db-creds --from-literal=password=s3cret -n vault
kubectl get pods -n vault
```
</details>
