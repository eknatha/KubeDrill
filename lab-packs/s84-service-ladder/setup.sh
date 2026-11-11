#!/usr/bin/env bash
# KubeLab lab pack: Service unreachable: climb the ladder (s84-service-ladder)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Service unreachable: climb the ladder"
kubectl create namespace store --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: store

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: store
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: app
        image: nginx:1.25
        ports:
        - containerPort: 80


KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: store
spec:
  selector:
    app: webapp
  ports:
  - port: 80
    targetPort: 8080

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: store
spec:
  podSelector: {}
  policyTypes: ["Ingress"]

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
