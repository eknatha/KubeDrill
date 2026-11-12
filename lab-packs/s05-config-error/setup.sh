#!/usr/bin/env bash
# KubeDrill lab pack: CreateContainerConfigError: missing ConfigMap (s05-config-error)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: CreateContainerConfigError: missing ConfigMap"
kubectl create namespace inventory --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  namespace: inventory
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
        env:
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: LOG_LEVEL

KUBEDRILL_EOF


kubectl config set-context --current --namespace=inventory >/dev/null
echo "✔ Ready. Namespace: inventory. Read README.md, fix the cluster, then run ./check.sh"
