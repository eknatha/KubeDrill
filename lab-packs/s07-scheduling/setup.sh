#!/usr/bin/env bash
# KubeDrill lab pack: Taints, tolerations and nodeSelector (s07-scheduling)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Taints, tolerations and nodeSelector"
kubectl create namespace ml --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trainer
  namespace: ml
spec:
  replicas: 2
  selector:
    matchLabels:
      app: trainer
  template:
    metadata:
      labels:
        app: trainer
    spec:
      nodeSelector:
        accelerator: gpu
      containers:
      - name: trainer
        image: nginx:1.25

KUBEDRILL_EOF
kubectl taint nodes worker1 dedicated=ml:NoSchedule

kubectl config set-context --current --namespace=ml >/dev/null
echo "✔ Ready. Namespace: ml. Read README.md, fix the cluster, then run ./check.sh"
