#!/usr/bin/env bash
# KubeDrill lab pack: Multi-container pod: log sidecar (s10-sidecar)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace logs --ignore-not-found

