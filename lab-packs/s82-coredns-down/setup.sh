#!/usr/bin/env bash
# KubeLab lab pack: Nothing resolves: CoreDNS scaled to zero (s82-coredns-down)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Nothing resolves: CoreDNS scaled to zero"
kubectl create namespace shop --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: shop

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: server
  namespace: shop
spec:
  replicas: 1
  selector:
    matchLabels:
      app: server
  template:
    metadata:
      labels:
        app: server
    spec:
      containers:
      - name: app
        image: nginx:1.25


KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Service
metadata:
  name: server
  namespace: shop
spec:
  selector:
    app: server
  ports:
  - port: 80

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: client
  namespace: shop
  labels:
    run: client
spec:
  containers:
  - name: client
    image: busybox:1.36
    command: ["sleep", "3600"]

KUBELAB_EOF
kubectl scale deploy coredns -n kube-system --replicas=0

kubectl config set-context --current --namespace=shop >/dev/null
echo "✔ Ready. Namespace: shop. Read README.md, fix the cluster, then run ./check.sh"
