#!/usr/bin/env bash
# KubeDrill lab pack: Kustomize: base + prod overlay (s25-kustomize)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Kustomize: base + prod overlay"
kubectl create namespace shop --dry-run=client -o yaml | kubectl apply -f -

mkdir -p base
cat > base/deployment.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
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
        image: nginx:1.25
EOF
cat > base/kustomization.yaml <<EOF
resources:
- deployment.yaml
EOF

kubectl config set-context --current --namespace=shop >/dev/null
echo "✔ Ready. Namespace: shop. Read README.md, fix the cluster, then run ./check.sh"
