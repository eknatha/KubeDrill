#!/usr/bin/env bash
# KubeLab lab pack: LimitRange rejects the pod (s47-limitrange-max)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: LimitRange rejects the pod"
kubectl create namespace lr --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: LimitRange
metadata:
  name: caps
  namespace: lr
spec:
  limits:
  - type: Container
    max:
      cpu: 500m

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: heavy
  namespace: lr
spec:
  replicas: 2
  selector:
    matchLabels:
      app: heavy
  template:
    metadata:
      labels:
        app: heavy
    spec:
      containers:
      - name: heavy
        image: nginx:1.25
        resources:
          requests:
            cpu: "1"
          limits:
            cpu: "2"

KUBELAB_EOF


kubectl config set-context --current --namespace=lr >/dev/null
echo "✔ Ready. Namespace: lr. Read README.md, fix the cluster, then run ./check.sh"
