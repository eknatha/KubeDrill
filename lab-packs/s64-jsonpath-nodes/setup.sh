#!/usr/bin/env bash
# KubeLab lab pack: JSONPath: extract node names and images (s64-jsonpath-nodes)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: JSONPath: extract node names and images"
kubectl create namespace jp --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: jp
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

KUBELAB_EOF


kubectl config set-context --current --namespace=jp >/dev/null
echo "✔ Ready. Namespace: jp. Read README.md, fix the cluster, then run ./check.sh"
