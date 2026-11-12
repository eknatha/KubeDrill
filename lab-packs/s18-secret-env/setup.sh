#!/usr/bin/env bash
# KubeDrill lab pack: CreateContainerConfigError: missing Secret (s18-secret-env)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: CreateContainerConfigError: missing Secret"
kubectl create namespace vault --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: billing
  namespace: vault
spec:
  replicas: 2
  selector:
    matchLabels:
      app: billing
  template:
    metadata:
      labels:
        app: billing
    spec:
      containers:
      - name: billing
        image: nginx:1.25
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-creds
              key: password

KUBEDRILL_EOF


kubectl config set-context --current --namespace=vault >/dev/null
echo "✔ Ready. Namespace: vault. Read README.md, fix the cluster, then run ./check.sh"
