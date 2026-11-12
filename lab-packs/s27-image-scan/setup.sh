#!/usr/bin/env bash
# KubeDrill lab pack: Scan images and replace the vulnerable ones (s27-image-scan)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Scan images and replace the vulnerable ones"
kubectl create namespace scan --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: scan
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: nginx:1.19

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cache
  namespace: scan
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cache
  template:
    metadata:
      labels:
        app: cache
    spec:
      containers:
      - name: cache
        image: redis:6.0

KUBEDRILL_EOF


kubectl config set-context --current --namespace=scan >/dev/null
echo "✔ Ready. Namespace: scan. Read README.md, fix the cluster, then run ./check.sh"
