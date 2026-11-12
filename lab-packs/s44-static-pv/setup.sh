#!/usr/bin/env bash
# KubeDrill lab pack: Bind a PVC to a pre-created PersistentVolume (s44-static-pv)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Bind a PVC to a pre-created PersistentVolume"
kubectl create namespace pvs --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: PersistentVolume
metadata:
  name: archive-pv
spec:
  capacity:
    storage: 5Gi
  accessModes: [ReadWriteOnce]
  storageClassName: manual
  hostPath:
    path: /mnt/archive

KUBEDRILL_EOF


kubectl config set-context --current --namespace=pvs >/dev/null
echo "✔ Ready. Namespace: pvs. Read README.md, fix the cluster, then run ./check.sh"
