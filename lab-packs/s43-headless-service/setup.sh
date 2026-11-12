#!/usr/bin/env bash
# KubeDrill lab pack: StatefulSet needs a headless Service (s43-headless-service)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: StatefulSet needs a headless Service"
kubectl create namespace ss --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: store
  namespace: ss
spec:
  serviceName: store-hl
  replicas: 2
  selector:
    matchLabels:
      app: store
  template:
    metadata:
      labels:
        app: store
    spec:
      containers:
      - name: store
        image: nginx:1.25

KUBEDRILL_EOF


kubectl config set-context --current --namespace=ss >/dev/null
echo "✔ Ready. Namespace: ss. Read README.md, fix the cluster, then run ./check.sh"
