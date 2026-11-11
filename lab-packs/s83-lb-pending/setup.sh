#!/usr/bin/env bash
# KubeLab lab pack: LoadBalancer stuck on <pending> (s83-lb-pending)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: LoadBalancer stuck on <pending>"
kubectl create namespace shop --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: shop

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: shop
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: app
        image: nginx:1.25


KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: shop
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 80

KUBELAB_EOF


kubectl config set-context --current --namespace=shop >/dev/null
echo "✔ Ready. Namespace: shop. Read README.md, fix the cluster, then run ./check.sh"
