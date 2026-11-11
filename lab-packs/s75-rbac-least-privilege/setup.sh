#!/usr/bin/env bash
# KubeLab lab pack: Cut a wildcard Role down to least privilege (s75-rbac-least-privilege)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Cut a wildcard Role down to least privilege"
kubectl create namespace ci --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: ci

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: ServiceAccount
metadata:
  name: deployer
  namespace: ci

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployer
  namespace: ci
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: deployer
  namespace: ci
subjects:
- kind: ServiceAccount
  name: deployer
  namespace: ci
roleRef:
  kind: Role
  name: deployer
  apiGroup: rbac.authorization.k8s.io

KUBELAB_EOF


kubectl config set-context --current --namespace=ci >/dev/null
echo "✔ Ready. Namespace: ci. Read README.md, fix the cluster, then run ./check.sh"
