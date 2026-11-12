#!/usr/bin/env bash
# KubeDrill lab pack: Rotate a Secret and restart the workload (s56-rollout-restart-secret)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Rotate a Secret and restart the workload"
kubectl create namespace rot --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Secret
metadata:
  name: db-creds
  namespace: rot
stringData:
  password: old

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  namespace: rot
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
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-creds
              key: password

KUBEDRILL_EOF


kubectl config set-context --current --namespace=rot >/dev/null
echo "✔ Ready. Namespace: rot. Read README.md, fix the cluster, then run ./check.sh"
