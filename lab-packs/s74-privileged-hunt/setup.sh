#!/usr/bin/env bash
# KubeDrill lab pack: Hunt the privileged workloads (s74-privileged-hunt)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Hunt the privileged workloads"
kubectl create namespace payments --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: payments

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ledger
  namespace: payments
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ledger
  template:
    metadata:
      labels:
        app: ledger
    spec:
      containers:
      - name: app
        image: nginx:1.25
        securityContext:
          privileged: true


KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: reports
  namespace: payments
spec:
  replicas: 1
  selector:
    matchLabels:
      app: reports
  template:
    metadata:
      labels:
        app: reports
    spec:
      hostPID: true
      containers:
      - name: app
        image: nginx:1.25


KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cache
  namespace: payments
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cache
  template:
    metadata:
      labels:
        app: cache
    spec:
      containers:
      - name: app
        image: nginx:1.25
        volumeMounts:
        - name: sock
          mountPath: /var/run/docker.sock
      volumes:
      - name: sock
        hostPath:
          path: /var/run/docker.sock


KUBEDRILL_EOF


kubectl config set-context --current --namespace=payments >/dev/null
echo "✔ Ready. Namespace: payments. Read README.md, fix the cluster, then run ./check.sh"
