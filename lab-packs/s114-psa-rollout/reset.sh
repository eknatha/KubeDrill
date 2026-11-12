#!/usr/bin/env bash
# KubeDrill lab pack: Pod Security: warn and audit before you enforce (s114-psa-rollout)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace rollout-ns --ignore-not-found

