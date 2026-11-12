#!/usr/bin/env bash
# KubeDrill lab pack: Rollout strategy: never lose capacity (s107-rolling-strategy)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Rollout strategy: never lose capacity"
kubectl create namespace rolls --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: rolls

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: rolls
spec:
  replicas: 4
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: nginx:1.25

KUBEDRILL_EOF


kubectl config set-context --current --namespace=rolls >/dev/null
echo "✔ Ready. Namespace: rolls. Read README.md, fix the cluster, then run ./check.sh"
