#!/usr/bin/env bash
# KubeLab lab pack: Mount a ConfigMap as a file (s33-cm-volume)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Mount a ConfigMap as a file"
kubectl create namespace files --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: web
  namespace: files
  labels:
    app: web
spec:
  containers:
  - name: web
    image: nginx:1.25

KUBELAB_EOF


kubectl config set-context --current --namespace=files >/dev/null
echo "✔ Ready. Namespace: files. Read README.md, fix the cluster, then run ./check.sh"
