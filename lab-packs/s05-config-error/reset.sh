#!/usr/bin/env bash
# KubeDrill lab pack: CreateContainerConfigError: missing ConfigMap (s05-config-error)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace inventory --ignore-not-found

