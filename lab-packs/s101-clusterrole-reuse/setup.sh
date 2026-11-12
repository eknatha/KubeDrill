#!/usr/bin/env bash
# KubeDrill lab pack: RBAC: one ClusterRole, bound per namespace (s101-clusterrole-reuse)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: RBAC: one ClusterRole, bound per namespace"
kubectl create namespace dev --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: dev

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: qa

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: prod

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ci
  namespace: dev

KUBEDRILL_EOF


kubectl config set-context --current --namespace=dev >/dev/null
echo "✔ Ready. Namespace: dev. Read README.md, fix the cluster, then run ./check.sh"
