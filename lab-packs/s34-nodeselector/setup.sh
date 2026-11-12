#!/usr/bin/env bash
# KubeDrill lab pack: Pending: nodeSelector matches no node (s34-nodeselector)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Pending: nodeSelector matches no node"
kubectl create namespace sched --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml
  namespace: sched
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ml
  template:
    metadata:
      labels:
        app: ml
    spec:
      nodeSelector:
        gpu: "true"
      containers:
      - name: ml
        image: nginx:1.25

KUBEDRILL_EOF


kubectl config set-context --current --namespace=sched >/dev/null
echo "✔ Ready. Namespace: sched. Read README.md, fix the cluster, then run ./check.sh"
