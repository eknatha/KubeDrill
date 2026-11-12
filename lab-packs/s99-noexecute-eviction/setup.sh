#!/usr/bin/env bash
# KubeLab lab pack: NoExecute taint: evict, but spare the critical pod (s99-noexecute-eviction)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: NoExecute taint: evict, but spare the critical pod"
kubectl create namespace edge --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: edge

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments
  namespace: edge
spec:
  replicas: 2
  selector:
    matchLabels:
      app: payments
  template:
    metadata:
      labels:
        app: payments
    spec:
      containers:
      - name: payments
        image: nginx:1.25

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch
  namespace: edge
spec:
  replicas: 2
  selector:
    matchLabels:
      app: batch
  template:
    metadata:
      labels:
        app: batch
    spec:
      containers:
      - name: batch
        image: nginx:1.25

KUBELAB_EOF


kubectl config set-context --current --namespace=edge >/dev/null
echo "✔ Ready. Namespace: edge. Read README.md, fix the cluster, then run ./check.sh"
