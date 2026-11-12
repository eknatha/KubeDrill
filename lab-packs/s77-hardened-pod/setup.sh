#!/usr/bin/env bash
# KubeDrill lab pack: Harden a pod's securityContext (s77-hardened-pod)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Harden a pod's securityContext"
kubectl create namespace secure --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: secure

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: secure
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
      - name: app
        image: nginx:1.25


KUBEDRILL_EOF


kubectl config set-context --current --namespace=secure >/dev/null
echo "✔ Ready. Namespace: secure. Read README.md, fix the cluster, then run ./check.sh"
