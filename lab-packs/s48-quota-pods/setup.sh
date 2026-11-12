#!/usr/bin/env bash
# KubeDrill lab pack: Pod-count quota blocks scaling (s48-quota-pods)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Pod-count quota blocks scaling"
kubectl create namespace qt --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: ResourceQuota
metadata:
  name: count
  namespace: qt
spec:
  hard:
    pods: "3"

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: burst
  namespace: qt
spec:
  replicas: 5
  selector:
    matchLabels:
      app: burst
  template:
    metadata:
      labels:
        app: burst
    spec:
      containers:
      - name: burst
        image: nginx:1.25

KUBEDRILL_EOF


kubectl config set-context --current --namespace=qt >/dev/null
echo "✔ Ready. Namespace: qt. Read README.md, fix the cluster, then run ./check.sh"
