#!/usr/bin/env bash
# KubeLab lab pack: Gateway API: Gateway + HTTPRoute (s23-gateway-api)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace gw --ignore-not-found

