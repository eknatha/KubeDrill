#!/usr/bin/env bash
# KubeLab lab pack: Storage: keep the data, allow expansion (s97-pv-retain)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Storage: keep the data, allow expansion"
kubectl create namespace store --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: store

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast
provisioner: rancher.io/local-path
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-reports
spec:
  capacity:
    storage: 1Gi
  accessModes: [ReadWriteOnce]
  persistentVolumeReclaimPolicy: Delete
  storageClassName: fast
  hostPath:
    path: /mnt/reports

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: reports
  namespace: store
spec:
  storageClassName: fast
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 1Gi

KUBELAB_EOF


kubectl config set-context --current --namespace=store >/dev/null
echo "✔ Ready. Namespace: store. Read README.md, fix the cluster, then run ./check.sh"
