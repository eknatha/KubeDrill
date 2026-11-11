#!/usr/bin/env bash
# KubeLab lab pack: NetworkPolicy: allow only a labelled namespace (s52-netpol-namespace)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: NetworkPolicy: allow only a labelled namespace"
kubectl create namespace data --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: data

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: web-ns
  labels:
    env: prod

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: other
  labels:
    env: dev

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: db
  namespace: data
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

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Service
metadata:
  name: db
  namespace: data
spec:
  selector:
    app: db
  ports:
  - port: 80
    targetPort: 80

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: tester
  namespace: web-ns
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
kind: Pod
metadata:
  name: tester
  namespace: other
  labels:
    run: tester
spec:
  containers:
  - name: tester
    image: busybox:1.36
    command: ["sleep", "3600"]

KUBELAB_EOF


kubectl config set-context --current --namespace=data >/dev/null
echo "✔ Ready. Namespace: data. Read README.md, fix the cluster, then run ./check.sh"
