#!/usr/bin/env bash
# KubeLab lab pack: Service reachable but requests fail: wrong targetPort (s29-svc-targetport)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Service reachable but requests fail: wrong targetPort"
kubectl create namespace route --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: route
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
      containers:
      - name: api
        image: nginx:1.25

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: route
spec:
  selector:
    app: api
  ports:
  - port: 80
    targetPort: 8080

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: tester
  namespace: route
  labels:
    run: tester
spec:
  containers:
  - name: tester
    image: busybox:1.36
    command: ["sleep", "3600"]

KUBELAB_EOF


kubectl config set-context --current --namespace=route >/dev/null
echo "✔ Ready. Namespace: route. Read README.md, fix the cluster, then run ./check.sh"
