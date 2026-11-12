#!/usr/bin/env bash
# KubeDrill lab pack: PVC stuck Pending (s13-pvc-pending)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: PVC stuck Pending"
kubectl create namespace data --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: store-data
  namespace: data
spec:
  storageClassName: fast
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 1Gi

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: store
  namespace: data
  labels:
    app: store
spec:
  containers:
  - name: store
    image: nginx:1.25
    volumeMounts:
    - {name: d, mountPath: /data}
  volumes:
  - name: d
    persistentVolumeClaim:
      claimName: store-data

KUBEDRILL_EOF


kubectl config set-context --current --namespace=data >/dev/null
echo "✔ Ready. Namespace: data. Read README.md, fix the cluster, then run ./check.sh"
