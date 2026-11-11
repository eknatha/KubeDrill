#!/usr/bin/env bash
# KubeLab lab pack: Spread replicas with pod anti-affinity (s37-pod-antiaffinity)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Spread replicas with pod anti-affinity"
kubectl create namespace spread --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: front
  namespace: spread
spec:
  replicas: 2
  selector:
    matchLabels:
      app: front
  template:
    metadata:
      labels:
        app: front
    spec:
      containers:
      - name: front
        image: nginx:1.25

KUBELAB_EOF


kubectl config set-context --current --namespace=spread >/dev/null
echo "✔ Ready. Namespace: spread. Read README.md, fix the cluster, then run ./check.sh"
