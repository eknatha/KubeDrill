#!/usr/bin/env bash
# KubeDrill lab pack: Inject config: envFrom and a read-only Secret volume (s106-config-injection)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace cfg --ignore-not-found

