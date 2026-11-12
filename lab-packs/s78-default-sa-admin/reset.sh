#!/usr/bin/env bash
# KubeDrill lab pack: The default ServiceAccount is cluster-admin (s78-default-sa-admin)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace apps --ignore-not-found

