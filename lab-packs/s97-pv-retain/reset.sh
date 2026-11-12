#!/usr/bin/env bash
# KubeDrill lab pack: Storage: keep the data, allow expansion (s97-pv-retain)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace store --ignore-not-found

