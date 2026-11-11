# Incident: the silent database

**Track:** CKA, CKAD · **Level:** Advanced · **Time:** 20 min · **Namespace:** `data`

Incident rules: stabilise first, then fix root causes, change one thing at a time, and write down what you changed. **03:12.** The app reports "connection refused" to its database. Nothing is crashing loudly. Storage, configuration and the network are each broken. Restore `db`, then let `app` talk to it again.

## Tasks

1. **Storage: the claim binds** — 
2. **Configuration: db starts** — 
3. **Network: app may reach db, nobody else** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl describe pvc db-data -n data` — class `fast` missing.
2. Delete and recreate with `storageClassName: standard`.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl describe pod -l app=db -n data` — secret `db-creds` not found.
2. `kubectl create secret generic db-creds --from-literal=password=change-me -n data`
</details>

<details><summary>Task 3 hints</summary>

1. The policy only allows `app=backup`.
2. Add `app=app` as an allowed source — keep the lockdown.
</details>

<details><summary>Solution</summary>

```bash
kubectl delete pvc db-data -n data
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: db-data
  namespace: data
spec:
  storageClassName: standard
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 1Gi
EOF
kubectl create secret generic db-creds --from-literal=password=change-me -n data
kubectl patch networkpolicy db-lockdown -n data --type=json -p '[{"op":"add","path":"/spec/ingress/0/from/-","value":{"podSelector":{"matchLabels":{"app":"app"}}}}]'
kubectl get pods -n data
```
</details>
