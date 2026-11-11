#!/usr/bin/env bash
# KubeLab lab pack: Harden ServiceAccount token mounting (s22-sa-token)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace hardening --ignore-not-found

