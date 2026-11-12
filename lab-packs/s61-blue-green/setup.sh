#!/usr/bin/env bash
# KubeDrill lab pack: Blue/green switch by Service selector (s61-blue-green)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Blue/green switch by Service selector"
kubectl create namespace bg --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: blue
  namespace: bg
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
      track: blue
  template:
    metadata:
      labels:
        app: web
        track: blue
    spec:
      containers:
      - name: blue
        image: nginx:1.24

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: green
  namespace: bg
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
      track: green
  template:
    metadata:
      labels:
        app: web
        track: green
    spec:
      containers:
      - name: green
        image: nginx:1.25

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Service
metadata:
  name: live
  namespace: bg
spec:
  selector:
    app: web
    track: blue
  ports:
  - port: 80
    targetPort: 80

KUBEDRILL_EOF


kubectl config set-context --current --namespace=bg >/dev/null
echo "✔ Ready. Namespace: bg. Read README.md, fix the cluster, then run ./check.sh"
