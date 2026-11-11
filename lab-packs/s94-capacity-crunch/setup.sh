#!/usr/bin/env bash
# KubeLab lab pack: Incident: capacity crunch (s94-capacity-crunch)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Incident: capacity crunch"
kubectl create namespace prod --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: prod

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders
  namespace: prod
spec:
  replicas: 4
  selector:
    matchLabels:
      app: orders
  template:
    metadata:
      labels:
        app: orders
    spec:
      priorityClassName: gold
      containers:
      - name: app
        image: nginx:1.25
        resources:
          requests:
            cpu: "3"
            memory: 64Mi


KUBELAB_EOF
kubectl cordon worker1

kubectl config set-context --current --namespace=prod >/dev/null
echo "✔ Ready. Namespace: prod. Read README.md, fix the cluster, then run ./check.sh"
