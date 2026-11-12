#!/usr/bin/env bash
# KubeDrill lab pack: Service has no endpoints (s04-no-endpoints)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace store --ignore-not-found

