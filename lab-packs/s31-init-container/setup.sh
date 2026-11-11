#!/usr/bin/env bash
# KubeLab lab pack: Init:CrashLoopBackOff — failing init container (s31-init-container)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Init:CrashLoopBackOff — failing init container"
kubectl create namespace boot --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  namespace: boot
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
    spec:
      initContainers:
      - name: prep
        image: busybox:1.36
        command: ["sh", "-c", "echo preparing; exit 1"]
      containers:
      - name: app
        image: nginx:1.25

KUBELAB_EOF


kubectl config set-context --current --namespace=boot >/dev/null
echo "✔ Ready. Namespace: boot. Read README.md, fix the cluster, then run ./check.sh"
