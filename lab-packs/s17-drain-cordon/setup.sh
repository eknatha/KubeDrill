#!/usr/bin/env bash
# KubeLab lab pack: Node maintenance: cordon and drain (s17-drain-cordon)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Node maintenance: cordon and drain"
kubectl create namespace app --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: svc
  namespace: app
spec:
  replicas: 4
  selector:
    matchLabels:
      app: svc
  template:
    metadata:
      labels:
        app: svc
    spec:
      containers:
      - name: svc
        image: nginx:1.25

KUBELAB_EOF


kubectl config set-context --current --namespace=app >/dev/null
echo "✔ Ready. Namespace: app. Read README.md, fix the cluster, then run ./check.sh"
