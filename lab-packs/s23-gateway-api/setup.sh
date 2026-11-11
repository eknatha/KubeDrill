#!/usr/bin/env bash
# KubeLab lab pack: Gateway API: Gateway + HTTPRoute (s23-gateway-api)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Gateway API: Gateway + HTTPRoute"
kubectl create namespace gw --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: gw
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
      - name: web
        image: nginx:1.25

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: gw
spec:
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 80

KUBELAB_EOF


kubectl config set-context --current --namespace=gw >/dev/null
echo "✔ Ready. Namespace: gw. Read README.md, fix the cluster, then run ./check.sh"
