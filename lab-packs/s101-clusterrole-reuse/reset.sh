#!/usr/bin/env bash
# KubeLab lab pack: RBAC: one ClusterRole, bound per namespace (s101-clusterrole-reuse)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace dev --ignore-not-found

