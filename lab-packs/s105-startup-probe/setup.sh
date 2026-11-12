#!/usr/bin/env bash
# KubeLab lab pack: Slow starter: add a startup probe (s105-startup-probe)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Slow starter: add a startup probe"
kubectl create namespace slow --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: slow

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy
  namespace: slow
spec:
  replicas: 2
  selector:
    matchLabels:
      app: legacy
  template:
    metadata:
      labels:
        app: legacy
    spec:
      containers:
      - name: legacy
        image: nginx:1.25
        livenessProbe:
          httpGet:
            path: /
            port: 80
          periodSeconds: 5
          failureThreshold: 1

KUBELAB_EOF


kubectl config set-context --current --namespace=slow >/dev/null
echo "✔ Ready. Namespace: slow. Read README.md, fix the cluster, then run ./check.sh"
