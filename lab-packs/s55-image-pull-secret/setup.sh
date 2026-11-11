#!/usr/bin/env bash
# KubeLab lab pack: ImagePullBackOff from a private registry (s55-image-pull-secret)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: ImagePullBackOff from a private registry"
kubectl create namespace priv --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: billing
  namespace: priv
spec:
  replicas: 1
  selector:
    matchLabels:
      app: billing
  template:
    metadata:
      labels:
        app: billing
    spec:
      containers:
      - name: billing
        image: private.registry.io/billing:1.0

KUBELAB_EOF


kubectl config set-context --current --namespace=priv >/dev/null
echo "✔ Ready. Namespace: priv. Read README.md, fix the cluster, then run ./check.sh"
