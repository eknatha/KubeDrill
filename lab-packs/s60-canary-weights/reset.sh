#!/usr/bin/env bash
# KubeDrill lab pack: Canary release: 20% of traffic via replica ratio (s60-canary-weights)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace can --ignore-not-found

