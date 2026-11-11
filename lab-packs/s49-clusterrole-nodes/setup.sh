#!/usr/bin/env bash
# KubeLab lab pack: ClusterRole: let a ServiceAccount list nodes (s49-clusterrole-nodes)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: ClusterRole: let a ServiceAccount list nodes"
kubectl create namespace obs --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: ServiceAccount
metadata:
  name: monitor
  namespace: obs

KUBELAB_EOF


kubectl config set-context --current --namespace=obs >/dev/null
echo "✔ Ready. Namespace: obs. Read README.md, fix the cluster, then run ./check.sh"
