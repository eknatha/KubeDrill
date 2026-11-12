#!/usr/bin/env bash
# KubeDrill lab pack: Expose a Service on a fixed NodePort (s58-nodeport-fixed)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Expose a Service on a fixed NodePort"
kubectl create namespace np --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: site
  namespace: np
spec:
  replicas: 2
  selector:
    matchLabels:
      app: site
  template:
    metadata:
      labels:
        app: site
    spec:
      containers:
      - name: site
        image: nginx:1.25

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Service
metadata:
  name: site
  namespace: np
spec:
  selector:
    app: site
  ports:
  - port: 80
    targetPort: 80

KUBEDRILL_EOF


kubectl config set-context --current --namespace=np >/dev/null
echo "✔ Ready. Namespace: np. Read README.md, fix the cluster, then run ./check.sh"
