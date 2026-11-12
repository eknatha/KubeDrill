# Stop leaking secrets through env vars

**Track:** CKS, CKAD · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `vault`

Deployment `billing` reads its database password from an environment variable, where it shows up in `describe`, process listings and crash dumps. Mount Secret `db-pass` as a read-only volume at `/etc/db` with file mode `0400`, and remove the env var.

## Tasks

1. **Secret mounted as a volume with defaultMode 0400** — 
2. **Mounted read-only at /etc/db** — 
3. **No DB_PASSWORD env var, pods Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `volumes: [{name: db, secret: {secretName: db-pass, defaultMode: 256}}]` (0400 octal = 256 decimal)
2. In YAML you can write `defaultMode: 0400`.
</details>

<details><summary>Task 2 hints</summary>

1. volumeMounts: mountPath /etc/db, readOnly: true
</details>

<details><summary>Task 3 hints</summary>

1. Remove the whole `env` list.
</details>

<details><summary>Solution</summary>

```bash
kubectl patch deployment billing -n vault --type=json -p '[{"op":"remove","path":"/spec/template/spec/containers/0/env"},{"op":"add","path":"/spec/template/spec/volumes","value":[{"name":"db","secret":{"secretName":"db-pass","defaultMode":256}}]},{"op":"add","path":"/spec/template/spec/containers/0/volumeMounts","value":[{"name":"db","mountPath":"/etc/db","readOnly":true}]}]'
kubectl rollout status deployment/billing -n vault
```
</details>
