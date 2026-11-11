#!/usr/bin/env bash
# KubeLab lab pack: Service has no endpoints (s04-no-endpoints)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Service has no endpoints"
kubectl create namespace store --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: store
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
        image: nginx:1.25

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Service
metadata:
  name: frontend-svc
  namespace: store
spec:
  selector:
    app: front-end
  ports:
  - port: 80
    targetPort: 80

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: tester
  namespace: store
  labels:
    run: tester
spec:
  containers:
  - name: tester
    image: busybox:1.36
    command: ["sleep", "3600"]

KUBELAB_EOF


kubectl config set-context --current --namespace=store >/dev/null
echo "✔ Ready. Namespace: store. Read README.md, fix the cluster, then run ./check.sh"
