#!/usr/bin/env bash
# KubeLab lab pack: ExternalName Service for an outside database (s59-externalname)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace ext --ignore-not-found

