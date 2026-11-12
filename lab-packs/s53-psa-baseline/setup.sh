#!/usr/bin/env bash
# KubeDrill lab pack: Pod Security (baseline) rejects a privileged pod (s53-psa-baseline)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Pod Security (baseline) rejects a privileged pod"
kubectl create namespace base --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: base
  labels:
    pod-security.kubernetes.io/enforce: baseline

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent
  namespace: base
spec:
  replicas: 2
  selector:
    matchLabels:
      app: agent
  template:
    metadata:
      labels:
        app: agent
    spec:
      containers:
      - name: agent
        image: nginx:1.25
        securityContext:
          privileged: true

KUBEDRILL_EOF


kubectl config set-context --current --namespace=base >/dev/null
echo "✔ Ready. Namespace: base. Read README.md, fix the cluster, then run ./check.sh"
