#!/usr/bin/env bash
# KubeDrill lab pack: Pod Security: warn and audit before you enforce (s114-psa-rollout)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Pod Security: warn and audit before you enforce"
kubectl create namespace rollout-ns --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: rollout-ns

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  namespace: rollout-ns
spec:
  replicas: 2
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
    spec:
      containers:
      - name: app
        image: nginx:1.25

KUBEDRILL_EOF


kubectl config set-context --current --namespace=rollout-ns >/dev/null
echo "✔ Ready. Namespace: rollout-ns. Read README.md, fix the cluster, then run ./check.sh"
