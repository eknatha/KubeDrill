#!/usr/bin/env bash
# KubeDrill lab pack: Clean up temporary namespaces by label (s68-multi-ns-cleanup)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace prod --ignore-not-found

