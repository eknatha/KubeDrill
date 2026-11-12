#!/usr/bin/env bash
# KubeLab lab pack: Gateway API: the route attaches to nothing (s102-httproute-fix)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Gateway API: the route attaches to nothing"
kubectl create namespace gw2 --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: gw2

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop
  namespace: gw2
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
        image: nginx:1.25

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Service
metadata:
  name: shop
  namespace: gw2
spec:
  selector:
    app: shop
  ports:
  - port: 80
    targetPort: 80

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: public
  namespace: gw2
spec:
  gatewayClassName: nginx
  listeners:
  - name: http
    port: 80
    protocol: HTTP

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: shop
  namespace: gw2
spec:
  parentRefs:
  - name: public-gw
  hostnames: ["shop.local"]
  rules:
  - backendRefs:
    - name: shop
      port: 8080

KUBELAB_EOF


kubectl config set-context --current --namespace=gw2 >/dev/null
echo "✔ Ready. Namespace: gw2. Read README.md, fix the cluster, then run ./check.sh"
