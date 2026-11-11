#!/usr/bin/env bash
# KubeLab lab pack: Every node is tainted — add a toleration (s35-taint-toleration)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Every node is tainted — add a toleration"
kubectl create namespace dedic --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: etl
  namespace: dedic
spec:
  replicas: 2
  selector:
    matchLabels:
      app: etl
  template:
    metadata:
      labels:
        app: etl
    spec:
      containers:
      - name: etl
        image: nginx:1.25

KUBELAB_EOF
kubectl taint nodes worker1 team=data:NoSchedule
kubectl taint nodes worker2 team=data:NoSchedule
kubectl rollout restart deployment/etl -n dedic

kubectl config set-context --current --namespace=dedic >/dev/null
echo "✔ Ready. Namespace: dedic. Read README.md, fix the cluster, then run ./check.sh"
