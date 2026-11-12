#!/usr/bin/env bash
# KubeDrill lab pack: Extend Kubernetes: CRD + custom resource (s24-crd)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Extend Kubernetes: CRD + custom resource"
kubectl create namespace ops --dry-run=client -o yaml | kubectl apply -f -



kubectl config set-context --current --namespace=ops >/dev/null
echo "✔ Ready. Namespace: ops. Read README.md, fix the cluster, then run ./check.sh"
