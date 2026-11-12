#!/usr/bin/env bash
# KubeDrill lab pack: Roll back to a specific revision (s39-rollout-revision)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Roll back to a specific revision"
kubectl create namespace rel --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop
  namespace: rel
spec:
  replicas: 2
  selector:
    matchLabels:
      app: shop
  template:
    metadata:
      labels:
        app: shop
    spec:
      containers:
      - name: shop
        image: nginx:1.24

KUBEDRILL_EOF
kubectl set image deployment/shop shop=nginx:1.25 -n rel
kubectl rollout status deployment/shop -n rel
kubectl set image deployment/shop shop=nginx:1.255 -n rel

kubectl config set-context --current --namespace=rel >/dev/null
echo "✔ Ready. Namespace: rel. Read README.md, fix the cluster, then run ./check.sh"
