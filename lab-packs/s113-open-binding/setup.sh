#!/usr/bin/env bash
# KubeLab lab pack: Hardening: an over-broad binding and the default ServiceAccount (s113-open-binding)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Hardening: an over-broad binding and the default ServiceAccount"
kubectl create namespace team --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: team

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: everyone-admin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: Group
  name: system:authenticated

KUBELAB_EOF


kubectl config set-context --current --namespace=team >/dev/null
echo "✔ Ready. Namespace: team. Read README.md, fix the cluster, then run ./check.sh"
