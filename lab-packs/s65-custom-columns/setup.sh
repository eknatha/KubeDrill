#!/usr/bin/env bash
# KubeDrill lab pack: custom-columns and --sort-by (s65-custom-columns)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: custom-columns and --sort-by"
kubectl create namespace cc --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: a
  namespace: cc
spec:
  replicas: 2
  selector:
    matchLabels:
      app: a
  template:
    metadata:
      labels:
        app: a
    spec:
      containers:
      - name: a
        image: nginx:1.25

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: b
  namespace: cc
spec:
  replicas: 1
  selector:
    matchLabels:
      app: b
  template:
    metadata:
      labels:
        app: b
    spec:
      containers:
      - name: b
        image: nginx:1.25

KUBEDRILL_EOF


kubectl config set-context --current --namespace=cc >/dev/null
echo "✔ Ready. Namespace: cc. Read README.md, fix the cluster, then run ./check.sh"
