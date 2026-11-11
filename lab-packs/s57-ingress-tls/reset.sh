#!/usr/bin/env bash
# KubeLab lab pack: Ingress with TLS termination (s57-ingress-tls)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace sec --ignore-not-found

