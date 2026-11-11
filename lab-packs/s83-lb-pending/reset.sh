#!/usr/bin/env bash
# KubeLab lab pack: LoadBalancer stuck on <pending> (s83-lb-pending)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace shop --ignore-not-found

