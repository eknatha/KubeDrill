#!/usr/bin/env bash
# KubeLab lab pack: RBAC: least-privilege deployer (s11-rbac-sa)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace ci --ignore-not-found

