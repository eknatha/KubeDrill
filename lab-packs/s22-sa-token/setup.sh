#!/usr/bin/env bash
# KubeDrill lab pack: Harden ServiceAccount token mounting (s22-sa-token)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Harden ServiceAccount token mounting"
kubectl create namespace hardening --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: hardening
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
        image: nginx:1.25

KUBEDRILL_EOF


kubectl config set-context --current --namespace=hardening >/dev/null
echo "✔ Ready. Namespace: hardening. Read README.md, fix the cluster, then run ./check.sh"
