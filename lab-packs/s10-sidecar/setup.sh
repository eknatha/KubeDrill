#!/usr/bin/env bash
# KubeDrill lab pack: Multi-container pod: log sidecar (s10-sidecar)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Multi-container pod: log sidecar"
kubectl create namespace logs --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: webapp
  namespace: logs
  labels:
    app: webapp
spec:
  containers:
  - name: webapp
    image: nginx:1.25

KUBEDRILL_EOF


kubectl config set-context --current --namespace=logs >/dev/null
echo "✔ Ready. Namespace: logs. Read README.md, fix the cluster, then run ./check.sh"
