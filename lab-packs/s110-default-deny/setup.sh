#!/usr/bin/env bash
# KubeDrill lab pack: Default-deny, then allow only what is needed (s110-default-deny)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Default-deny, then allow only what is needed"
kubectl create namespace zt --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: zt

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: db
  namespace: zt
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
  namespace: zt
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
  namespace: zt
  labels:
    role: frontend
spec:
  containers:
  - name: c
    image: busybox:1.36
    command: ["sleep", "3600"]

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: intruder
  namespace: zt
  labels:
    role: intruder
spec:
  containers:
  - name: c
    image: busybox:1.36
    command: ["sleep", "3600"]

KUBEDRILL_EOF


kubectl config set-context --current --namespace=zt >/dev/null
echo "✔ Ready. Namespace: zt. Read README.md, fix the cluster, then run ./check.sh"
