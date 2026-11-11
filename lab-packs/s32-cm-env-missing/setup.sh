#!/usr/bin/env bash
# KubeLab lab pack: Missing ConfigMap key breaks the pod (s32-cm-env-missing)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Missing ConfigMap key breaks the pod"
kubectl create namespace cfg --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: site
  namespace: cfg
spec:
  replicas: 2
  selector:
    matchLabels:
      app: site
  template:
    metadata:
      labels:
        app: site
    spec:
      containers:
      - name: site
        image: nginx:1.25
        env:
        - name: THEME
          valueFrom:
            configMapKeyRef:
              name: site-config
              key: theme

KUBELAB_EOF


kubectl config set-context --current --namespace=cfg >/dev/null
echo "✔ Ready. Namespace: cfg. Read README.md, fix the cluster, then run ./check.sh"
