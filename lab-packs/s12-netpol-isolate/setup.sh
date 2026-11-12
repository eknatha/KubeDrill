#!/usr/bin/env bash
# KubeDrill lab pack: NetworkPolicy: lock down the database (s12-netpol-isolate)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: NetworkPolicy: lock down the database"
kubectl create namespace app --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: db
  namespace: app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: db
  template:
    metadata:
      labels:
        app: db
    spec:
      containers:
      - name: db
        image: nginx:1.25

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Service
metadata:
  name: db
  namespace: app
spec:
  selector:
    app: db
  ports:
  - port: 80
    targetPort: 80

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: frontend
  namespace: app
  labels:
    role: frontend
spec:
  containers:
  - name: frontend
    image: busybox:1.36
    command: ["sleep", "3600"]

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: intruder
  namespace: app
  labels:
    role: intruder
spec:
  containers:
  - name: intruder
    image: busybox:1.36
    command: ["sleep", "3600"]

KUBEDRILL_EOF


kubectl config set-context --current --namespace=app >/dev/null
echo "✔ Ready. Namespace: app. Read README.md, fix the cluster, then run ./check.sh"
