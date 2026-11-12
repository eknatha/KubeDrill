#!/usr/bin/env bash
# KubeDrill lab pack: ResourceQuota blocks the rollout (s15-quota-limits)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: ResourceQuota blocks the rollout"
kubectl create namespace team-a --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: ResourceQuota
metadata:
  name: cpu-cap
  namespace: team-a
spec:
  hard:
    requests.cpu: "1"
    requests.memory: 2Gi
    pods: "10"

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: crunch
  namespace: team-a
spec:
  replicas: 4
  selector:
    matchLabels:
      app: crunch
  template:
    metadata:
      labels:
        app: crunch
    spec:
      containers:
      - name: crunch
        image: nginx:1.25
        resources:
          requests:
            cpu: 500m
            memory: 64Mi

KUBEDRILL_EOF


kubectl config set-context --current --namespace=team-a >/dev/null
echo "✔ Ready. Namespace: team-a. Read README.md, fix the cluster, then run ./check.sh"
