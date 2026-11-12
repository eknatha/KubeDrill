#!/usr/bin/env bash
# KubeDrill lab pack: PodDisruptionBudget blocks a node drain (s46-pdb-blocks-drain)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: PodDisruptionBudget blocks a node drain"
kubectl create namespace maint --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: guarded
  namespace: maint
spec:
  replicas: 3
  selector:
    matchLabels:
      app: guarded
  template:
    metadata:
      labels:
        app: guarded
    spec:
      containers:
      - name: guarded
        image: nginx:1.25

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: guard
  namespace: maint
spec:
  minAvailable: 3
  selector:
    matchLabels:
      app: guarded

KUBEDRILL_EOF


kubectl config set-context --current --namespace=maint >/dev/null
echo "✔ Ready. Namespace: maint. Read README.md, fix the cluster, then run ./check.sh"
