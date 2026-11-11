#!/usr/bin/env bash
# KubeLab lab pack: Bad rollout: undo, scale, then upgrade (s06-rollout-rollback)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Bad rollout: undo, scale, then upgrade"
kubectl create namespace release --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: site
  namespace: release
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
        image: nginx:1.24

KUBELAB_EOF
kubectl set image deployment/site site=nginx:1.99-bad -n release

kubectl config set-context --current --namespace=release >/dev/null
echo "✔ Ready. Namespace: release. Read README.md, fix the cluster, then run ./check.sh"
