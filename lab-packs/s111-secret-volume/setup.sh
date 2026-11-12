#!/usr/bin/env bash
# KubeDrill lab pack: Stop leaking secrets through env vars (s111-secret-volume)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Stop leaking secrets through env vars"
kubectl create namespace vault --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: vault

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Secret
metadata:
  name: db-pass
  namespace: vault
stringData:
  password: change-me

KUBEDRILL_EOF
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
              name: db-pass
              key: password

KUBEDRILL_EOF


kubectl config set-context --current --namespace=vault >/dev/null
echo "✔ Ready. Namespace: vault. Read README.md, fix the cluster, then run ./check.sh"
