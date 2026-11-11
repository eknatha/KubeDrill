#!/usr/bin/env bash
# KubeLab lab pack: Deployed into the wrong namespace (s30-wrong-namespace)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Deployed into the wrong namespace"
kubectl create namespace staging --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace default --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: portal
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: portal
  template:
    metadata:
      labels:
        app: portal
    spec:
      containers:
      - name: portal
        image: nginx:1.25

KUBELAB_EOF


kubectl config set-context --current --namespace=staging >/dev/null
echo "✔ Ready. Namespace: staging. Read README.md, fix the cluster, then run ./check.sh"
