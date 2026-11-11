#!/usr/bin/env bash
# KubeLab lab pack: The default ServiceAccount is cluster-admin (s78-default-sa-admin)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: The default ServiceAccount is cluster-admin"
kubectl create namespace apps --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: apps

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dash
  namespace: apps
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dash
  template:
    metadata:
      labels:
        app: dash
    spec:
      containers:
      - name: app
        image: nginx:1.25


KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: default-sa-admin
subjects:
- kind: ServiceAccount
  name: default
  namespace: apps
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io

KUBELAB_EOF


kubectl config set-context --current --namespace=apps >/dev/null
echo "✔ Ready. Namespace: apps. Read README.md, fix the cluster, then run ./check.sh"
