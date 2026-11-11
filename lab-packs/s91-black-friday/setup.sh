#!/usr/bin/env bash
# KubeLab lab pack: Incident: Black Friday checkout (s91-black-friday)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Incident: Black Friday checkout"
kubectl create namespace shop --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: shop

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: tester
  namespace: shop
  labels:
    run: tester
spec:
  containers:
  - name: tester
    image: busybox:1.36
    command: ["sleep", "3600"]

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: ResourceQuota
metadata:
  name: shop-budget
  namespace: shop
spec:
  hard:
    pods: "4"

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout
  namespace: shop
spec:
  replicas: 4
  selector:
    matchLabels:
      app: checkout
  template:
    metadata:
      labels:
        app: checkout
    spec:
      containers:
      - name: app
        image: nginx:1.255


KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Service
metadata:
  name: checkout
  namespace: shop
spec:
  selector:
    app: check
  ports:
  - port: 80
    targetPort: 80

KUBELAB_EOF


kubectl config set-context --current --namespace=shop >/dev/null
echo "✔ Ready. Namespace: shop. Read README.md, fix the cluster, then run ./check.sh"
