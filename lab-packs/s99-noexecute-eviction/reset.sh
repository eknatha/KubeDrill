#!/usr/bin/env bash
# KubeDrill lab pack: NoExecute taint: evict, but spare the critical pod (s99-noexecute-eviction)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace edge --ignore-not-found

