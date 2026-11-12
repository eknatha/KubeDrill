#!/usr/bin/env bash
# KubeDrill lab pack: Pod Security Admission: restricted namespace (s21-psa-restricted)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Pod Security Admission: restricted namespace"
kubectl create namespace secure --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: secure
  labels:
    pod-security.kubernetes.io/enforce: restricted

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  namespace: secure
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

KUBEDRILL_EOF


kubectl config set-context --current --namespace=secure >/dev/null
echo "✔ Ready. Namespace: secure. Read README.md, fix the cluster, then run ./check.sh"
