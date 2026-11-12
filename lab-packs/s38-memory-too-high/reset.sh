#!/usr/bin/env bash
# KubeDrill lab pack: Insufficient memory (s38-memory-too-high)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace mem --ignore-not-found

