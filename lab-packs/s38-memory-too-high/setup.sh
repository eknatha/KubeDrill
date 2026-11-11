#!/usr/bin/env bash
# KubeLab lab pack: Insufficient memory (s38-memory-too-high)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Insufficient memory"
kubectl create namespace mem --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: report
  namespace: mem
spec:
  replicas: 2
  selector:
    matchLabels:
      app: report
  template:
    metadata:
      labels:
        app: report
    spec:
      containers:
      - name: report
        image: nginx:1.25
        resources:
          requests:
            memory: 64Gi

KUBELAB_EOF


kubectl config set-context --current --namespace=mem >/dev/null
echo "✔ Ready. Namespace: mem. Read README.md, fix the cluster, then run ./check.sh"
