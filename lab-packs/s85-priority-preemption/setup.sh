#!/usr/bin/env bash
# KubeLab lab pack: Critical pods Pending: priority and preemption (s85-priority-preemption)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Critical pods Pending: priority and preemption"
kubectl create namespace batch --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: batch

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low
value: 100
globalDefault: true

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: critical
value: 100000

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: filler
  namespace: batch
spec:
  replicas: 7
  selector:
    matchLabels:
      app: filler
  template:
    metadata:
      labels:
        app: filler
    spec:
      containers:
      - name: app
        image: nginx:1.25
        resources:
          requests:
            cpu: "1"
            memory: 64Mi


KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments
  namespace: batch
spec:
  replicas: 2
  selector:
    matchLabels:
      app: payments
  template:
    metadata:
      labels:
        app: payments
    spec:
      containers:
      - name: app
        image: nginx:1.25
        resources:
          requests:
            cpu: "1"
            memory: 64Mi


KUBELAB_EOF


kubectl config set-context --current --namespace=batch >/dev/null
echo "✔ Ready. Namespace: batch. Read README.md, fix the cluster, then run ./check.sh"
