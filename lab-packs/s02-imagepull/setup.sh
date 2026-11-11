#!/usr/bin/env bash
# KubeLab lab pack: Prod is down: ImagePullBackOff (s02-imagepull)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Prod is down: ImagePullBackOff"
kubectl create namespace shop --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: shop
spec:
  replicas: 3
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
        image: nginx:1.255

KUBELAB_EOF


kubectl config set-context --current --namespace=shop >/dev/null
echo "✔ Ready. Namespace: shop. Read README.md, fix the cluster, then run ./check.sh"
