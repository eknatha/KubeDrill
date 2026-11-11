# Bind a PVC to a pre-created PersistentVolume

**Track:** CKA · **Level:** Advanced · **Time:** 15 min · **Namespace:** `pvs`

PV `archive-pv` (5Gi, storageClassName `manual`, hostPath /mnt/archive) exists. Create PVC `archive` requesting 2Gi of class `manual` so it binds to that PV.

## Tasks

1. **PVC `archive` (2Gi, class manual)** — 
2. **PVC Bound to archive-pv** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get pv`
2. PVC must have storageClassName: manual and accessModes ReadWriteOnce.
3. Apply with a heredoc in namespace pvs.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl get pvc,pv`
2. Capacity of the PV (5Gi) ≥ request.
3. volumeName shows archive-pv.
</details>

<details><summary>Solution</summary>

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: archive
  namespace: pvs
spec:
  storageClassName: manual
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 2Gi
EOF
kubectl get pvc,pv -n pvs
```
</details>
