#!/usr/bin/env bash
# KubeDrill lab pack: HPA shows <unknown>: no CPU requests (s100-hpa-unknown)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace scale --ignore-not-found

