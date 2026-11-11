#!/usr/bin/env bash
# KubeLab lab pack: Clean up temporary namespaces by label (s68-multi-ns-cleanup)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Clean up temporary namespaces by label"
kubectl create namespace prod --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: tmp-1
  labels:
    env: temp

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: tmp-2
  labels:
    env: temp

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: tmp-3
  labels:
    env: temp

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: prod
  labels:
    env: prod

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: core
  namespace: prod
spec:
  replicas: 1
  selector:
    matchLabels:
      app: core
  template:
    metadata:
      labels:
        app: core
    spec:
      containers:
      - name: core
        image: nginx:1.25

KUBELAB_EOF


kubectl config set-context --current --namespace=prod >/dev/null
echo "✔ Ready. Namespace: prod. Read README.md, fix the cluster, then run ./check.sh"
