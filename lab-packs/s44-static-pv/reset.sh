#!/usr/bin/env bash
# KubeDrill lab pack: Bind a PVC to a pre-created PersistentVolume (s44-static-pv)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace pvs --ignore-not-found

