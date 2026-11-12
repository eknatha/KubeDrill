#!/usr/bin/env bash
# KubeDrill lab pack: Expose a Service on a fixed NodePort (s58-nodeport-fixed)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace np --ignore-not-found

