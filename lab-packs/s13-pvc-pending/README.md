# PVC stuck Pending

**Track:** CKA · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `data`

Pod `store` mounts PVC `store-data`, which asks for StorageClass `fast` — it does not exist in this cluster. Fix the storage so the pod runs.

## Tasks

1. **Find the cause** — `kubectl describe pvc store-data`
2. **PVC Bound and pod Running** — PVC spec is immutable — delete and recreate it with `standard`.

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get pvc,sc`
2. Events say the StorageClass "fast" was not found.
3. List classes: `kubectl get storageclass` — only `standard` exists.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl delete pvc store-data` then apply a new one.
2. The pod stays Pending and will pick the new PVC up.
3. `kubectl get pvc,pod`
</details>

<details><summary>Solution</summary>

```bash
kubectl delete pvc store-data --wait=false
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: store-data
  namespace: data
spec:
  storageClassName: standard
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 1Gi
EOF
```
</details>
