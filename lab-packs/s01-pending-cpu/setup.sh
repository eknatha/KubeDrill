#!/usr/bin/env bash
# KubeDrill lab pack: Prod is down: pods stuck in Pending (s01-pending-cpu)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Prod is down: pods stuck in Pending"
kubectl create namespace payments --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: payments
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: nginx:1.25
        resources:
          requests:
            cpu: "64"
            memory: 64Mi

KUBEDRILL_EOF


kubectl config set-context --current --namespace=payments >/dev/null
echo "✔ Ready. Namespace: payments. Read README.md, fix the cluster, then run ./check.sh"
