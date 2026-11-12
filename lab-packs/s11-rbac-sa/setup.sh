#!/usr/bin/env bash
# KubeDrill lab pack: RBAC: least-privilege deployer (s11-rbac-sa)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: RBAC: least-privilege deployer"
kubectl create namespace ci --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: ServiceAccount
metadata:
  name: deployer
  namespace: ci

KUBEDRILL_EOF


kubectl config set-context --current --namespace=ci >/dev/null
echo "✔ Ready. Namespace: ci. Read README.md, fix the cluster, then run ./check.sh"
