#!/usr/bin/env bash
# KubeLab lab pack: Canary release: 20% of traffic via replica ratio (s60-canary-weights)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Canary release: 20% of traffic via replica ratio"
kubectl create namespace can --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: stable
  namespace: can
spec:
  replicas: 3
  selector:
    matchLabels:
      app: shop
      track: stable
  template:
    metadata:
      labels:
        app: shop
        track: stable
    spec:
      containers:
      - name: stable
        image: nginx:1.24

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: canary
  namespace: can
spec:
  replicas: 3
  selector:
    matchLabels:
      app: shop
      track: canary
  template:
    metadata:
      labels:
        app: shop
        track: canary
    spec:
      containers:
      - name: canary
        image: nginx:1.25

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Service
metadata:
  name: shop
  namespace: can
spec:
  selector:
    app: shop
  ports:
  - port: 80
    targetPort: 80

KUBELAB_EOF


kubectl config set-context --current --namespace=can >/dev/null
echo "✔ Ready. Namespace: can. Read README.md, fix the cluster, then run ./check.sh"
