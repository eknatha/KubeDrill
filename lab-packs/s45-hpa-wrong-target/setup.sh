#!/usr/bin/env bash
# KubeDrill lab pack: HPA points at the wrong Deployment (s45-hpa-wrong-target)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: HPA points at the wrong Deployment"
kubectl create namespace scale --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout
  namespace: scale
spec:
  replicas: 1
  selector:
    matchLabels:
      app: checkout
  template:
    metadata:
      labels:
        app: checkout
    spec:
      containers:
      - name: checkout
        image: nginx:1.25
        resources:
          requests:
            cpu: 100m

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: checkout
  namespace: scale
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: checkot
  minReplicas: 2
  maxReplicas: 5
  metrics:
  - type: Resource
    resource:
      name: cpu
      target: {type: Utilization, averageUtilization: 60}

KUBEDRILL_EOF


kubectl config set-context --current --namespace=scale >/dev/null
echo "✔ Ready. Namespace: scale. Read README.md, fix the cluster, then run ./check.sh"
