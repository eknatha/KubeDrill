#!/usr/bin/env bash
# KubeDrill lab pack: Gateway API: the route attaches to nothing (s102-httproute-fix)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace gw2 --ignore-not-found

