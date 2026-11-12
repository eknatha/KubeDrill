#!/usr/bin/env bash
# KubeDrill lab pack: Kustomize: override the image tag (s62-kustomize-images)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Kustomize: override the image tag"
kubectl create namespace img --dry-run=client -o yaml | kubectl apply -f -

mkdir -p base
cat > base/deployment.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
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
        image: nginx:1.24
EOF
cat > base/kustomization.yaml <<EOF
resources:
- deployment.yaml
EOF

kubectl config set-context --current --namespace=img >/dev/null
echo "✔ Ready. Namespace: img. Read README.md, fix the cluster, then run ./check.sh"
