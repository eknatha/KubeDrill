#!/usr/bin/env bash
# KubeDrill lab pack: Onboard a tenant namespace (s26-multitenant)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Onboard a tenant namespace"
kubectl create namespace default --dry-run=client -o yaml | kubectl apply -f -



kubectl config set-context --current --namespace=team-b >/dev/null
echo "✔ Ready. Namespace: team-b. Read README.md, fix the cluster, then run ./check.sh"
