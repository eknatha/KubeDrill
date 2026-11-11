#!/usr/bin/env bash
# KubeLab lab pack: custom-columns and --sort-by (s65-custom-columns)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace cc --ignore-not-found

