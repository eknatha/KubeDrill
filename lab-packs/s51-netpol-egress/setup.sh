#!/usr/bin/env bash
# KubeLab lab pack: NetworkPolicy egress: allow only the API (s51-netpol-egress)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: NetworkPolicy egress: allow only the API"
kubectl create namespace eg --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: eg
spec:
  replicas: 1
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
  namespace: eg
spec:
  selector:
    app: api
  ports:
  - port: 80
    targetPort: 80

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: admin
  namespace: eg
spec:
  replicas: 1
  selector:
    matchLabels:
      app: admin
  template:
    metadata:
      labels:
        app: admin
    spec:
      containers:
      - name: admin
        image: nginx:1.25

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Service
metadata:
  name: admin
  namespace: eg
spec:
  selector:
    app: admin
  ports:
  - port: 80
    targetPort: 80

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: client
  namespace: eg
  labels:
    role: client
spec:
  containers:
  - name: client
    image: busybox:1.36
    command: ["sleep", "3600"]

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: client-deny-egress
  namespace: eg
spec:
  podSelector:
    matchLabels:
      role: client
  policyTypes: [Egress]

KUBELAB_EOF


kubectl config set-context --current --namespace=eg >/dev/null
echo "✔ Ready. Namespace: eg. Read README.md, fix the cluster, then run ./check.sh"
