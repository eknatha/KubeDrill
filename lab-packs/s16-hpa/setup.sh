#!/usr/bin/env bash
# KubeDrill lab pack: Autoscale a Deployment with HPA (s16-hpa)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Autoscale a Deployment with HPA"
kubectl create namespace web --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop
  namespace: web
spec:
  replicas: 1
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
        image: nginx:1.25
        resources:
          requests:
            cpu: 100m

KUBEDRILL_EOF


kubectl config set-context --current --namespace=web >/dev/null
echo "✔ Ready. Namespace: web. Read README.md, fix the cluster, then run ./check.sh"
