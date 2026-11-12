#!/usr/bin/env bash
# KubeDrill lab pack: System hardening: seccomp RuntimeDefault (s109-seccomp-default)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: System hardening: seccomp RuntimeDefault"
kubectl create namespace sys --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: sys

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: sys
spec:
  replicas: 2
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


kubectl config set-context --current --namespace=sys >/dev/null
echo "✔ Ready. Namespace: sys. Read README.md, fix the cluster, then run ./check.sh"
