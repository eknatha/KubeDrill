#!/usr/bin/env bash
# KubeDrill lab pack: Incident: three faults, one outage (s28-incident)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Incident: three faults, one outage"
kubectl create namespace prod --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: prod
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: nginx:1.255

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: prod
spec:
  selector:
    app: front
  ports:
  - port: 80
    targetPort: 80

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: prod
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      nodeSelector:
        disk: ssd
      containers:
      - name: api
        image: nginx:1.25

KUBEDRILL_EOF


kubectl config set-context --current --namespace=prod >/dev/null
echo "✔ Ready. Namespace: prod. Read README.md, fix the cluster, then run ./check.sh"
