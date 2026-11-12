#!/usr/bin/env bash
# KubeLab lab pack: Inject config: envFrom and a read-only Secret volume (s106-config-injection)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Inject config: envFrom and a read-only Secret volume"
kubectl create namespace cfg --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: cfg

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: cfg
data:
  MODE: prod
  REGION: eu

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Secret
metadata:
  name: app-creds
  namespace: cfg
stringData:
  token: change-me

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: cfg
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: nginx:1.25

KUBELAB_EOF


kubectl config set-context --current --namespace=cfg >/dev/null
echo "✔ Ready. Namespace: cfg. Read README.md, fix the cluster, then run ./check.sh"
