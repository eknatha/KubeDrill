#!/usr/bin/env bash
# KubeLab lab pack: High availability: PDB + topology spread (s20-pdb-spread)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: High availability: PDB + topology spread"
kubectl create namespace ha --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout
  namespace: ha
spec:
  replicas: 3
  selector:
    matchLabels:
      app: checkout
  template:
    metadata:
      labels:
        app: checkout
    spec:
      containers:
      - name: checkout
        image: nginx:1.25

KUBELAB_EOF


kubectl config set-context --current --namespace=ha >/dev/null
echo "✔ Ready. Namespace: ha. Read README.md, fix the cluster, then run ./check.sh"
