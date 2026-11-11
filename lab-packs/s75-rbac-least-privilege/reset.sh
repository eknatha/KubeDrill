#!/usr/bin/env bash
# KubeLab lab pack: Cut a wildcard Role down to least privilege (s75-rbac-least-privilege)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace ci --ignore-not-found

