#!/usr/bin/env bash
# KubeLab lab pack: ClusterRole: let a ServiceAccount list nodes (s49-clusterrole-nodes)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace obs --ignore-not-found

